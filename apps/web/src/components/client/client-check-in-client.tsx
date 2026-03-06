"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { CheckCircle2, MessageSquare, ChevronRight, ArrowLeft } from "lucide-react";

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

const slideVariants = {
  enter: { opacity: 0, x: 32 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -32 },
};

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

    const { data } = await supabase
      .from("check_ins")
      .insert(payload)
      .select("id, week_start_date, status, body_weight_kg, client_notes, trainer_notes, created_at")
      .single();

    if (data) setCheckIns((prev) => [data, ...prev]);
    setSaving(false);
    resetWizard();
  };

  return (
    <div className="space-y-8">
      {/* ── Page header ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-label mb-1.5">Weekly</p>
          <h1 className="text-display">Check-In</h1>
          <p className="text-caption mt-1">Week of {weekStart}</p>
        </div>

        {alreadySubmitted ? (
          <div className="flex items-center gap-2 badge-success px-3 py-2 rounded-xl">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Submitted this week</span>
          </div>
        ) : !showWizard ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowWizard(true)}
            className="btn-primary rounded-full px-6"
          >
            Submit Check-In
          </motion.button>
        ) : null}
      </div>

      {/* ── Progressive Disclosure Wizard ─────────────────── */}
      <AnimatePresence mode="wait">
        {showWizard && (
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card overflow-hidden"
          >
            {/* Wizard progress bar */}
            <div className="h-0.5 bg-border -mx-6 -mt-6 mb-8">
              <motion.div
                className="h-full bg-accent rounded-r-full"
                animate={{ width: `${(step / 3) * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
              />
            </div>

            {/* Step counter + back */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <span className="text-label">Step {step} of 3</span>
              </div>
              <button
                onClick={resetWizard}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* ── Step content (animated) ───────────────── */}
            <AnimatePresence mode="wait">
              {/* STEP 1 — Mood rating */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 280, damping: 30 }}
                  className="text-center pb-4"
                >
                  <h2 className="text-2xl font-bold tracking-tight mb-2">
                    How was your week?
                  </h2>
                  <p className="text-caption mb-10">Tap to continue</p>

                  <div className="flex items-end justify-center gap-3">
                    {MOODS.map((m) => (
                      <motion.button
                        key={m.value}
                        onClick={() => handleMoodSelect(m.value)}
                        whileHover={{ scale: 1.2, y: -4 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <span
                          className={`text-4xl transition-all duration-fast leading-none
                            ${mood === m.value ? "grayscale-0 scale-125" : "grayscale group-hover:grayscale-0"}`}
                        >
                          {m.emoji}
                        </span>
                        <span className="text-[10px] text-muted uppercase tracking-wider font-semibold group-hover:text-foreground transition-colors">
                          {m.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 2 — Weight */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 280, damping: 30 }}
                  className="pb-4"
                >
                  <div className="flex items-center gap-2 mb-8">
                    <span className="text-3xl leading-none">
                      {MOODS.find((m) => m.value === mood)?.emoji}
                    </span>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">
                        What&apos;s your weight?
                      </h2>
                      <p className="text-caption">This week&apos;s weigh-in (optional)</p>
                    </div>
                  </div>

                  {/* Large Geist Mono number input */}
                  <div className="flex items-baseline justify-center gap-3 mb-10">
                    <input
                      type="number"
                      step={0.1}
                      min={30}
                      max={300}
                      value={bodyweight}
                      onChange={(e) => setBodyweight(e.target.value)}
                      placeholder="75.0"
                      autoFocus
                      className="bg-transparent text-6xl font-mono font-bold text-foreground focus:outline-none w-48 text-right tabular-nums border-b-2 border-border focus:border-accent transition-colors pb-1 placeholder:text-muted/30"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    />
                    <span className="text-2xl font-mono text-muted font-medium">kg</span>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setStep(3)}
                      className="btn-ghost text-sm"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="btn-primary flex items-center gap-2"
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 — Notes + Submit */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 280, damping: 30 }}
                  className="pb-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-accent" />
                    <h2 className="text-2xl font-bold tracking-tight">
                      Anything else?
                    </h2>
                  </div>
                  <p className="text-caption mb-6">
                    How was training, diet, sleep, stress? Your trainer will see this.
                  </p>

                  <textarea
                    rows={5}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    autoFocus
                    placeholder="Training felt strong, diet was on point, sleep was rough this week…"
                    className="input resize-none mb-6 text-sm leading-relaxed"
                  />

                  {/* Summary chips */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {mood > 0 && (
                      <span className="badge-neutral">
                        {MOODS.find((m) => m.value === mood)?.emoji}{" "}
                        {MOODS.find((m) => m.value === mood)?.label}
                      </span>
                    )}
                    {bodyweight && (
                      <span className="badge-neutral font-mono">
                        {bodyweight} kg
                      </span>
                    )}
                  </div>

                  <button
                    onClick={submit}
                    disabled={saving}
                    className="btn-primary w-full justify-center"
                  >
                    {saving ? "Submitting…" : "Submit Check-In ✓"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Check-in history ──────────────────────────────── */}
      {checkIns.length > 0 && (
        <section>
          <h2 className="section-title mb-4">History</h2>
          <div className="space-y-3">
            {checkIns.map((ci) => (
              <div
                key={ci.id}
                className={`card space-y-3 ${ci.status === "reviewed" ? "border-accent/25" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-label">Week of {ci.week_start_date}</span>
                  <span
                    className={`badge ${
                      ci.status === "reviewed" ? "badge-accent" : "badge-neutral"
                    }`}
                  >
                    {ci.status === "reviewed" ? "✓ Reviewed" : "Pending review"}
                  </span>
                </div>

                {ci.body_weight_kg != null && (
                  <p className="text-sm">
                    <span className="text-foreground-secondary">Weight: </span>
                    <span className="font-mono font-semibold">{ci.body_weight_kg} kg</span>
                  </p>
                )}

                {ci.client_notes && (
                  <p className="text-sm text-foreground-secondary whitespace-pre-line leading-relaxed">
                    {ci.client_notes}
                  </p>
                )}

                {ci.trainer_notes && (
                  <div className="border-t border-border pt-3 space-y-1">
                    <p className="text-xs text-accent font-semibold uppercase tracking-wider">
                      Trainer Feedback
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {ci.trainer_notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {checkIns.length === 0 && !showWizard && (
        <div className="empty-state">
          <div className="stat-card-icon mx-auto">
            <CheckCircle2 className="w-5 h-5 text-foreground-secondary" />
          </div>
          <p className="text-subheading">No check-ins yet</p>
          <p className="text-caption max-w-xs text-sm">
            Submit your first weekly check-in to keep your trainer updated.
          </p>
        </div>
      )}
    </div>
  );
}
