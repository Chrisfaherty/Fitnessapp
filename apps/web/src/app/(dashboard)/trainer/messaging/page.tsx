import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrainerMessagingClient from '@/components/trainer/trainer-messaging-client'

export const dynamic = 'force-dynamic'

export default async function TrainerMessagingPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Step 1: fetch conversations for this trainer (no ambiguous FK join on profiles)
  const { data: conversations, error: convErr } = await supabase
    .from('conversations')
    .select('id, created_at, client_id')
    .eq('trainer_id', user.id)
    .order('created_at', { ascending: false })

  if (convErr) {
    console.error('[messaging] conversations query error:', convErr)
  }

  const convList = conversations ?? []
  const clientIds = convList.map((c) => c.client_id).filter(Boolean)
  const convoIds  = convList.map((c) => c.id)

  // Step 2: fetch client profiles
  const { data: profiles } = clientIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', clientIds)
    : { data: [] }

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p])
  )

  // Step 3: fetch latest message per conversation
  const { data: messages } = convoIds.length
    ? await supabase
        .from('messages')
        .select('conversation_id, body, created_at')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Group messages by conversation, take the latest
  const lastMsgMap: Record<string, { body: string | null; created_at: string }> = {}
  for (const msg of messages ?? []) {
    if (!lastMsgMap[msg.conversation_id]) {
      lastMsgMap[msg.conversation_id] = { body: msg.body, created_at: msg.created_at }
    }
  }

  const convos = convList.map((c) => {
    const profile = profileMap[c.client_id]
    const lastMsg = lastMsgMap[c.id]
    return {
      id: c.id,
      clientId: c.client_id,
      clientName: profile?.full_name ?? profile?.email ?? 'Client',
      lastMessage: lastMsg?.body ?? null,
      lastMessageAt: lastMsg?.created_at ?? c.created_at,
    }
  })

  return <TrainerMessagingClient conversations={convos} trainerId={user.id} />
}
