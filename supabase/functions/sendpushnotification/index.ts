import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

// ─── APNS JWT helper ───────────────────────────────────────────
async function makeApnsJwt(keyId: string, teamId: string, privateKeyPem: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "ES256", kid: keyId }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({ iss: teamId, iat: now }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const data = new TextEncoder().encode(`${header}.${payload}`);
  // Import EC private key
  const pemBody = privateKeyPem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", keyData.buffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, data);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${payload}.${sigB64}`;
}

// ─── FCM OAuth2 helper ─────────────────────────────────────────
async function getFcmToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claimSet = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsigned = `${header}.${claimSet}`;
  const pemBody = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token;
}

// ─── Main handler ──────────────────────────────────────────────
serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const body = await req.json();
  const { table, record, old_record, type: eventType } = body;

  // ── Determine notification content & recipient ──
  let title = "";
  let notifBody = "";
  let recipientId = "";
  let deepLink = "";

  if (table === "messages" && eventType === "INSERT") {
    // Find the other party in the conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("trainer_id, client_id")
      .eq("id", record.conversation_id)
      .single();
    if (!conv) return new Response(JSON.stringify({ sent: 0, failed: 0 }));

    const senderId = record.sender_id;
    recipientId = senderId === conv.trainer_id ? conv.client_id : conv.trainer_id;

    const { data: sender } = await supabase
      .from("profiles").select("full_name").eq("id", senderId).single();

    title = "💬 New message";
    notifBody = `${sender?.full_name ?? "Someone"}: ${String(record.body ?? "").slice(0, 60)}`;
    deepLink = "fitcoach://messaging";
  } else if (table === "check_ins" && eventType === "UPDATE" && record.status === "reviewed" && old_record?.status !== "reviewed") {
    recipientId = record.client_id;
    const { data: trainer } = await supabase
      .from("profiles").select("full_name").eq("id", record.reviewed_by).single();
    title = "✅ Check-in reviewed";
    notifBody = `${trainer?.full_name ?? "Your trainer"} reviewed your weekly check-in`;
    deepLink = "fitcoach://check-ins";
  } else if (table === "workout_assignments" && eventType === "INSERT") {
    recipientId = record.client_id;
    const { data: tmpl } = await supabase
      .from("workout_templates").select("title").eq("id", record.template_id).single();
    title = "🏋️ New workout";
    notifBody = `${tmpl?.title ?? "Workout"} scheduled for ${record.scheduled_date}`;
    deepLink = "fitcoach://workouts";
  } else {
    return new Response(JSON.stringify({ sent: 0, failed: 0 }));
  }

  // ── Look up device tokens ──
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("id, token, platform")
    .eq("user_id", recipientId);

  if (!tokens || tokens.length === 0) return new Response(JSON.stringify({ sent: 0, failed: 0 }));

  let sent = 0;
  let failed = 0;
  const invalidIds: string[] = [];

  for (const pt of tokens) {
    try {
      if (pt.platform === "ios") {
        const apnsKeyId = Deno.env.get("APNS_KEY_ID");
        const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
        const apnsKey = Deno.env.get("APNS_PRIVATE_KEY");
        const bundleId = Deno.env.get("APNS_BUNDLE_ID") ?? "com.fitcoach.app";
        if (!apnsKeyId || !apnsTeamId || !apnsKey) { failed++; continue; }

        const jwt = await makeApnsJwt(apnsKeyId, apnsTeamId, apnsKey);
        const res = await fetch(`https://api.push.apple.com/3/device/${pt.token}`, {
          method: "POST",
          headers: {
            "authorization": `bearer ${jwt}`,
            "apns-topic": bundleId,
            "apns-push-type": "alert",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            aps: { alert: { title, body: notifBody }, sound: "default", badge: 1 },
            deepLink,
          }),
        });
        if (res.ok) { sent++; }
        else {
          const err = await res.json().catch(() => ({}));
          if (err.reason === "BadDeviceToken" || err.reason === "Unregistered") invalidIds.push(pt.id);
          failed++;
        }
      } else if (pt.platform === "android") {
        const fcmProject = Deno.env.get("FCM_PROJECT_ID");
        const fcmSa = Deno.env.get("FCM_SERVICE_ACCOUNT_KEY");
        if (!fcmProject || !fcmSa) { failed++; continue; }

        const accessToken = await getFcmToken(fcmSa);
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${fcmProject}/messages:send`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                token: pt.token,
                notification: { title, body: notifBody },
                data: { deepLink },
                android: { priority: "high" },
              },
            }),
          }
        );
        if (res.ok) { sent++; }
        else {
          const err = await res.json().catch(() => ({}));
          if (err.error?.status === "INVALID_ARGUMENT") invalidIds.push(pt.id);
          failed++;
        }
      }
    } catch {
      failed++;
    }
  }

  // Clean up invalid tokens
  if (invalidIds.length > 0) {
    await supabase.from("push_tokens").delete().in("id", invalidIds);
  }

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
