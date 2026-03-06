'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type DiaryEntryInsert = Database['public']['Tables']['diary_entries']['Insert']

interface DiaryEntry {
  id: string
  date: string
  mood: number | null
  sleep_hours: number | null
  notes: string | null
  created_at: string
}

interface Props {
  initialEntries: DiaryEntry[]
  userId: string
}

export default function ClientDiaryClient({ initialEntries, userId }: Props) {
  const [entries, setEntries] = useState<DiaryEntry[]>(initialEntries)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ mood: '', sleep: '', notes: '' })
  const supabase = createBrowserSupabaseClient()

  const today = new Date().toISOString().split('T')[0]

  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload: DiaryEntryInsert = {
      user_id: userId,
      date: today,
      mood: form.mood ? Number(form.mood) : null,
      sleep_hours: form.sleep ? Number(form.sleep) : null,
      notes: form.notes.trim() || null,
    }

    const { data } = await supabase
      .from('diary_entries')
      .upsert(payload, { onConflict: 'user_id,date' })
      .select('id, date, mood, sleep_hours, notes, created_at')
      .single()

    if (data) {
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.date !== today)
        return [data as DiaryEntry, ...filtered].sort((a, b) => b.date.localeCompare(a.date))
      })
    }

    setShowForm(false)
    setSaving(false)
    setForm({ mood: '', sleep: '', notes: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-display">Daily Diary</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : '+ Add Today'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={saveEntry} className="card space-y-4">
          <h2 className="text-heading">Today&apos;s Entry — {today}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label mb-1 block">Mood (1–10)</label>
              <input
                type="number" min={1} max={10}
                value={form.mood}
                onChange={(e) => setForm((f) => ({ ...f, mood: e.target.value }))}
                placeholder="8"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-label mb-1 block">Sleep (hours)</label>
              <input
                type="number" step={0.5} min={0} max={24}
                value={form.sleep}
                onChange={(e) => setForm((f) => ({ ...f, sleep: e.target.value }))}
                placeholder="7.5"
                className="input w-full"
              />
            </div>
          </div>
          <div>
            <label className="text-label mb-1 block">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="How was your day? Any notable feelings or events..."
              className="input w-full resize-none"
            />
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : 'Save Entry'}
          </button>
        </form>
      )}

      {/* Entries list */}
      {entries.length === 0 ? (
        <div className="card text-center py-12 text-foreground/50">
          <p className="text-heading mb-1">No entries yet</p>
          <p className="text-body">Add your first daily entry above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-label font-medium">{entry.date}</span>
                <div className="flex gap-3 text-caption text-foreground/50">
                  {entry.mood != null && <span>Mood {entry.mood}/10 {moodEmoji(entry.mood)}</span>}
                  {entry.sleep_hours != null && <span>Sleep {entry.sleep_hours}h</span>}
                </div>
              </div>
              {entry.notes && (
                <p className="text-body text-foreground/70">{entry.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function moodEmoji(value: number): string {
  if (value >= 8) return '😄'
  if (value >= 5) return '😐'
  return '😟'
}
