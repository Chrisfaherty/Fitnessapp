import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrainerMessagingClient from '@/components/trainer/trainer-messaging-client'

export default async function TrainerMessagingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all conversations for this trainer with client profile info
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id, created_at,
      profiles!conversations_client_id_fkey (
        id, full_name, email
      ),
      messages (
        body, sent_at, sender_id
      )
    `)
    .eq('trainer_id', user.id)
    .order('created_at', { ascending: false })

  const convos = (conversations ?? []).map((c: any) => {
    const msgs: any[] = c.messages ?? []
    const lastMsg = msgs.sort((a: any, b: any) =>
      new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    )[0]
    return {
      id: c.id,
      clientId: c.profiles?.id,
      clientName: c.profiles?.full_name ?? c.profiles?.email ?? 'Client',
      lastMessage: lastMsg?.body ?? null,
      lastMessageAt: lastMsg?.sent_at ?? c.created_at,
    }
  })

  return <TrainerMessagingClient conversations={convos} trainerId={user.id} />
}
