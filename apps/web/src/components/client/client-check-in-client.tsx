'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

interface CheckIn {
  id: string
  week_start: string
  status: string
  bodyweight_kg: number | null
  notes: string | null
  trainer_feedback: string | null
  created_at: string
}

interface Props {
  initialCheckIns: CheckIn[]
  userId: string
}

export default function ClientCheckInClient({ initialCheckIns, userId }: Props) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>(initialCheckIns)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ bodyweight: '', notes: '' })
  const supabase = createBrowserSupabaseClient()

  // Week start = Monday of this week
  const weekStart = (() => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    return d.toISOString().split('T')[0]
  })()

  const alreadySubmitted = checkIns.some((c) => c.week_start === weekStart)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload: Record<string, unknown> = {
      client_id: userId,
      week_start: weekStart,
      status: 'submitted',
    }
    if (form.bodyweight) payload.bodyweight_kg = Number(form.bodyweight)
    if (form.notes.trim()) payload.notes = form.notes.trim()

    const { data } = await supabase
      .from('check_ins')
      .insert(payload)
      .select()
      .single()

    if (data) setCheckIns((prev) => [data, ...prev])
    setShowForm(false)
    setSaving(false)
    setForm({ bodyweight: '', notes: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">Weekly Check-In</h1>
          <p className="text-body text-foreground/60 mt-1">Week of {weekStart}</p>
        </div>
        {!alreadySubmitted && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : 'Submit Check-In'}
          </button>
        )}
        {alreadySubmitted && (
          <span className="badge bg-accent/20 text-accent">✓ Submitted this week</span>
        )}
      </div>

      {/* Submit Form */}
      {showForm && (
        <form onSubmit={submit} className="card space-y-4">
          <h2 className="text-heading">This Week's Check-In</h2>
          <div>
            <label className="text-label mb-1 block">Current weight (kg)</label>
            <input
              type="number" step={0.1}
              value={form.bodyweight}
              onChange={(e) => setForm((f) => ({ ...f, bodyweight: e.target.value }))}
              placeholder="75.5"
              className="input w-full max-w-xs"
            />
          </div>
          <div>
            <label className="text-label mb-1 block">How was your week?</label>
            <textarea
              rows={5}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Training felt good, diet was on point, stress was manageable…"
              className="input w-full resize-none"
            />
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Submitting…' : 'Submit Check-In'}
          </button>
        </form>
      )}

      {/* History */}
      <div className="space-y-4">
        {checkIns.length === 0 ? (
          <div className="card text-center py-12 text-foreground/50">
            <p className="text-heading mb-1">No check-ins yet</p>
            <p className="text-body">Submit your first weekly check-in above.</p>
          </div>
        ) : (
          checkIns.map((ci) => (
            <div
              key={ci.id}
              className={`card space-y-3 ${ci.status === 'reviewed' ? 'border-accent/40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-label font-medium">Week of {ci.week_start}</span>
                <span className={`badge ${
                  ci.status === 'reviewed'
                    ? 'bg-accent/20 text-accent'
                    : 'bg-surface-alt text-foreground/60'
                }`}>
                  {ci.status === 'reviewed' ? '✓ Reviewed' : 'Pending'}
                </span>
              </div>

              {ci.bodyweight_kg != null && (
                <p className="text-body">
                  <span className="text-foreground/50">Weight:</span> {ci.bodyweight_kg} kg
                </p>
              )}
              {ci.notes && <p className="text-body text-foreground/70">{ci.notes}</p>}

              {ci.trainer_feedback && (
                <div className="border-t border-border pt-3 space-y-1">
                  <p className="text-caption text-accent font-medium">Trainer Feedback</p>
                  <p className="text-body">{ci.trainer_feedback}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
