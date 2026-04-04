/**
 * signedMediaUrl Edge Function
 * Returns a short-lived signed URL for a private video in Supabase Storage.
 * Only participants of the conversation owning the video are authorized.
 *
 * POST /functions/v1/signedMediaUrl
 * Body: { storage_path: string }
 * Returns: { signed_url: string, expires_at: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authenticate caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Get caller identity
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const storagePath: string = body.storage_path;

    if (!storagePath || typeof storagePath !== "string") {
      return new Response(JSON.stringify({ error: "storage_path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // storage_path format: {conversation_id}/{message_id}.mp4
    const conversationId = storagePath.split("/")[0];

    if (!conversationId) {
      return new Response(JSON.stringify({ error: "Invalid storage_path format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify authorization: requester must be trainer or client in this conversation
    const { data: conversation, error: convErr } = await supabaseAdmin
      .from("conversations")
      .select("trainer_id, client_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isParticipant =
      conversation.trainer_id === user.id ||
      conversation.client_id === user.id;

    // Allow admins
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    if (!isParticipant && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed URL
    const { data: signedData, error: signErr } = await supabaseAdmin
      .storage
      .from("message-videos")
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

    if (signErr || !signedData) {
      throw signErr ?? new Error("Failed to create signed URL");
    }

    const expiresAt = new Date(
      Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000
    ).toISOString();

    return new Response(
      JSON.stringify({ signed_url: signedData.signedUrl, expires_at: expiresAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("signedMediaUrl error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
