import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Shield, Users, Dumbbell, Salad } from 'lucide-react'

export const metadata = { title: 'Admin Overview' }

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')
  if (profile.role === 'trainer') redirect('/trainer')
  if (profile.role === 'client') redirect('/client')

  // Counts
  const [
    { count: trainerCount },
    { count: clientCount },
    { count: exerciseCount },
    { count: mealPlanCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'trainer'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('exercises').select('*', { count: 'exact', head: true }),
    supabase.from('meal_plans').select('*', { count: 'exact', head: true }),
  ])

  // Recent sign-ups
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Last weekly summary (edge function last run)
  const { data: lastSummary } = await supabase
    .from('weekly_summaries')
    .select('generated_at')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  const stats = [
    { label: 'Trainers', value: trainerCount ?? 0, icon: Users },
    { label: 'Clients', value: clientCount ?? 0, icon: Users },
    { label: 'Exercises', value: exerciseCount ?? 0, icon: Dumbbell },
    { label: 'Meal Plans', value: mealPlanCount ?? 0, icon: Salad },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display flex items-center gap-2">
          <Shield className="w-7 h-7 text-accent" /> Admin Overview
        </h1>
        <p className="text-body text-foreground-secondary mt-1">System-wide statistics and health.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-foreground-secondary" />
              <span className="text-label text-foreground-secondary">{label}</span>
            </div>
            <p className="text-3xl font-bold font-display text-foreground">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* System Health */}
      <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block" />
          <span className="text-label text-foreground">Supabase Realtime</span>
          <span className="text-label text-accent font-medium">Online</span>
        </div>
        <div className="text-label text-foreground-secondary">
          Weekly summary last run:{' '}
          {lastSummary?.generated_at
            ? new Date(lastSummary.generated_at).toLocaleString()
            : 'Never'}
        </div>
      </div>

      {/* Recent Sign-ups */}
      <section>
        <h2 className="text-heading mb-4">Recent Sign-ups</h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-foreground-secondary text-left">
                <th className="py-3 px-4 font-medium">User</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(recentUsers ?? []).map((u: any) => (
                <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
                        {u.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="font-medium text-foreground">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      u.role === 'admin' ? 'text-accent border-accent/30 bg-accent/10' :
                      u.role === 'trainer' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' :
                      'text-foreground-secondary border-border'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground-secondary hidden sm:table-cell">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
