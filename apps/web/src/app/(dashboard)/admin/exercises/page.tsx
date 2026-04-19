import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AdminExerciseTable } from '@/components/admin/admin-exercise-table'

export const metadata = { title: 'Exercise Library — Admin' }

export default async function AdminExercisesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')
  if (profile.role !== 'admin') {
    redirect(profile.role === 'trainer' ? '/trainer' : '/client')
  }

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, category, equipment, level, primary_muscles, image_paths')
    .order('name')
    .limit(50)

  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-display">Exercise Library</h1>
          <p className="text-body text-foreground-secondary mt-1">{count?.toLocaleString()} exercises total.</p>
        </div>
      </div>
      <AdminExerciseTable initialExercises={exercises ?? []} totalCount={count ?? 0} />
    </div>
  )
}
