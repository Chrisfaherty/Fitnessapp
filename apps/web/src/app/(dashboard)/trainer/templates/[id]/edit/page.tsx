import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TemplateBuilder } from "@/components/trainer/template-builder";

export const metadata: Metadata = { title: "Edit Template" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Security: only the owning trainer may edit this template
  const { data: template } = await supabase
    .from("workout_templates")
    .select("id, title, description")
    .eq("id", id)
    .eq("trainer_id", user.id)
    .single();

  if (!template) redirect("/trainer/templates");

  // Fetch exercises for this template, joined with exercise details
  const { data: templateExercises } = await supabase
    .from("workout_template_exercises")
    .select(
      `
      exercise_id,
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
    `
    )
    .eq("template_id", id)
    .order("sort_order");

  type ExerciseShape = {
    id: string;
    name: string;
    category: string;
    level: string;
    primary_muscles: string[];
    equipment: string | null;
  };

  const initialExercises = (templateExercises ?? []).map((te) => {
    // Supabase returns joined rows as an array in its inferred types,
    // but with a !inner / single select it is always a single object at runtime.
    const ex = (te.exercises as unknown) as ExerciseShape | null;

    return {
      exercise_id: te.exercise_id,
      name: ex?.name ?? "",
      category: ex?.category ?? "",
      level: ex?.level ?? "",
      primary_muscles: ex?.primary_muscles ?? [],
      equipment: ex?.equipment ?? "",
      target_sets: te.target_sets,
      rep_min: te.rep_min,
      rep_max: te.rep_max,
      rest_seconds: te.rest_seconds,
      notes: te.notes,
      sort_order: te.sort_order,
    };
  });

  return (
    <TemplateBuilder
      templateId={template.id}
      initialTemplate={{
        id: template.id,
        title: template.title,
        description: template.description ?? "",
      }}
      initialExercises={initialExercises}
    />
  );
}
