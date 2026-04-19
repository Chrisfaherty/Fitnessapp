import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientDiaryClient from '@/components/client/client-diary-client'

export default async function ClientDiaryPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'client' && profile.role !== 'admin')) {
    redirect('/trainer')
  }

  const { data: entries } = await supabase
    .from('diary_entries')
    .select('id, date, mood, sleep_hours, notes, created_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(30)

  return <ClientDiaryClient initialEntries={entries ?? []} userId={user.id} />
}
