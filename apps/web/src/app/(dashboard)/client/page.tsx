import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Footprints, Scale, Dumbbell, Activity, BookText, ClipboardCheck, Salad, ArrowUpRight } from 'lucide-react'
import { SparklineCard } from '@/components/ui/sparkline-card'
import { ActivityHeatmap } from '@/components/ui/activity-heatmap'
import { format, subDays } from 'date-fns'

export default async function ClientDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Last 7 days health summary
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const { data: healthRaw } = await supabase
    .from('health_daily')
    .select('date, steps, active_energy_kcal, weight_kg')
    .eq('user_id', user.id)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  const health = (healthRaw ?? []) as Array<{
    date: string
    steps: number | null
    active_energy_kcal: number | null
    weight_kg: number | null
  }>

  const stepsData = health.map(r => r.steps ?? 0).filter(v => v > 0)
  const avgSteps = stepsData.length > 0
    ? Math.round(stepsData.reduce((a, v) => a + v, 0) / stepsData.length)
    : null

  const weightData = health.filter(r => r.weight_kg).map(r => r.weight_kg as number)
  const latestWeight = weightData.at(-1) ?? null
  const prevWeight   = weightData.length > 1 ? weightData[0] : null
  const weightTrend  = latestWeight && prevWeight
    ? +((latestWeight - prevWeight) / prevWeight * 100).toFixed(1)
    : null

  // 7-day step trend vs prev 7 days
  const { data: prev7Raw } = await supabase
    .from('health_daily')
    .select('steps')
    .eq('user_id', user.id)
    .gte('date', format(subDays(new Date(), 14), 'yyyy-MM-dd'))
    .lt ('date', sevenDaysAgo.toISOString().split('T')[0])
  const prev7Steps = (prev7Raw ?? []).map((r: any) => r.steps ?? 0)
  const prevAvgSteps = prev7Steps.length > 0
    ? Math.round(prev7Steps.reduce((a: number, v: number) => a + v, 0) / prev7Steps.length)
    : null
  const stepsTrend = avgSteps && prevAvgSteps && prevAvgSteps > 0
    ? +((avgSteps - prevAvgSteps) / prevAvgSteps * 100).toFixed(1)
    : null

  // Active assignments
  const { count: workoutCount } = await supabase
    .from('workout_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .eq('status', 'assigned')

  // Pending check-in
  const { data: lastCheckIn } = await supabase
    .from('check_ins')
    .select('week_start_date, status')
    .eq('client_id', user.id)
    .order('week_start_date', { ascending: false })
    .limit(1)
    .single()

  // Workout sessions for heatmap (last 14 weeks)
  const heatmapStart = format(subDays(new Date(), 14 * 7), 'yyyy-MM-dd')
  const { data: sessionsRaw } = await supabase
    .from('workout_sessions')
    .select('started_at')
    .eq('client_id', user.id)
    .gte('started_at', heatmapStart)

  // Aggregate sessions by date
  const sessionCountByDate: Record<string, number> = {}
  for (const s of (sessionsRaw ?? [])) {
    const d = (s as any).started_at?.split('T')[0]
    if (d) sessionCountByDate[d] = (sessionCountByDate[d] ?? 0) + 1
  }
  const heatmapData = Object.entries(sessionCountByDate).map(([date, count]) => ({
    date,
    count: Math.min(count, 4) as number,
  }))

  const shortcuts = [
    { href: '/client/workouts',  label: 'My Workouts', icon: Dumbbell,       badge: workoutCount ? `${workoutCount} pending` : undefined },
    { href: '/client/diary',     label: 'Daily Diary', icon: BookText },
    { href: '/client/check-ins', label: 'Check-In',    icon: ClipboardCheck, badge: !lastCheckIn ? 'Due now' : undefined },
    { href: '/client/meals',     label: 'Meal Plan',   icon: Salad },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="text-caption mb-1">Your overview</p>
        <h1 className="text-display">Dashboard</h1>
      </div>

      {/* Metric stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SparklineCard
          label="Avg Steps (7d)"
          value={avgSteps?.toLocaleString() ?? '—'}
          icon={Footprints}
          data={health.map(r => r.steps ?? 0)}
          trendPct={stepsTrend}
          color="#4F6EF7"
        />
        <SparklineCard
          label="Latest Weight"
          value={latestWeight ? `${latestWeight}` : '—'}
          unit={latestWeight ? 'kg' : undefined}
          icon={Scale}
          data={weightData}
          trendPct={weightTrend}
          color="#4F6EF7"
        />
        <SparklineCard
          label="Active Workouts"
          value={workoutCount?.toString() ?? '0'}
          icon={Dumbbell}
          accent={!!workoutCount}
          color="#A3FF12"
        />
        <SparklineCard
          label="Tracked Days (7d)"
          value={health.length.toString()}
          icon={Activity}
          color="#4F6EF7"
        />
      </div>

      {/* Activity heatmap */}
      <ActivityHeatmap data={heatmapData} label="Workout Activity" weeks={14} />

      {/* Quick Access */}
      <section>
        <div className="section-header">
          <h2 className="section-title">Quick Access</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {shortcuts.map((s) => {
            const Icon = s.icon
            return (
              <Link
                key={s.href}
                href={s.href}
                className="card hover:border-accent/25 transition-all hover:shadow-card-hover group relative flex flex-col items-center justify-center py-7 gap-3"
              >
                {s.badge && (
                  <span className="absolute top-3 right-3 badge-accent text-[10px] font-semibold">
                    {s.badge}
                  </span>
                )}
                <div className="w-11 h-11 rounded-xl bg-surface-elevated flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                  <Icon className="w-5 h-5 text-foreground-secondary group-hover:text-accent transition-colors" />
                </div>
                <p className="text-sm font-semibold text-foreground-secondary group-hover:text-foreground transition-colors text-center leading-tight">
                  {s.label}
                </p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
