import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { WorkoutDetailClient } from "@/components/client/workout-detail-client";

export const metadata: Metadata = { title: "Workout Detail" };

interface PageProps {
  params: Promise<{ assignmentId: string }>;
}

export default async function WorkoutDetailPage({ params }: PageProps) {
  const { assignmentId } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch the assignment — security: must belong to this client
  const { data: assignment } = await supabase
    .from("workout_assignments")
    .select("id, status, scheduled_date, template_id")
    .eq("id", assignmentId)
    .eq("client_id", user.id)
    .single();

  if (!assignment) redirect("/client/workouts");

  // Fetch the template with its exercises, joined to exercise details
  const { data: template } = await supabase
    .from("workout_templates")
    .select(
      `
      id,
      title,
      description,
      workout_template_exercises (
        id,
        sort_order,
        target_sets,
        rep_min,
        rep_max,
        rest_seconds,
        notes,
        exercises (
          id,
          name,
          category,
          level,
          primary_muscles,
          equipment
        )
      )
    `
    )
    .eq("id", assignment.template_id)
    .single();

  if (!template) redirect("/client/workouts");

  type ExerciseShape = {
    id: string;
    name: string;
    category: string;
    level: string;
    primary_muscles: string[];
    equipment: string | null;
  };

  type RawTemplateExercise = {
    id: string;
    sort_order: number;
    target_sets: number;
    rep_min: number;
    rep_max: number;
    rest_seconds: number;
    notes: string | null;
    exercises: ExerciseShape | null;
  };

  // Supabase infers joined relations as arrays in its types; cast through unknown
  // since a to-one join always returns a single object at runtime.
  const rawExercises = (
    template.workout_template_exercises as unknown as RawTemplateExercise[]
  )
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const exercises = rawExercises.map((te) => ({
    id: te.id,
    sort_order: te.sort_order,
    target_sets: te.target_sets,
    rep_min: te.rep_min,
    rep_max: te.rep_max,
    rest_seconds: te.rest_seconds,
    notes: te.notes,
    exercise: {
      id: te.exercises?.id ?? "",
      name: te.exercises?.name ?? "",
      category: te.exercises?.category ?? "",
      level: te.exercises?.level ?? "",
      primary_muscles: te.exercises?.primary_muscles ?? [],
      equipment: te.exercises?.equipment ?? null,
    },
  }));

  return (
    <WorkoutDetailClient
      assignmentId={assignmentId}
      assignmentStatus={assignment.status}
      scheduledDate={assignment.scheduled_date}
      clientId={user.id}
      template={{
        id: template.id,
        title: template.title,
        description: template.description ?? null,
      }}
      exercises={exercises}
    />
  );
}
