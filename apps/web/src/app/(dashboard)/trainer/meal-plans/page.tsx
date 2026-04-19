import { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UtensilsCrossed, Plus, ChevronRight, CalendarDays } from "lucide-react";

export const metadata: Metadata = { title: "Meal Plans" };

interface MealPlanWithClient {
  id: string;
  title: string;
  description: string | null;
  week_start: string | null;
  active: boolean;
  created_at: string;
  client_id: string;
  profiles: { full_name: string } | null;
}

export default async function MealPlansPage() {
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

  const { data: rawPlans } = await supabase
    .from("meal_plans")
    .select(
      "id, title, description, week_start, active, created_at, client_id, profiles!meal_plans_client_id_fkey(full_name)"
    )
    .eq("trainer_id", user.id)
    .order("created_at", { ascending: false });

  const plans = (rawPlans ?? []) as unknown as MealPlanWithClient[];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-label mb-1.5">Nutrition</p>
          <h1 className="text-heading">Meal Plans</h1>
          <p className="text-caption mt-1">Build and assign weekly meal plans to clients</p>
        </div>
        <Link
          href="/trainer/meal-plans/new"
          className="btn-primary flex items-center gap-2 rounded-full px-5"
        >
          <Plus className="w-4 h-4" />
          New Plan
        </Link>
      </div>

      {/* Empty state */}
      {plans.length === 0 ? (
        <div className="empty-state">
          <div className="stat-card-icon mx-auto">
            <UtensilsCrossed className="w-5 h-5 text-foreground-secondary" />
          </div>
          <p className="text-subheading">No meal plans yet</p>
          <p className="text-caption max-w-xs text-sm">
            Create your first meal plan to assign structured nutrition to a client.
          </p>
          <Link
            href="/trainer/meal-plans/new"
            className="btn-primary mt-2 rounded-full px-5"
          >
            Create Plan
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="card hover:border-white/20 transition-all duration-fast group flex items-center gap-4"
            >
              {/* Icon */}
              <div className="stat-card-icon flex-shrink-0">
                <UtensilsCrossed className="w-4 h-4 text-foreground-secondary group-hover:text-accent transition-colors" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                    {plan.title}
                  </h3>
                  {plan.active ? (
                    <span className="badge-accent">Active</span>
                  ) : (
                    <span className="badge-neutral">Inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {plan.profiles?.full_name && (
                    <p className="text-caption text-xs truncate">
                      {plan.profiles.full_name}
                    </p>
                  )}
                  {plan.week_start && (
                    <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                      <CalendarDays className="w-3 h-3" />
                      Week of{" "}
                      {new Date(plan.week_start).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-caption mt-0.5 line-clamp-1 text-xs">
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Chevron */}
              <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
