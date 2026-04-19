"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { CheckCircle2 } from "lucide-react";

// Use a subset of the real DB Row type so field names stay in sync
type CheckIn = Pick<
  Database["public"]["Tables"]["check_ins"]["Row"],
  "id" | "week_start_date" | "status" | "body_weight_kg" | "client_notes" | "trainer_notes" | "created_at"
>;

interface Props {
  initialCheckIns: CheckIn[];
  userId: string;
}

const MOODS = [
  { value: 1, emoji: "😩", label: "Rough" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🔥", label: "Crushed it" },
] as const;

export default function ClientCheckInClient({ initialCheckIns, userId }: Props) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>(initialCheckIns);
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mood, setMood] = useState(0);
  const [bodyweight, setBodyweight] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserSupabaseClient();

  // Week start = Monday of current week
  const weekStart = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split("T")[0];
  })();

  const alreadySubmitted = checkIns.some((c) => c.week_start_date === weekStart);

  const resetWizard = () => {
    setStep(1);
    setMood(0);
    setBodyweight("");
    setNotes("");
    setShowWizard(false);
  };

  const handleMoodSelect = (value: number) => {
    setMood(value);
    setTimeout(() => setStep(2), 280); // brief pause for feedback before advancing
  };

  const submit = async () => {
    setSaving(true);

    // Combine mood + user notes into client_notes
    const moodLabel = MOODS.find((m) => m.value === mood);
    const moodLine = moodLabel ? `Mood: ${moodLabel.emoji} ${moodLabel.label} (${mood}/5)` : "";
    const combinedNotes = [moodLine, notes.trim()].filter(Boolean).join("\n") || null;

    const payload: Database["public"]["Tables"]["check_ins"]["Insert"] = {
      client_id: userId,
      week_start_date: weekStart,
      status: "submitted",
      body_weight_kg: bodyweight ? Number(bodyweight) : null,
      client_notes: combinedNotes,
    };

    const { data, error } = await supabase
      .from("check_ins")
      .insert(payload)
      .select("id, week_start_date, status, body_weight_kg, client_notes, trainer_notes, created_at")
      .single();

    setSaving(false);

    if (error) {
      toast.error("Failed to submit check-in", {
        description: error.message,
      });
      // Keep wizard open so user can retry
      return;
    }

    if (data) setCheckIns((prev) => [data, ...prev]);
    resetWizard();
  };

  const total = 3;
  const progress = ((step - 1) / (total - 1)) * 100;
  const isLastStep = step === 3;

  const prevStep = () => setStep((s) => (s - 1) as 1 | 2 | 3);
  const nextStep = () => {
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
    else submit();
  };

  // --- Wizard fullscreen overlay ---
  if (showWizard) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Progress indicator */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1 bg-surface-elevated rounded-full overflow-hidden flex-1">
              <div
                className="h-full bg-accent rounded-full transition-all duration-[400ms]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-caption text-foreground-tertiary whitespace-nowrap">
              {step} / {total}
            </span>
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[720px]">
            <AnimatePresence mode="wait">
              {/* STEP 1 — Mood rating */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h2 className="text-h2 font-display text-foreground mb-3">
                    How was your week?
                  </h2>
                  <p className="text-body text-foreground-secondary mb-8">
                    Select a rating — this goes straight to your trainer.
                  </p>

                  <div className="flex gap-2 flex-wrap mt-2">
                    {MOODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => handleMoodSelect(m.value)}
                        className={`w-14 h-14 rounded-md text-body font-medium border transition-all duration-[120ms] flex flex-col items-center justify-center gap-0.5 ${
                          mood === m.value
                            ? "bg-accent text-accent-foreground border-transparent"
                            : "bg-surface border-border text-foreground-secondary hover:border-border-strong hover:text-foreground"
                        }`}
                      >
                        <span className="text-xl leading-none">{m.emoji}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide leading-none">
                          {m.value}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="text-label text-foreground-tertiary mt-6">
                    Tap a rating to continue
                  </p>
                </motion.div>
              )}

              {/* STEP 2 — Weight */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h2 className="text-h2 font-display text-foreground mb-3">
                    What&apos;s your weight this week?
                  </h2>
                  <p className="text-body text-foreground-secondary mb-8">
                    Optional — skip if you didn&apos;t weigh in.
                  </p>

                  <input
                    type="number"
                    step={0.1}
                    min={30}
                    max={300}
                    value={bodyweight}
                    onChange={(e) => setBodyweight(e.target.value)}
                    placeholder="75.0"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && nextStep()}
                    className="w-full h-[52px] bg-surface border border-border text-foreground text-[16px] font-sans rounded-md px-[14px] placeholder:text-foreground-secondary focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] transition-all duration-[160ms]"
                  />

                  <p className="text-label text-foreground-tertiary mt-4">
                    Press Enter ↵ to continue
                  </p>
                </motion.div>
              )}

              {/* STEP 3 — Notes + Review */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h2 className="text-h2 font-display text-foreground mb-3">
                    Anything else to share?
                  </h2>
                  <p className="text-body text-foreground-secondary mb-8">
                    Training, diet, sleep, stress — your trainer will see this.
                  </p>

                  <textarea
                    autoFocus
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Training felt strong, diet was on point, sleep was rough this week…"
                    className="w-full min-h-[140px] bg-surface border border-border text-foreground text-[16px] font-sans rounded-md px-[14px] py-3 placeholder:text-foreground-secondary focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] resize-y transition-all duration-[160ms]"
                  />

                  {/* Review summary */}
                  <div className="bg-surface border border-border rounded-lg p-6 shadow-inset space-y-4 mt-6 mb-2">
                    <h3 className="text-h3 font-display text-foreground mb-2">
                      Review your check-in
                    </h3>
                    <div className="py-3 border-b border-border/50">
                      <p className="text-label text-foreground-tertiary mb-1">Weekly mood</p>
                      <p className="text-body text-foreground">
                        {mood > 0
                          ? `${MOODS.find((m) => m.value === mood)?.emoji} ${MOODS.find((m) => m.value === mood)?.label} (${mood}/5)`
                          : "—"}
                      </p>
                    </div>
                    <div className="py-3 border-b border-border/50">
                      <p className="text-label text-foreground-tertiary mb-1">Body weight</p>
                      <p className="text-body text-foreground">
                        {bodyweight ? `${bodyweight} kg` : "Skipped"}
                      </p>
                    </div>
                    <div className="py-3 last:border-0">
                      <p className="text-label text-foreground-tertiary mb-1">Notes</p>
                      <p className="text-body text-foreground whitespace-pre-line">
                        {notes.trim() || "—"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="h-9 px-3 rounded-sm text-body-sm text-foreground-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors duration-[120ms]"
            >
              ← Back
            </button>
          ) : (
            <button
              onClick={resetWizard}
              className="h-9 px-3 rounded-sm text-body-sm text-foreground-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors duration-[120ms]"
            >
              Cancel
            </button>
          )}

          {/* On step 1, navigation is handled by tapping a mood tile; show skip/continue only for step 2+ */}
          {step >= 2 && (
            <button
              onClick={nextStep}
              disabled={saving}
              className="h-10 px-6 bg-accent text-accent-foreground text-[14px] font-bold rounded-md hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[160ms]"
            >
              {isLastStep ? (saving ? "Submitting…" : "Submit Check-in") : "Continue →"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Default page view (not in wizard) ---
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-label text-foreground-secondary mb-1.5">Weekly</p>
          <h1 className="text-h2 font-display text-foreground">Check-In</h1>
          <p className="text-caption text-foreground-tertiary mt-1">Week of {weekStart}</p>
        </div>

        {alreadySubmitted ? (
          <div className="flex items-center gap-2 bg-accent/10 border border-accent/25 text-accent px-3 py-2 rounded-md">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-body-sm font-medium">Submitted this week</span>
          </div>
        ) : (
          <button
            onClick={() => setShowWizard(true)}
            className="h-10 px-6 bg-accent text-accent-foreground text-[14px] font-bold rounded-md hover:bg-accent-strong transition-colors duration-[160ms]"
          >
            Submit Check-In
          </button>
        )}
      </div>

      {/* Check-in history */}
      {checkIns.length > 0 && (
        <section>
          <h2 className="text-label text-foreground-tertiary uppercase tracking-wider mb-4">
            History
          </h2>
          <div className="space-y-3">
            {checkIns.map((ci) => (
              <div
                key={ci.id}
                className={`bg-surface border rounded-lg p-5 space-y-3 ${
                  ci.status === "reviewed" ? "border-accent/25" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-label text-foreground-secondary">
                    Week of {ci.week_start_date}
                  </span>
                  <span
                    className={`text-label font-medium px-2.5 py-1 rounded-sm border ${
                      ci.status === "reviewed"
                        ? "bg-accent/10 border-accent/25 text-accent"
                        : "bg-surface-elevated border-border text-foreground-secondary"
                    }`}
                  >
                    {ci.status === "reviewed" ? "✓ Reviewed" : "Pending review"}
                  </span>
                </div>

                {ci.body_weight_kg != null && (
                  <p className="text-body-sm">
                    <span className="text-foreground-secondary">Weight: </span>
                    <span className="font-mono font-semibold text-foreground">
                      {ci.body_weight_kg} kg
                    </span>
                  </p>
                )}

                {ci.client_notes && (
                  <p className="text-body-sm text-foreground-secondary whitespace-pre-line leading-relaxed">
                    {ci.client_notes}
                  </p>
                )}

                {ci.trainer_notes && (
                  <div className="border-t border-border pt-3 space-y-1">
                    <p className="text-label text-accent font-semibold uppercase tracking-wider">
                      Trainer Feedback
                    </p>
                    <p className="text-body-sm text-foreground leading-relaxed">
                      {ci.trainer_notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {checkIns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-lg bg-surface-elevated border border-border flex items-center justify-center mb-4">
            <CheckCircle2 className="w-5 h-5 text-foreground-secondary" />
          </div>
          <p className="text-body text-foreground font-medium mb-1">No check-ins yet</p>
          <p className="text-body-sm text-foreground-secondary max-w-xs">
            Submit your first weekly check-in to keep your trainer updated.
          </p>
        </div>
      )}
    </div>
  );
}
