import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { WorkoutAssignmentClient } from "@/components/trainer/workout-assignment-client";
import type { Database } from "@/types/database";

export const metadata: Metadata = { title: "Assign Workout" };

type WorkoutTemplate = Database["public"]["Tables"]["workout_templates"]["Row"];
type LinkedClient = {
  client_id: string;
  profiles: { id: string; full_name: string; avatar_url: string | null } | null;
};

interface Props {
  searchParams: { clientId?: string };
}

export default async function AssignWorkoutPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Verify trainer role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "trainer" && profile.role !== "admin")) {
    redirect("/client");
  }

  // Fetch trainer's workout templates
  const { data: rawTemplates } = await supabase
    .from("workout_templates")
    .select("id, trainer_id, title, description, created_at, updated_at")
    .eq("trainer_id", user.id)
    .order("title", { ascending: true });

  const templates: WorkoutTemplate[] = rawTemplates ?? [];

  // Fetch trainer's linked clients with profiles
  const { data: rawClientLinks } = await supabase
    .from("trainer_clients")
    .select(
      "client_id, profiles!trainer_clients_client_id_fkey(id, full_name, avatar_url)"
    )
    .eq("trainer_id", user.id)
    .eq("active", true);

  const clientLinks = (rawClientLinks ?? []) as unknown as LinkedClient[];

  // Fetch exercise counts per template so the UI can show a hint
  const templateIds = templates.map((t) => t.id);
  let exerciseCounts: Record<string, number> = {};

  if (templateIds.length > 0) {
    const { data: rawCounts } = await supabase
      .from("workout_template_exercises")
      .select("template_id")
      .in("template_id", templateIds);

    if (rawCounts) {
      exerciseCounts = rawCounts.reduce<Record<string, number>>((acc, row) => {
        acc[row.template_id] = (acc[row.template_id] ?? 0) + 1;
        return acc;
      }, {});
    }
  }

  return (
    <WorkoutAssignmentClient
      trainerId={user.id}
      templates={templates}
      clientLinks={clientLinks}
      exerciseCounts={exerciseCounts}
      preselectedClientId={searchParams.clientId ?? null}
    />
  );
}
