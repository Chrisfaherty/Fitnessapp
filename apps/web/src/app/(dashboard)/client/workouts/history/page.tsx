import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Workout History' }

export default async function WorkoutHistoryPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select(`
      id, performed_at, duration_seconds, notes,
      workout_templates ( title ),
      workout_assignments ( scheduled_date ),
      workout_session_sets (
        exercise_id, set_number, reps, weight_kg, rpe,
        exercises ( name, primary_muscles )
      )
    `)
    .eq('client_id', user.id)
    .not('performed_at', 'is', null)
    .order('performed_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">Workout History</h1>
          <p className="text-body text-foreground-secondary mt-1">{sessions?.length ?? 0} completed sessions</p>
        </div>
        <Link
          href="/client/workouts"
          className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
        >
          ← Back to Workouts
        </Link>
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Dumbbell className="w-12 h-12 text-foreground-secondary opacity-30 mb-4" />
          <p className="text-heading text-foreground-secondary">No completed workouts yet</p>
          <p className="text-body text-foreground-secondary mt-1">Complete your first session to see it here.</p>
          <Link
            href="/client/workouts"
            className="mt-6 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 transition-colors"
          >
            View Assigned Workouts
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: any) => {
            const sets = s.workout_session_sets ?? [];
            const totalVolume = sets.reduce(
              (sum: number, set: any) => sum + (set.reps ?? 0) * (set.weight_kg ?? 0),
              0
            );
            const totalSets = sets.length;

            // Group sets by exercise
            const byExercise = sets.reduce((acc: Record<string, any[]>, set: any) => {
              const name = set.exercises?.name ?? set.exercise_id;
              if (!acc[name]) acc[name] = [];
              acc[name].push(set);
              return acc;
            }, {});

            return (
              <details key={s.id} className="bg-surface border border-border rounded-xl group">
                <summary className="flex items-center gap-4 p-4 cursor-pointer list-none hover:bg-surface-elevated/50 transition-colors rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{(s.workout_templates as any)?.title ?? 'Workout'}</p>
                    <p className="text-sm text-foreground-secondary mt-0.5">
                      {new Date(s.performed_at).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                      })}
                      {s.duration_seconds ? ` · ${Math.round(s.duration_seconds / 60)} min` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-foreground-secondary flex-shrink-0">
                    <span>{totalSets} sets</span>
                    {totalVolume > 0 && <span className="hidden sm:inline">{Math.round(totalVolume).toLocaleString()} kg</span>}
                    <span className="text-foreground-secondary text-xs group-open:rotate-180 transition-transform duration-fast">▼</span>
                  </div>
                </summary>

                <div className="px-4 pb-4">
                  <div className="border-t border-border pt-3 space-y-4">
                    {Object.entries(byExercise).map(([exerciseName, exerciseSets]) => (
                      <div key={exerciseName}>
                        <p className="text-label font-medium text-foreground mb-2">{exerciseName}</p>
                        <div className="space-y-1">
                          {(exerciseSets as any[]).map((set: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 text-sm pl-2">
                              <span className="text-foreground-secondary w-12">Set {set.set_number}</span>
                              <span className="text-foreground">{set.weight_kg}kg × {set.reps} reps</span>
                              {set.rpe && <span className="text-foreground-secondary">RPE {set.rpe}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {s.notes && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-caption text-foreground-secondary">Notes: {s.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  )
}
