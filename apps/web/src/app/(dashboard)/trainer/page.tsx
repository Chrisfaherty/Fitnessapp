import { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TrainerDashboard } from "@/components/trainer/trainer-dashboard";

export const metadata: Metadata = { title: "Trainer Dashboard" };

export default async function TrainerPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "trainer" && profile.role !== "admin")) {
    redirect("/client");
  }

  // Get linked clients with latest health data
  const { data: clientLinks } = await supabase
    .from("trainer_clients")
    .select("client_id, profiles!trainer_clients_client_id_fkey(id, full_name, avatar_url)")
    .eq("trainer_id", user.id)
    .eq("active", true);

  const clientIds = clientLinks?.map((l) => l.client_id) ?? [];

  // Pending check-ins
  const { data: pendingCheckIns } = await supabase
    .from("check_ins")
    .select("id, client_id, week_start_date, status, profiles!check_ins_client_id_fkey(full_name)")
    .in("client_id", clientIds.length > 0 ? clientIds : ["none"])
    .eq("status", "submitted")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <TrainerDashboard
      profile={profile}
      clientLinks={clientLinks ?? []}
      pendingCheckIns={pendingCheckIns ?? []}
    />
  );
}
