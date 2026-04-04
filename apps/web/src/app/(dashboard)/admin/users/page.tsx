import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AdminUserTable } from '@/components/admin/admin-user-table'

export const metadata = { title: 'User Management' }

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/auth/login')

  // Fetch users via adminusers edge function
  const { data: fnData, error } = await supabase.functions.invoke('adminusers')
  const users: any[] = error ? [] : (fnData?.data ?? [])

  // Fetch all trainers for linking modal
  const { data: trainers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'trainer')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">User Management</h1>
        <p className="text-body text-foreground-secondary mt-1">Manage roles, trainer links, and account status.</p>
      </div>
      <AdminUserTable initialUsers={users} trainers={trainers ?? []} />
    </div>
  )
}
