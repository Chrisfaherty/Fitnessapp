import { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutTemplate, Plus, ChevronRight, Dumbbell } from "lucide-react";

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
          <p className="text-label mb-1.5">Library</p>
          <h1 className="text-heading">Workout Templates</h1>
          <p className="text-caption mt-1">Build and manage workout programs</p>
        </div>
        <Link href="/trainer/templates/new" className="btn-primary flex items-center gap-2 rounded-full px-5">
          <Plus className="w-4 h-4" />
          New Template
        </Link>
      </div>

      {(!templates || templates.length === 0) ? (
        <div className="empty-state">
          <div className="stat-card-icon mx-auto">
            <LayoutTemplate className="w-5 h-5 text-foreground-secondary" />
          </div>
          <p className="text-subheading">No templates yet</p>
          <p className="text-caption max-w-xs text-sm">
            Create your first workout template to assign to clients.
          </p>
          <Link href="/trainer/templates/new" className="btn-primary mt-2 rounded-full px-5">
            Create Template
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/trainer/templates/${t.id}`}
              className="card hover:border-white/20 transition-all duration-fast group flex items-center gap-4"
            >
              <div className="stat-card-icon flex-shrink-0">
                <Dumbbell className="w-4 h-4 text-foreground-secondary group-hover:text-accent transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                  {t.title}
                </h3>
                {t.description && (
                  <p className="text-caption mt-0.5 line-clamp-1 text-xs">{t.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="badge-neutral font-mono">
                  {(t.workout_template_exercises as any)?.[0]?.count ?? 0} ex
                </span>
                <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
