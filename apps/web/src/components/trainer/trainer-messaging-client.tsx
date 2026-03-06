'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type MessageRow = Database['public']['Tables']['messages']['Row']
type MessageInsert = Database['public']['Tables']['messages']['Insert']

interface ConversationSummary {
  id: string
  clientId: string
  clientName: string
  lastMessage: string | null
  lastMessageAt: string
}

interface Props {
  conversations: ConversationSummary[]
  trainerId: string
}

export default function TrainerMessagingClient({ conversations, trainerId }: Props) {
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(
    conversations[0]?.id ?? null
  )
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [inputText, setInputText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserSupabaseClient()

  const selectedConvo = conversations.find((c) => c.id === selectedConvoId)

  // Load messages when conversation changes
  useEffect(() => {
    if (!selectedConvoId) return
    setLoadingMessages(true)
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', selectedConvoId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMessages(data ?? [])
        setLoadingMessages(false)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
  }, [selectedConvoId])

  // Realtime subscription
  useEffect(() => {
    if (!selectedConvoId) return
    const channel = supabase
      .channel(`messages-${selectedConvoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConvoId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev
            return [...prev, payload.new as MessageRow]
          })
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedConvoId])

  const sendMessage = async () => {
    const text = inputText.trim()
    if (!text || !selectedConvoId) return
    setInputText('')
    const payload: MessageInsert = {
      conversation_id: selectedConvoId,
      sender_id: trainerId,
      sender_role: 'trainer',
      body: text,
      video_storage_path: null,
      video_thumbnail: null,
      read_at: null,
    }
    await supabase.from('messages').insert(payload)
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] gap-0 border border-border rounded-xl overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-heading">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-4 text-body text-foreground/50">No conversations yet.</p>
          )}
          {conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => setSelectedConvoId(convo.id)}
              className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-surface-alt transition-colors ${
                selectedConvoId === convo.id ? 'bg-surface-alt border-l-2 border-l-accent' : ''
              }`}
            >
              <p className="text-label font-medium truncate">{convo.clientName}</p>
              {convo.lastMessage && (
                <p className="text-caption text-foreground/50 truncate mt-0.5">{convo.lastMessage}</p>
              )}
              <p className="text-caption text-foreground/30 mt-0.5">
                {new Date(convo.lastMessageAt).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <h3 className="text-label font-medium">{selectedConvo?.clientName ?? 'Select a conversation'}</h3>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingMessages ? (
            <div className="flex justify-center pt-8">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-body text-foreground/40 pt-8">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === trainerId
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2 text-sm ${
                    isOwn
                      ? 'bg-accent text-black'
                      : 'bg-surface-alt text-foreground'
                  }`}>
                    {msg.video_storage_path ? (
                      <span className="flex items-center gap-1">
                        <span>Video message</span>
                      </span>
                    ) : (
                      msg.body
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {selectedConvoId && (
          <div className="border-t border-border p-4 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Message..."
              className="input flex-1"
            />
            <button
              onClick={sendMessage}
              disabled={!inputText.trim()}
              className="btn btn-primary px-4"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
