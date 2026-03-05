import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientCheckInClient from '@/components/client/client-check-in-client'

export default async function ClientCheckInsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('id, week_start, status, bodyweight_kg, notes, trainer_feedback, created_at')
    .eq('client_id', user.id)
    .order('week_start', { ascending: false })
    .limit(20)

  return <ClientCheckInClient initialCheckIns={checkIns ?? []} userId={user.id} />
}
