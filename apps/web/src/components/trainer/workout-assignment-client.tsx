"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { toast } from "sonner";
import {
  Dumbbell,
  ChevronRight,
  Check,
  Loader2,
  User,
  LayoutTemplate,
} from "lucide-react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type WorkoutTemplate = Database["public"]["Tables"]["workout_templates"]["Row"];

interface LinkedClient {
  client_id: string;
  profiles: { id: string; full_name: string; avatar_url: string | null } | null;
}

interface Props {
  trainerId: string;
  templates: WorkoutTemplate[];
  clientLinks: LinkedClient[];
  exerciseCounts: Record<string, number>;
  preselectedClientId: string | null;
}

type Step = "client" | "template" | "date" | "confirm";
const STEPS: Step[] = ["client", "template", "date", "confirm"];
const TOTAL_STEPS = STEPS.length;

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -40 : 40,
    opacity: 0,
  }),
};

const spring: Transition = { type: "spring", stiffness: 340, damping: 30 };

export function WorkoutAssignmentClient({
  trainerId,
  templates,
  clientLinks,
  exerciseCounts,
  preselectedClientId,
}: Props) {
  const supabase = createClientSupabaseClient();

  const [currentStep, setCurrentStep] = useState<Step>(
    preselectedClientId ? "template" : "client"
  );
  const [direction, setDirection] = useState(1);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>(
    preselectedClientId ?? ""
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(getTomorrow());
  const [notes, setNotes] = useState<string>("");
  const [templateSearch, setTemplateSearch] = useState<string>("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentDone, setAssignmentDone] = useState(false);

  // Derived data
  const selectedClient = clientLinks.find(
    (l) => l.client_id === selectedClientId
  );
  const selectedTemplate = templates.find(
    (t) => t.id === selectedTemplateId
  );
  const clientName =
    selectedClient?.profiles?.full_name ?? "Unknown Client";
  const templateTitle = selectedTemplate?.title ?? "";

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  const stepIndex = STEPS.indexOf(currentStep);
  const step = stepIndex + 1; // 1-based for display

  function goTo(s: Step) {
    const newIndex = STEPS.indexOf(s);
    setDirection(newIndex > stepIndex ? 1 : -1);
    setCurrentStep(s);
  }

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) goTo(next);
  }

  function goPrev() {
    const prev = STEPS[stepIndex - 1];
    if (prev) goTo(prev);
  }

  function canAdvanceFromClient() {
    return selectedClientId !== "";
  }

  function canAdvanceFromTemplate() {
    return selectedTemplateId !== "";
  }

  function canAdvanceFromDate() {
    return scheduledDate !== "";
  }

  async function handleAssign() {
    if (!selectedClientId || !selectedTemplateId || !scheduledDate) return;
    setIsSubmitting(true);

    const { error } = await supabase.from("workout_assignments").insert({
      client_id: selectedClientId,
      template_id: selectedTemplateId,
      trainer_id: trainerId,
      scheduled_date: scheduledDate,
      status: "assigned",
      notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to assign workout. Please try again.");
      return;
    }

    toast.success("Workout assigned!", {
      description: `${templateTitle} scheduled for ${selectedClient?.profiles?.full_name} on ${scheduledDate}.`,
    });
    setAssignmentDone(true);
  }

  function handleAssignAnother() {
    setSelectedTemplateId("");
    setScheduledDate(getTomorrow());
    setNotes("");
    setTemplateSearch("");
    setAssignmentDone(false);
    setDirection(1);
    setCurrentStep(preselectedClientId ? "template" : "client");
  }

  const formattedDate = scheduledDate
    ? new Date(scheduledDate + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // ── Success screen ────────────────────────────────────────────────────────
  if (assignmentDone) {
    return (
      <div className="max-w-wizard mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="bg-surface border border-border rounded-lg p-10 flex flex-col items-center text-center gap-6 shadow-elevated"
        >
          <div className="w-16 h-16 rounded-full bg-accent-muted border border-accent/30 flex items-center justify-center">
            <Check className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h2 className="text-h2 font-display text-foreground mb-2">Workout Assigned!</h2>
            <p className="text-body text-foreground-secondary">
              {templateTitle} is scheduled for{" "}
              <span className="text-foreground font-medium">{clientName}</span>{" "}
              on{" "}
              <span className="text-foreground font-medium">{formattedDate}</span>.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={handleAssignAnother}
              className="h-10 px-5 bg-surface border border-border text-foreground text-body font-medium rounded-md hover:bg-white/[0.04] hover:border-border-hover transition-colors duration-[120ms] flex items-center gap-2"
            >
              <Dumbbell className="w-4 h-4" />
              Assign Another
            </button>
            <Link
              href={`/trainer/clients/${selectedClientId}`}
              className="h-10 px-5 bg-accent text-accent-foreground text-body font-bold rounded-md hover:bg-accent-strong transition-colors duration-[160ms] flex items-center gap-2"
            >
              View Client
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-wizard mx-auto">
      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="h-1 bg-surface-elevated rounded-pill overflow-hidden">
          <div
            className="h-full bg-accent rounded-pill transition-all duration-[400ms] ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <p className="text-caption text-foreground-tertiary mt-2">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      {/* ── Step content ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
          >

            {/* ── Step 1: Select client ──────────────────────────────────── */}
            {currentStep === "client" && (
              <div>
                {/* Step header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-h2 font-display text-foreground mb-1">Select Client</h2>
                    <p className="text-body text-foreground-secondary">
                      Choose which client to assign a workout to.
                    </p>
                  </div>
                </div>

                {clientLinks.length === 0 ? (
                  <div className="bg-surface border border-border rounded-lg p-10 flex flex-col items-center gap-3 text-center">
                    <User className="w-8 h-8 text-foreground-tertiary" />
                    <p className="text-body font-medium text-foreground">No linked clients</p>
                    <p className="text-body-sm text-foreground-secondary max-w-xs">
                      Link clients to your account before assigning workouts.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {clientLinks.map((link) => {
                      const name = link.profiles?.full_name ?? "Unknown Client";
                      const initials = name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      const isSelected = link.client_id === selectedClientId;
                      return (
                        <button
                          key={link.client_id}
                          onClick={() => setSelectedClientId(link.client_id)}
                          className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all duration-[160ms] ${
                            isSelected
                              ? "bg-accent-muted border-accent/40 shadow-[0_0_0_1px_rgba(163,255,18,0.2)]"
                              : "bg-surface border-border hover:border-border-hover hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-body-sm font-bold text-foreground flex-shrink-0">
                            {initials}
                          </div>
                          <p className="text-body font-medium text-foreground truncate">{name}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Navigation footer */}
                <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border">
                  <button
                    onClick={goNext}
                    disabled={!canAdvanceFromClient()}
                    className="h-10 px-6 bg-accent text-accent-foreground text-body font-bold rounded-md hover:bg-accent-strong disabled:bg-accent-muted disabled:text-accent-foreground/46 disabled:cursor-not-allowed transition-colors duration-[160ms]"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Select template ────────────────────────────────── */}
            {currentStep === "template" && (
              <div>
                {/* Step header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-h2 font-display text-foreground mb-1">Select Template</h2>
                    <p className="text-body text-foreground-secondary">
                      Pick a workout template from your library.
                    </p>
                  </div>
                  {!preselectedClientId && (
                    <button
                      onClick={goPrev}
                      className="h-9 px-3 rounded-sm text-body-sm text-foreground-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors duration-[120ms]"
                    >
                      ← Back
                    </button>
                  )}
                </div>

                {/* Search */}
                <input
                  type="text"
                  placeholder="Search templates…"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full h-11 bg-surface border border-border text-foreground text-body rounded-md px-[14px] mb-4 placeholder:text-foreground-disabled focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] hover:border-border-hover transition-all duration-[160ms]"
                />

                {templates.length === 0 ? (
                  <div className="bg-surface border border-border rounded-lg p-10 flex flex-col items-center gap-3 text-center">
                    <LayoutTemplate className="w-8 h-8 text-foreground-tertiary" />
                    <p className="text-body font-medium text-foreground">No templates yet</p>
                    <p className="text-body-sm text-foreground-secondary max-w-xs">
                      Create workout templates in your library first.
                    </p>
                    <Link
                      href="/trainer/templates"
                      className="mt-2 h-9 px-4 bg-surface border border-border text-foreground text-body font-medium rounded-md hover:bg-white/[0.04] hover:border-border-hover transition-colors duration-[120ms] flex items-center gap-2"
                    >
                      Go to Templates
                    </Link>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <p className="text-body text-foreground-secondary text-center py-8">
                    No templates match your search.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {filteredTemplates.map((template) => {
                      const count = exerciseCounts[template.id] ?? 0;
                      const isSelected = template.id === selectedTemplateId;
                      return (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all duration-[160ms] ${
                            isSelected
                              ? "bg-accent-muted border-accent/40"
                              : "bg-surface border-border hover:border-border-hover hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex-1">
                            <p className="text-body font-medium text-foreground">{template.title}</p>
                            <p className="text-caption text-foreground-tertiary mt-0.5">
                              {count === 0
                                ? "No exercises added"
                                : `${count} exercise${count !== 1 ? "s" : ""}`}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="text-accent">✓</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Navigation footer */}
                <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border">
                  <button
                    onClick={goNext}
                    disabled={!canAdvanceFromTemplate()}
                    className="h-10 px-6 bg-accent text-accent-foreground text-body font-bold rounded-md hover:bg-accent-strong disabled:bg-accent-muted disabled:text-accent-foreground/46 disabled:cursor-not-allowed transition-colors duration-[160ms]"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Pick date + optional notes ────────────────────── */}
            {currentStep === "date" && (
              <div>
                {/* Step header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-h2 font-display text-foreground mb-1">Schedule</h2>
                    <p className="text-body text-foreground-secondary">
                      Choose when this workout should be completed.
                    </p>
                  </div>
                  <button
                    onClick={goPrev}
                    className="h-9 px-3 rounded-sm text-body-sm text-foreground-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors duration-[120ms]"
                  >
                    ← Back
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="max-w-[320px]">
                    <label htmlFor="scheduled-date" className="text-label text-foreground-secondary block mb-2">
                      Scheduled Date
                    </label>
                    <input
                      id="scheduled-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full h-11 bg-surface border border-border text-foreground text-body rounded-md px-[14px] focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] hover:border-border-hover transition-all duration-[160ms] [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="assignment-notes"
                      className="text-label text-foreground-secondary block mb-2"
                    >
                      Notes{" "}
                      <span className="normal-case font-normal text-foreground-tertiary ml-1">
                        — optional
                      </span>
                    </label>
                    <textarea
                      id="assignment-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any cues, targets or reminders for this session…"
                      rows={3}
                      className="w-full bg-surface border border-border text-foreground text-body rounded-md px-[14px] py-3 placeholder:text-foreground-disabled focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] hover:border-border-hover transition-all duration-[160ms] resize-none"
                    />
                  </div>
                </div>

                {/* Navigation footer */}
                <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border">
                  <button
                    onClick={goNext}
                    disabled={!canAdvanceFromDate()}
                    className="h-10 px-6 bg-accent text-accent-foreground text-body font-bold rounded-md hover:bg-accent-strong disabled:bg-accent-muted disabled:text-accent-foreground/46 disabled:cursor-not-allowed transition-colors duration-[160ms]"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: Confirm ───────────────────────────────────────── */}
            {currentStep === "confirm" && (
              <div>
                {/* Step header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-h2 font-display text-foreground mb-1">Confirm Assignment</h2>
                    <p className="text-body text-foreground-secondary">
                      Review the details before assigning.
                    </p>
                  </div>
                  <button
                    onClick={goPrev}
                    className="h-9 px-3 rounded-sm text-body-sm text-foreground-secondary hover:text-foreground hover:bg-white/[0.04] transition-colors duration-[120ms]"
                  >
                    ← Back
                  </button>
                </div>

                {/* Summary card */}
                <div className="bg-surface border border-border rounded-lg p-6 shadow-inset space-y-4">
                  <h3 className="text-h4 font-display text-foreground mb-4">Assignment Summary</h3>
                  {[
                    { label: "Client", value: clientName },
                    { label: "Template", value: templateTitle },
                    { label: "Scheduled", value: formattedDate },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                    >
                      <span className="text-label text-foreground-tertiary">{row.label}</span>
                      <span className="text-body font-medium text-foreground">{row.value}</span>
                    </div>
                  ))}

                  {/* Notes row — only if entered */}
                  {notes.trim() && (
                    <div className="pt-3">
                      <p className="text-label text-foreground-tertiary mb-1.5">Notes</p>
                      <p className="text-body-sm text-foreground-secondary leading-relaxed whitespace-pre-wrap">
                        {notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Navigation footer */}
                <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-border">
                  <button
                    onClick={handleAssign}
                    disabled={isSubmitting}
                    className="h-10 px-6 bg-accent text-accent-foreground text-body font-bold rounded-md hover:bg-accent-strong disabled:bg-accent-muted disabled:cursor-not-allowed transition-colors duration-[160ms] flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Assigning…
                      </>
                    ) : (
                      "Assign Workout"
                    )}
                  </button>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
