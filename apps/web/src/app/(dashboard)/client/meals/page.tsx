import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClientMealsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: plans } = await supabase
    .from('meal_plans')
    .select(`
      id, title, notes, start_date, end_date,
      meal_plan_days (
        id, day_label, meals, total_calories, protein_g, carbs_g, fat_g
      )
    `)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-display">Meal Plans</h1>

      {!plans || plans.length === 0 ? (
        <div className="card text-center py-16 text-foreground/50">
          <p className="text-2xl mb-3">🥗</p>
          <p className="text-heading mb-1">No meal plans yet</p>
          <p className="text-body">Your trainer will post your meal plan here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {plans.map((plan: any) => (
            <MealPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  )
}

function MealPlanCard({ plan }: { plan: any }) {
  const days: any[] = plan.meal_plan_days ?? []
  const dateRange = [plan.start_date, plan.end_date].filter(Boolean).join(' → ')

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-heading font-semibold">{plan.title}</h2>
        {dateRange && <p className="text-caption text-foreground/50">{dateRange}</p>}
        {plan.notes && <p className="text-body text-foreground/70 mt-1">{plan.notes}</p>}
      </div>

      {days.length > 0 && (
        <div className="divide-y divide-border">
          {days
            .sort((a: any, b: any) => a.day_label.localeCompare(b.day_label))
            .map((day: any) => (
              <div key={day.id} className="py-3 space-y-2">
                <p className="text-label font-medium text-accent">{day.day_label}</p>
                {day.meals && <p className="text-body whitespace-pre-line">{day.meals}</p>}
                {(day.total_calories || day.protein_g || day.carbs_g || day.fat_g) && (
                  <div className="flex gap-3 flex-wrap">
                    {day.total_calories && (
                      <span className="badge bg-surface-alt">{day.total_calories} kcal</span>
                    )}
                    {day.protein_g && (
                      <span className="badge bg-accent/10 text-accent">P {day.protein_g}g</span>
                    )}
                    {day.carbs_g && (
                      <span className="badge bg-surface-alt">C {day.carbs_g}g</span>
                    )}
                    {day.fat_g && (
                      <span className="badge bg-surface-alt">F {day.fat_g}g</span>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
