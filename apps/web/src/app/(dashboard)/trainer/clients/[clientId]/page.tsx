/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

interface Props {
  params: { clientId: string }
}

export default async function ClientDetailPage({ params }: Props) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify trainer is linked to this client
  const { data: link } = await supabase
    .from('trainer_clients')
    .select('active')
    .eq('trainer_id', user.id)
    .eq('client_id', params.clientId)
    .eq('active', true)
    .single()

  if (!link) notFound()

  // Fetch client profile
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', params.clientId)
    .single()
  const profile = profileRaw as any

  // Fetch last 7 days health
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const { data: healthData } = await supabase
    .from('health_daily')
    .select('date, steps, calories_out, weight_kg, protein_g')
    .eq('user_id', params.clientId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Fetch recent check-ins
  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('id, week_start, status, bodyweight_kg, notes, trainer_feedback')
    .eq('client_id', params.clientId)
    .order('week_start', { ascending: false })
    .limit(5)

  // Fetch recent workout sessions
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select(`
      id, performed_at, duration_seconds,
      workout_templates ( title )
    `)
    .eq('client_id', params.clientId)
    .order('performed_at', { ascending: false })
    .limit(5)

  const clientName = profile?.full_name ?? profile?.email ?? 'Client'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center text-2xl font-bold">
          {clientName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-display">{clientName}</h1>
          <p className="text-body text-foreground/60">{profile?.email}</p>
        </div>
      </div>

      {/* Health Stats */}
      <section>
        <h2 className="text-heading mb-4">Last 7 Days — Health</h2>
        {healthData && healthData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-foreground/60 text-left">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Steps</th>
                  <th className="pb-2 pr-4 font-medium">Calories</th>
                  <th className="pb-2 pr-4 font-medium">Weight</th>
                  <th className="pb-2 font-medium">Protein</th>
                </tr>
              </thead>
              <tbody>
                {healthData.map((row: any) => (
                  <tr key={row.date} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-foreground/70">{row.date}</td>
                    <td className="py-2 pr-4">{row.steps?.toLocaleString() ?? '—'}</td>
                    <td className="py-2 pr-4">{row.calories_out ? `${Math.round(row.calories_out)} kcal` : '—'}</td>
                    <td className="py-2 pr-4">{row.weight_kg ? `${row.weight_kg} kg` : '—'}</td>
                    <td className="py-2">{row.protein_g ? `${Math.round(row.protein_g)}g` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-foreground/50">No health data synced yet.</p>
        )}
      </section>

      {/* Check-ins */}
      <section>
        <h2 className="text-heading mb-4">Recent Check-ins</h2>
        {checkIns && checkIns.length > 0 ? (
          <div className="space-y-3">
            {checkIns.map((ci: any) => (
              <div key={ci.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-label font-medium">Week of {ci.week_start}</span>
                  <span className={`badge ${ci.status === 'reviewed' ? 'text-accent' : 'text-foreground/50'}`}>
                    {ci.status}
                  </span>
                </div>
                {ci.bodyweight_kg && <p className="text-body">Weight: {ci.bodyweight_kg} kg</p>}
                {ci.notes && <p className="text-body text-foreground/70 mt-1">{ci.notes}</p>}
                {ci.trainer_feedback && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-caption text-accent mb-1">Your Feedback</p>
                    <p className="text-body">{ci.trainer_feedback}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body text-foreground/50">No check-ins submitted yet.</p>
        )}
      </section>

      {/* Workout Sessions */}
      <section>
        <h2 className="text-heading mb-4">Recent Workout Sessions</h2>
        {sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((s: any) => (
              <div key={s.id} className="card flex items-center justify-between">
                <div>
                  <p className="text-label font-medium">{(s.workout_templates as any)?.title ?? 'Workout'}</p>
                  <p className="text-caption text-foreground/50">
                    {new Date(s.performed_at).toLocaleDateString()}
                  </p>
                </div>
                {s.duration_seconds && (
                  <span className="text-label text-foreground/60">
                    {Math.round(s.duration_seconds / 60)} min
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body text-foreground/50">No workout sessions yet.</p>
        )}
      </section>
    </div>
  )
}
