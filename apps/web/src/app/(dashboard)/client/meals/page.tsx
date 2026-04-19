import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface MealPlanDay {
  id: string
  day_of_week: number
  meal_name: string
  description: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  sort_order: number
}

interface MealPlan {
  id: string
  title: string
  description: string | null
  week_start: string | null
  active: boolean
  meal_plan_days: MealPlanDay[]
}

export default async function ClientMealsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'client' && profile.role !== 'admin')) {
    redirect('/trainer')
  }

  const { data: plans } = await supabase
    .from('meal_plans')
    .select(`
      id, title, description, week_start, active,
      meal_plan_days (
        id, day_of_week, meal_name, description, calories, protein_g, carbs_g, fat_g, sort_order
      )
    `)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  const typedPlans = (plans ?? []) as unknown as MealPlan[]

  return (
    <div className="space-y-6">
      <h1 className="text-display">Meal Plans</h1>

      {typedPlans.length === 0 ? (
        <div className="card text-center py-16 text-foreground/50">
          <p className="text-2xl mb-3">🥗</p>
          <p className="text-heading mb-1">No meal plans yet</p>
          <p className="text-body">Your trainer will post your meal plan here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {typedPlans.map((plan) => (
            <MealPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  )
}

function MealPlanCard({ plan }: { plan: MealPlan }) {
  const days = plan.meal_plan_days ?? []

  // Group meals by day of week
  const byDay = new Map<number, MealPlanDay[]>()
  for (const d of days) {
    const bucket = byDay.get(d.day_of_week) ?? []
    bucket.push(d)
    byDay.set(d.day_of_week, bucket)
  }
  // Sort each bucket by sort_order, then meal_name
  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => a.sort_order - b.sort_order || a.meal_name.localeCompare(b.meal_name))
  }
  const orderedDays = Array.from(byDay.entries()).sort(([a], [b]) => a - b)

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-heading font-semibold">{plan.title}</h2>
        {plan.week_start && (
          <p className="text-caption text-foreground/50">Week of {plan.week_start}</p>
        )}
        {plan.description && (
          <p className="text-body text-foreground/70 mt-1">{plan.description}</p>
        )}
      </div>

      {orderedDays.length > 0 && (
        <div className="divide-y divide-border">
          {orderedDays.map(([dow, meals]) => (
            <div key={dow} className="py-3 space-y-3">
              <p className="text-label font-medium text-accent">{DAY_LABELS[dow] ?? `Day ${dow}`}</p>
              <div className="space-y-2">
                {meals.map((m) => (
                  <div key={m.id} className="space-y-1">
                    <p className="text-body font-medium text-foreground">{m.meal_name}</p>
                    {m.description && (
                      <p className="text-body text-foreground/70 whitespace-pre-line">{m.description}</p>
                    )}
                    {(m.calories || m.protein_g || m.carbs_g || m.fat_g) && (
                      <div className="flex gap-2 flex-wrap">
                        {m.calories != null && (
                          <span className="badge bg-surface-alt">{m.calories} kcal</span>
                        )}
                        {m.protein_g != null && (
                          <span className="badge bg-accent/10 text-accent">P {m.protein_g}g</span>
                        )}
                        {m.carbs_g != null && (
                          <span className="badge bg-surface-alt">C {m.carbs_g}g</span>
                        )}
                        {m.fat_g != null && (
                          <span className="badge bg-surface-alt">F {m.fat_g}g</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
