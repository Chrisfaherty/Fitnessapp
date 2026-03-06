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
  const { data: rawClientLinks } = await supabase
    .from("trainer_clients")
    .select("client_id, profiles!trainer_clients_client_id_fkey(id, full_name, avatar_url)")
    .eq("trainer_id", user.id)
    .eq("active", true);

  // Supabase v2 types the joined profile as an array (no Relationships meta);
  // double-cast via unknown to the single-object shape the component expects.
  const clientLinks = (rawClientLinks ?? []) as unknown as Array<{
    client_id: string;
    profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  }>;

  const clientIds = clientLinks.map((l) => l.client_id);

  // Pending check-ins
  const { data: rawPendingCheckIns } = await supabase
    .from("check_ins")
    .select("id, client_id, week_start_date, status, profiles!check_ins_client_id_fkey(full_name)")
    .in("client_id", clientIds.length > 0 ? clientIds : ["none"])
    .eq("status", "submitted")
    .order("created_at", { ascending: false })
    .limit(5);

  const pendingCheckIns = (rawPendingCheckIns ?? []) as unknown as Array<{
    id: string;
    client_id: string;
    week_start_date: string;
    status: string;
    profiles: { full_name: string } | null;
  }>;

  return (
    <TrainerDashboard
      profile={profile}
      clientLinks={clientLinks}
      pendingCheckIns={pendingCheckIns}
    />
  );
}
