import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClientWorkoutsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assignments } = await supabase
    .from('workout_assignments')
    .select(`
      id, status, assigned_at,
      workout_templates (
        id, title, description,
        workout_template_exercises (
          id, sort_order, target_sets, rep_min, rep_max, rest_seconds,
          exercises ( name, primary_muscles, equipment )
        )
      )
    `)
    .eq('client_id', user.id)
    .order('assigned_at', { ascending: false })
    .limit(20)

  const active = assignments?.filter((a: any) => a.status === 'assigned') ?? []
  const completed = assignments?.filter((a: any) => a.status === 'completed') ?? []

  return (
    <div className="space-y-8">
      <h1 className="text-display">My Workouts</h1>

      {/* Active assignments */}
      <section>
        <h2 className="text-heading mb-4">
          Assigned <span className="text-accent ml-1">({active.length})</span>
        </h2>
        {active.length === 0 ? (
          <div className="card text-center py-12 text-foreground/50">
            <p className="text-heading mb-1">All done! 🎉</p>
            <p className="text-body">No pending workouts. Your trainer will assign the next one soon.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((a: any) => {
              const tmpl = a.workout_templates
              const exercises: any[] = tmpl?.workout_template_exercises ?? []
              const muscles = [...new Set(exercises.flatMap((e: any) => e.exercises?.primary_muscles ?? []))]
              return (
                <div key={a.id} className="card space-y-3">
                  <div>
                    <h3 className="text-label font-semibold">{tmpl?.title ?? 'Workout'}</h3>
                    {tmpl?.description && (
                      <p className="text-caption text-foreground/60 mt-0.5">{tmpl.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="badge bg-surface-alt">{exercises.length} exercises</span>
                    {muscles.slice(0, 3).map((m: string) => (
                      <span key={m} className="badge bg-accent/10 text-accent capitalize">{m}</span>
                    ))}
                  </div>
                  <div className="text-caption text-foreground/40">
                    Assigned {new Date(a.assigned_at).toLocaleDateString()}
                  </div>
                  <p className="text-caption text-foreground/50 italic">
                    Log your session on the iOS/Android app →
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-heading mb-4">Completed</h2>
          <div className="space-y-2">
            {completed.map((a: any) => (
              <div key={a.id} className="card flex items-center justify-between opacity-60">
                <p className="text-label">{a.workout_templates?.title ?? 'Workout'}</p>
                <span className="badge bg-accent/20 text-accent">✓ Done</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
