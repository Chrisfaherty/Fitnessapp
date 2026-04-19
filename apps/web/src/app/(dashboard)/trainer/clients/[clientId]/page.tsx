import Link from 'next/link'
import { Dumbbell } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ClientDetailTabs } from '@/components/trainer/client-detail-tabs'

interface Props {
  params: { clientId: string }
  searchParams: { tab?: string }
}

export default async function ClientDetailPage({ params, searchParams }: Props) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: link } = await supabase
    .from('trainer_clients')
    .select('active')
    .eq('trainer_id', user.id)
    .eq('client_id', params.clientId)
    .eq('active', true)
    .single()

  if (!link) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', params.clientId)
    .single()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    { data: healthData },
    { data: checkIns },
    { data: sessions },
  ] = await Promise.all([
    supabase
      .from('health_daily')
      .select('date, steps, active_energy_kcal, weight_kg, protein_g')
      .eq('user_id', params.clientId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false }),
    supabase
      .from('check_ins')
      .select('id, week_start_date, status, body_weight_kg, client_notes, trainer_notes')
      .eq('client_id', params.clientId)
      .order('week_start_date', { ascending: false })
      .limit(10),
    supabase
      .from('workout_sessions')
      .select(`
        id, performed_at, duration_seconds, notes,
        workout_templates ( title ),
        workout_session_sets (
          exercise_id, set_number, reps, weight_kg, rpe,
          exercises ( name )
        )
      `)
      .eq('client_id', params.clientId)
      .order('performed_at', { ascending: false })
      .limit(20),
  ])

  const clientName = profile?.full_name ?? 'Client'
  const activeTab = searchParams.tab ?? 'health'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-16 h-16 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-display">{clientName}</h1>
          </div>
        </div>
        <Link
          href={`/trainer/assign?clientId=${params.clientId}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 transition-colors flex-shrink-0 self-center"
        >
          <Dumbbell className="w-4 h-4" />
          Assign Workout
        </Link>
      </div>

      <ClientDetailTabs
        clientId={params.clientId}
        activeTab={activeTab}
        healthData={healthData ?? []}
        checkIns={checkIns ?? []}
        sessions={sessions ?? []}
      />
    </div>
  )
}
