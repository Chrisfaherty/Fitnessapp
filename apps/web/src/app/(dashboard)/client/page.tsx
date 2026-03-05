import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ClientDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Last 7 days health summary
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const { data: health } = await supabase
    .from('health_daily')
    .select('date, steps, calories_out, weight_kg')
    .eq('user_id', user.id)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  const avgSteps = health && health.length > 0
    ? Math.round(health.reduce((a, r: any) => a + (r.steps ?? 0), 0) / health.filter((r: any) => r.steps).length)
    : null

  const latestWeight = health?.find((r: any) => r.weight_kg)?.weight_kg ?? null

  // Active assignments
  const { count: workoutCount } = await supabase
    .from('workout_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .eq('status', 'assigned')

  // Pending check-in
  const { data: lastCheckIn } = await supabase
    .from('check_ins')
    .select('week_start, status')
    .eq('client_id', user.id)
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  const shortcuts = [
    { href: '/client/workouts', label: 'My Workouts', icon: '🏋️', count: workoutCount ?? 0, badge: workoutCount ? `${workoutCount} pending` : undefined },
    { href: '/client/diary', label: 'Daily Diary', icon: '📖' },
    { href: '/client/check-ins', label: 'Check-In', icon: '✅', badge: !lastCheckIn ? 'Due now' : undefined },
    { href: '/client/meals', label: 'Meal Plan', icon: '🥗' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-display">Dashboard</h1>

      {/* Health Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg Steps (7d)" value={avgSteps?.toLocaleString() ?? '—'} />
        <StatCard label="Latest Weight" value={latestWeight ? `${latestWeight} kg` : '—'} />
        <StatCard label="Active Workouts" value={workoutCount?.toString() ?? '0'} highlight />
        <StatCard label="Data Points" value={health?.length?.toString() ?? '0'} />
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-heading mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="card hover:border-accent transition-colors text-center group relative"
            >
              {s.badge && (
                <span className="absolute top-3 right-3 badge bg-accent text-black text-[10px]">
                  {s.badge}
                </span>
              )}
              <div className="text-3xl mb-2">{s.icon}</div>
              <p className="text-label font-medium group-hover:text-accent transition-colors">
                {s.label}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="card">
      <p className="text-caption text-foreground/50 mb-1">{label}</p>
      <p className={`text-heading font-bold ${highlight ? 'text-accent' : ''}`}>{value}</p>
    </div>
  )
}
