import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Footprints,
  Scale,
  Dumbbell,
  Activity,
  BookText,
  ClipboardCheck,
  Salad,
} from 'lucide-react'

export default async function ClientDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Last 7 days health summary
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const { data: healthRaw } = await supabase
    .from('health_daily')
    .select('date, steps, calories_out, weight_kg')
    .eq('user_id', user.id)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  const health = (healthRaw ?? []) as Array<{ date: string; steps: number | null; calories_out: number | null; weight_kg: number | null }>

  const avgSteps = health.length > 0
    ? Math.round(health.reduce((a, r) => a + (r.steps ?? 0), 0) / (health.filter(r => r.steps).length || 1))
    : null

  const latestWeight = health.find(r => r.weight_kg)?.weight_kg ?? null

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
    { href: '/client/workouts', label: 'My Workouts', icon: Dumbbell, badge: workoutCount ? `${workoutCount} pending` : undefined },
    { href: '/client/diary', label: 'Daily Diary', icon: BookText },
    { href: '/client/check-ins', label: 'Check-In', icon: ClipboardCheck, badge: !lastCheckIn ? 'Due now' : undefined },
    { href: '/client/meals', label: 'Meal Plan', icon: Salad },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-display">Dashboard</h1>

      {/* Health Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg Steps (7d)" value={avgSteps?.toLocaleString() ?? '—'} icon={Footprints} />
        <StatCard label="Latest Weight" value={latestWeight ? `${latestWeight} kg` : '—'} icon={Scale} />
        <StatCard label="Active Workouts" value={workoutCount?.toString() ?? '0'} icon={Dumbbell} highlight />
        <StatCard label="Data Points" value={health?.length?.toString() ?? '0'} icon={Activity} />
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-heading mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {shortcuts.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.href}
                href={s.href}
                className="card hover:border-accent transition-colors text-center group relative flex flex-col items-center justify-center py-6"
              >
                {s.badge && (
                  <span className="absolute top-3 right-3 badge-accent text-[10px]">
                    {s.badge}
                  </span>
                )}
                <Icon className="w-8 h-8 mb-3 text-foreground-secondary group-hover:text-accent transition-colors" />
                <p className="text-label font-medium group-hover:text-accent transition-colors">
                  {s.label}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight = false,
}: {
  label: string
  value: string
  icon: React.ElementType
  highlight?: boolean
}) {
  return (
    <div className="card flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${highlight ? 'bg-accent/20' : 'bg-surface-elevated'}`}>
        <Icon className={`w-5 h-5 ${highlight ? 'text-accent' : 'text-foreground-secondary'}`} />
      </div>
      <div>
        <p className={`text-heading font-bold ${highlight ? 'text-accent' : ''}`}>{value}</p>
        <p className="text-caption">{label}</p>
      </div>
    </div>
  )
}
