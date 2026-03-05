/**
 * weeklySummary Edge Function
 * Generates weekly aggregated summaries for all active clients.
 * Called via cron (schedule in supabase/functions/weeklySummary/config.json)
 * or POST trigger.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine target week_start (default: last Monday)
    let weekStart: string;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      weekStart = body.week_start || getLastMonday();
    } else {
      weekStart = getLastMonday();
    }

    const weekEnd = addDays(weekStart, 7);

    // Get all active clients
    const { data: clients, error: clientsErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "client");

    if (clientsErr) throw clientsErr;

    const results = await Promise.allSettled(
      (clients ?? []).map((client) =>
        generateSummaryForClient(supabaseAdmin, client.id, weekStart, weekEnd)
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ success: true, week_start: weekStart, succeeded, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("weeklySummary error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function generateSummaryForClient(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  weekStart: string,
  weekEnd: string
) {
  // Aggregate daily metrics for the week
  const { data: metrics, error: metricsErr } = await supabase
    .from("health_daily")
    .select("steps, active_energy_kcal, weight_kg, nutrition_kcal, protein_g")
    .eq("user_id", clientId)
    .gte("date", weekStart)
    .lt("date", weekEnd);

  if (metricsErr) throw metricsErr;

  const days = metrics ?? [];

  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter((v): v is number => v != null);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };

  const avgSteps    = avg(days.map((d) => d.steps));
  const avgCalories = avg(days.map((d) => d.nutrition_kcal));
  const avgProtein  = avg(days.map((d) => d.protein_g));
  const avgWeight   = avg(days.map((d) => d.weight_kg));

  // Count workouts (in-app + health hub)
  const { count: workoutsCount } = await supabase
    .from("health_workouts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", clientId)
    .gte("start_at", weekStart)
    .lt("start_at", weekEnd);

  // Get check-in id if it exists
  const { data: checkIn } = await supabase
    .from("check_ins")
    .select("id")
    .eq("client_id", clientId)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  // Upsert summary
  const { error: upsertErr } = await supabase
    .from("weekly_summaries")
    .upsert({
      client_id: clientId,
      week_start_date: weekStart,
      avg_steps: avgSteps != null ? Math.round(avgSteps) : null,
      avg_calories: avgCalories,
      avg_protein_g: avgProtein,
      avg_weight_kg: avgWeight,
      workouts_count: workoutsCount ?? 0,
      check_in_id: checkIn?.id ?? null,
      generated_at: new Date().toISOString(),
    }, { onConflict: "client_id,week_start_date" });

  if (upsertErr) throw upsertErr;
}

function getLastMonday(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday = 1
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
