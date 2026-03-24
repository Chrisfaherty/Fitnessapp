"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  Dumbbell,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  User,
  LayoutTemplate,
  ClipboardCheck,
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

const stepMeta: Record<Step, { label: string; icon: React.ElementType }> = {
  client: { label: "Client", icon: User },
  template: { label: "Template", icon: LayoutTemplate },
  date: { label: "Date", icon: Calendar },
  confirm: { label: "Confirm", icon: ClipboardCheck },
};

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
  const router = useRouter();
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

  function goTo(step: Step) {
    const newIndex = STEPS.indexOf(step);
    setDirection(newIndex > stepIndex ? 1 : -1);
    setCurrentStep(step);
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

  // ── Success screen ────────────────────────────────────────────────────────
  if (assignmentDone) {
    return (
      <div className="max-w-lg mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="card flex flex-col items-center text-center gap-6 py-14"
        >
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Check className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h2 className="text-subheading mb-1">Workout Assigned!</h2>
            <p className="text-caption">
              {templateTitle} is scheduled for{" "}
              <span className="text-foreground font-medium">{clientName}</span>{" "}
              on{" "}
              <span className="text-foreground font-medium">
                {scheduledDate}
              </span>
              .
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={handleAssignAnother}
              className="btn-secondary"
            >
              <Dumbbell className="w-4 h-4" />
              Assign Another
            </button>
            <Link
              href={`/trainer/clients/${selectedClientId}`}
              className="btn-primary"
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
    <div className="max-w-2xl mx-auto space-y-8">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <p className="text-label mb-1.5">Trainer</p>
        <h1 className="text-display">Assign Workout</h1>
      </motion.div>

      {/* ── Step indicator ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.04 }}
        className="flex items-center gap-0"
      >
        {STEPS.map((step, idx) => {
          const meta = stepMeta[step];
          const Icon = meta.icon;
          const isActive = step === currentStep;
          const isCompleted = STEPS.indexOf(step) < stepIndex;
          return (
            <div key={step} className="flex items-center">
              <button
                onClick={() => {
                  // Only allow navigating to completed steps
                  if (isCompleted) goTo(step);
                }}
                disabled={!isCompleted && !isActive}
                className={[
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-fast",
                  isActive
                    ? "bg-accent/15 text-accent"
                    : isCompleted
                    ? "text-foreground-secondary hover:text-foreground cursor-pointer"
                    : "text-muted cursor-default",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : isCompleted
                      ? "bg-white/10 text-foreground-secondary"
                      : "bg-white/[0.05] text-muted",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                </div>
                <span className="hidden sm:block">{meta.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className="w-6 h-px bg-border mx-1" />
              )}
            </div>
          );
        })}
      </motion.div>

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
            {/* ── Step 1: Select client ──────────────────────────────── */}
            {currentStep === "client" && (
              <div className="card space-y-5">
                <div>
                  <h2 className="text-subheading mb-1">Select Client</h2>
                  <p className="text-caption">
                    Choose which client to assign a workout to.
                  </p>
                </div>

                {clientLinks.length === 0 ? (
                  <div className="empty-state py-10">
                    <User className="w-8 h-8 text-muted" />
                    <p className="text-subheading text-sm">No linked clients</p>
                    <p className="text-caption text-xs max-w-xs">
                      Link clients to your account before assigning workouts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientLinks.map((link) => {
                      const name =
                        link.profiles?.full_name ?? "Unknown Client";
                      const initial = name[0]?.toUpperCase() ?? "?";
                      const isSelected = link.client_id === selectedClientId;
                      return (
                        <button
                          key={link.client_id}
                          onClick={() => setSelectedClientId(link.client_id)}
                          className={[
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-fast text-left",
                            isSelected
                              ? "border-accent/50 bg-accent/[0.07]"
                              : "border-border bg-surface-elevated hover:border-white/20 hover:bg-surface-elevated",
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all",
                              isSelected
                                ? "bg-accent/20 border border-accent/40 text-accent"
                                : "bg-surface border border-border text-foreground-secondary",
                            ].join(" ")}
                          >
                            {initial}
                          </div>
                          <span
                            className={[
                              "font-medium text-sm transition-colors",
                              isSelected ? "text-accent" : "text-foreground",
                            ].join(" ")}
                          >
                            {name}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-accent ml-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={goNext}
                    disabled={!canAdvanceFromClient()}
                    className="btn-primary"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Select template ────────────────────────────── */}
            {currentStep === "template" && (
              <div className="card space-y-5">
                <div>
                  <h2 className="text-subheading mb-1">Select Template</h2>
                  <p className="text-caption">
                    Pick a workout template from your library.
                  </p>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search templates…"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="input pl-9"
                  />
                </div>

                {templates.length === 0 ? (
                  <div className="empty-state py-10">
                    <LayoutTemplate className="w-8 h-8 text-muted" />
                    <p className="text-subheading text-sm">
                      No templates yet
                    </p>
                    <p className="text-caption text-xs max-w-xs">
                      Create workout templates in your library first.
                    </p>
                    <Link
                      href="/trainer/templates"
                      className="btn-secondary mt-2"
                    >
                      Go to Templates
                    </Link>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <p className="text-caption text-center py-6">
                    No templates match your search.
                  </p>
                ) : (
                  <div className="grid gap-2 max-h-[420px] overflow-y-auto pr-1">
                    {filteredTemplates.map((template) => {
                      const count = exerciseCounts[template.id] ?? 0;
                      const isSelected = template.id === selectedTemplateId;
                      return (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={[
                            "w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all duration-fast text-left",
                            isSelected
                              ? "border-accent/50 bg-accent/[0.07]"
                              : "border-border bg-surface-elevated hover:border-white/20",
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                              isSelected
                                ? "bg-accent/20 border border-accent/40"
                                : "bg-surface border border-border",
                            ].join(" ")}
                          >
                            <Dumbbell
                              className={[
                                "w-4 h-4",
                                isSelected
                                  ? "text-accent"
                                  : "text-foreground-secondary",
                              ].join(" ")}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={[
                                "font-semibold text-sm truncate transition-colors",
                                isSelected
                                  ? "text-accent"
                                  : "text-foreground",
                              ].join(" ")}
                            >
                              {template.title}
                            </p>
                            {template.description && (
                              <p className="text-caption text-xs mt-0.5 line-clamp-1">
                                {template.description}
                              </p>
                            )}
                            <p className="text-muted text-xs mt-1">
                              {count === 0
                                ? "No exercises added"
                                : `${count} exercise${count !== 1 ? "s" : ""}`}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-accent flex-shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button onClick={goPrev} className="btn-ghost">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={goNext}
                    disabled={!canAdvanceFromTemplate()}
                    className="btn-primary"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Pick date + optional notes ────────────────── */}
            {currentStep === "date" && (
              <div className="card space-y-5">
                <div>
                  <h2 className="text-subheading mb-1">Schedule</h2>
                  <p className="text-caption">
                    Choose when this workout should be completed.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="scheduled-date"
                      className="block text-label mb-2"
                    >
                      Scheduled Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                      <input
                        id="scheduled-date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="input pl-9 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="assignment-notes"
                      className="block text-label mb-2"
                    >
                      Notes{" "}
                      <span className="normal-case font-normal text-muted ml-1">
                        — optional
                      </span>
                    </label>
                    <textarea
                      id="assignment-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any cues, targets or reminders for this session…"
                      rows={3}
                      className="input resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button onClick={goPrev} className="btn-ghost">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={goNext}
                    disabled={!canAdvanceFromDate()}
                    className="btn-primary"
                  >
                    Review
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: Confirm ────────────────────────────────────── */}
            {currentStep === "confirm" && (
              <div className="card space-y-6">
                <div>
                  <h2 className="text-subheading mb-1">Confirm Assignment</h2>
                  <p className="text-caption">
                    Review the details before assigning.
                  </p>
                </div>

                {/* Summary card */}
                <div className="bg-surface-elevated border border-border rounded-xl divide-y divide-border">
                  {/* Client row */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                      {clientName[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-label mb-0.5">Client</p>
                      <p className="font-semibold text-sm text-foreground">
                        {clientName}
                      </p>
                    </div>
                  </div>

                  {/* Template row */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-4 h-4 text-foreground-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-label mb-0.5">Template</p>
                      <p className="font-semibold text-sm text-foreground truncate">
                        {templateTitle}
                      </p>
                      {selectedTemplate?.description && (
                        <p className="text-caption text-xs mt-0.5 line-clamp-1">
                          {selectedTemplate.description}
                        </p>
                      )}
                    </div>
                    {exerciseCounts[selectedTemplateId] !== undefined && (
                      <span className="badge-neutral flex-shrink-0">
                        {exerciseCounts[selectedTemplateId]}{" "}
                        {exerciseCounts[selectedTemplateId] === 1
                          ? "exercise"
                          : "exercises"}
                      </span>
                    )}
                  </div>

                  {/* Date row */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-foreground-secondary" />
                    </div>
                    <div>
                      <p className="text-label mb-0.5">Scheduled Date</p>
                      <p className="font-semibold text-sm text-foreground">
                        {new Date(scheduledDate + "T00:00:00").toLocaleDateString(
                          undefined,
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Notes row — only if entered */}
                  {notes.trim() && (
                    <div className="px-5 py-4">
                      <p className="text-label mb-1.5">Notes</p>
                      <p className="text-sm text-foreground-secondary leading-relaxed whitespace-pre-wrap">
                        {notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button onClick={goPrev} className="btn-ghost">
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Assigning…
                      </>
                    ) : (
                      <>
                        <Dumbbell className="w-4 h-4" />
                        Assign Workout
                      </>
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
