import { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TrainerCheckInsClient } from "@/components/trainer/trainer-check-ins-client";
import type { Database } from "@/types/database";

export const metadata: Metadata = { title: "Check-Ins" };

type CheckInRow = Database["public"]["Tables"]["check_ins"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface CheckInWithClient extends CheckInRow {
  client: Pick<ProfileRow, "id" | "full_name" | "avatar_url">;
}

export default async function TrainerCheckInsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "trainer" && profile.role !== "admin")) {
    redirect("/client");
  }

  const { data: rawCheckIns } = await supabase
    .from("check_ins")
    .select(
      `
      id,
      client_id,
      trainer_id,
      week_start_date,
      status,
      body_weight_kg,
      energy_level,
      stress_level,
      sleep_quality,
      client_notes,
      trainer_notes,
      trainer_video_url,
      reviewed_at,
      created_at,
      updated_at,
      profiles!check_ins_client_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq("trainer_id", user.id)
    .in("status", ["submitted", "reviewed"])
    .order("created_at", { ascending: false });

  const checkIns = (
    (rawCheckIns ?? []) as unknown as Array<
      CheckInRow & {
        profiles: Pick<ProfileRow, "id" | "full_name" | "avatar_url"> | null;
      }
    >
  ).map(({ profiles, ...rest }): CheckInWithClient => ({
    ...rest,
    client: profiles ?? { id: rest.client_id, full_name: "Unknown Client", avatar_url: null },
  }));

  return <TrainerCheckInsClient checkIns={checkIns} />;
}
