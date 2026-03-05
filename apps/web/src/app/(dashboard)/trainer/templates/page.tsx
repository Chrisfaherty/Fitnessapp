import { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = { title: "Workout Templates" };

export default async function TemplatesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: templates } = await supabase
    .from("workout_templates")
    .select("*, workout_template_exercises(count)")
    .eq("trainer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading">Workout Templates</h1>
          <p className="text-caption mt-1">Build and manage workout programs</p>
        </div>
        <Link href="/trainer/templates/new" className="btn-primary">
          + New Template
        </Link>
      </div>

      {(!templates || templates.length === 0) ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">💪</p>
          <h3 className="text-subheading mb-2">No templates yet</h3>
          <p className="text-caption mb-6">Create your first workout template to assign to clients.</p>
          <Link href="/trainer/templates/new" className="btn-primary">
            Create Template
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/trainer/templates/${t.id}`}
              className="card hover:border-accent/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                    {t.title}
                  </h3>
                  {t.description && (
                    <p className="text-caption mt-1 line-clamp-2">{t.description}</p>
                  )}
                </div>
                <span className="badge-neutral ml-4 shrink-0">
                  {(t.workout_template_exercises as any)?.[0]?.count ?? 0} exercises
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
