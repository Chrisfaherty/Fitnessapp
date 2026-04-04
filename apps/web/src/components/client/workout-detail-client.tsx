"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { AssignmentStatus } from "@/types/database";
import { ArrowLeft, Check } from "lucide-react";

interface ExerciseDetail {
  id: string;
  name: string;
  category: string;
  level: string;
  primary_muscles: string[];
  equipment: string | null;
}

interface TemplateExerciseRow {
  id: string;
  sort_order: number;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rest_seconds: number;
  notes: string | null;
  exercise: ExerciseDetail;
}

interface WorkoutDetailClientProps {
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  scheduledDate: string | null;
  clientId: string;
  template: {
    id: string;
    title: string;
    description: string | null;
  };
  exercises: TemplateExerciseRow[];
}

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Types for active session state
// ---------------------------------------------------------------------------

interface CompletedSet {
  exerciseIdx: number;
  setNumber: number;
  reps: number;
  weightKg: number | null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: AssignmentStatus }) {
  if (status === "completed") {
    return (
      <span className="bg-accent-muted border border-accent/24 text-accent text-caption px-3 py-1 rounded-pill">
        Completed
      </span>
    );
  }
  return (
    <span className="bg-surface-elevated border border-border text-foreground-secondary text-caption px-3 py-1 rounded-pill">
      Assigned
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pre-session exercise card
// ---------------------------------------------------------------------------

function ExerciseCard({ te }: { te: TemplateExerciseRow }) {
  const sets = Array.from({ length: te.target_sets }, (_, i) => i + 1);

  return (
    <div className="bg-surface border border-border rounded-lg p-5 shadow-inset space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-h4 font-display text-foreground">{te.exercise.name}</h3>
        <span className="text-caption text-foreground-tertiary">{te.target_sets} sets</span>
      </div>

      <div className="space-y-2">
        {sets.map((n) => (
          <div
            key={n}
            className="flex items-center gap-4 text-body-sm text-foreground-secondary"
          >
            <span className="text-label text-foreground-tertiary w-8">SET {n}</span>
            <span>
              {te.rep_min === te.rep_max
                ? `${te.rep_min} reps`
                : `${te.rep_min}–${te.rep_max} reps`}
            </span>
            <span className="ml-auto text-foreground-tertiary">{formatRest(te.rest_seconds)} rest</span>
          </div>
        ))}
      </div>

      {te.notes && (
        <p className="text-body-sm text-foreground-tertiary italic border-l-2 border-accent/30 pl-3">
          {te.notes}
        </p>
      )}

      {te.exercise.primary_muscles.length > 0 && (
        <div className="flex gap-1.5 flex-wrap pt-1">
          {te.exercise.primary_muscles.map((muscle) => (
            <span
              key={muscle}
              className="bg-accent-muted text-accent text-caption px-2 py-0.5 rounded-sm capitalize"
            >
              {muscle}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WorkoutDetailClient({
  assignmentId,
  assignmentStatus,
  scheduledDate,
  clientId,
  template,
  exercises,
}: WorkoutDetailClientProps) {
  const supabase = createClientSupabaseClient();

  // ---- pre-session state ----
  const [status, setStatus] = useState<AssignmentStatus>(assignmentStatus);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ---- active session state ----
  const [sessionActive, setSessionActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetNumber, setCurrentSetNumber] = useState(1);
  const [repsInput, setRepsInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [completedSets, setCompletedSets] = useState<CompletedSet[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCompleted = status === "completed";

  // ---- timer ----
  useEffect(() => {
    if (sessionActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionActive]);

  // ---- start workout ----
  const handleStartWorkout = async () => {
    setError(null);
    try {
      const { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .insert({
          client_id: clientId,
          template_id: template.id,
          assignment_id: assignmentId,
          performed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("Failed to create workout session");

      setSessionId(session.id);
      setSessionActive(true);
      setCurrentExerciseIdx(0);
      setCurrentSetNumber(1);

      // Pre-fill reps with the rep_min of the first exercise
      if (exercises.length > 0) {
        setRepsInput(String(exercises[0].rep_min));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start workout");
    }
  };

  // ---- complete a set ----
  const handleCompleteSet = async () => {
    if (!sessionId) return;
    const currentExercise = exercises[currentExerciseIdx];
    if (!currentExercise) return;

    const reps = parseInt(repsInput, 10);
    if (isNaN(reps) || reps <= 0) {
      setError("Enter a valid rep count.");
      return;
    }
    const weightKg = weightInput ? parseFloat(weightInput) : null;
    if (weightInput && isNaN(weightKg as number)) {
      setError("Enter a valid weight.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Insert the set record
      const { error: setError } = await supabase
        .from("workout_session_sets")
        .insert({
          session_id: sessionId,
          exercise_id: currentExercise.exercise.id,
          set_number: currentSetNumber,
          reps,
          weight_kg: weightKg,
          completed_at: new Date().toISOString(),
        });

      if (setError) throw setError;

      const newCompleted: CompletedSet = {
        exerciseIdx: currentExerciseIdx,
        setNumber: currentSetNumber,
        reps,
        weightKg,
      };
      setCompletedSets((prev) => [...prev, newCompleted]);

      // Advance to next set or next exercise
      if (currentSetNumber < currentExercise.target_sets) {
        const nextSet = currentSetNumber + 1;
        setCurrentSetNumber(nextSet);
        setRepsInput(String(currentExercise.rep_min));
        setWeightInput(weightInput); // keep weight for convenience
      } else {
        const nextIdx = currentExerciseIdx + 1;
        if (nextIdx < exercises.length) {
          setCurrentExerciseIdx(nextIdx);
          setCurrentSetNumber(1);
          setRepsInput(String(exercises[nextIdx].rep_min));
          setWeightInput("");
        } else {
          // All exercises done — end session
          await finishSession();
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save set");
    } finally {
      setIsSaving(false);
    }
  };

  // ---- end session (either manually or when all sets done) ----
  const finishSession = async () => {
    setSessionActive(false);

    try {
      const { error: assignError } = await supabase
        .from("workout_assignments")
        .update({ status: "completed" })
        .eq("id", assignmentId);

      if (assignError) throw assignError;

      setStatus("completed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete workout");
    }
  };

  const handleEndWorkout = async () => {
    await finishSession();
  };

  // ---- derived data for active session view ----
  const currentExercise = exercises[currentExerciseIdx];

  const completedSetsForCurrent = completedSets.filter(
    (s) => s.exerciseIdx === currentExerciseIdx
  );

  const upcomingExercises = exercises.slice(currentExerciseIdx + 1);

  // ---- render ----
  return (
    <div className="max-w-2xl mx-auto">
      {/* Back nav */}
      <Link
        href="/client/workouts"
        className="inline-flex items-center gap-1.5 text-body-sm text-foreground-secondary hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Workouts
      </Link>

      {/* ------------------------------------------------------------------ */}
      {/* ACTIVE SESSION VIEW                                                  */}
      {/* ------------------------------------------------------------------ */}
      {sessionActive && currentExercise && (
        <div>
          {/* Zone 1 — Top utility bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-h4 font-display text-foreground">{template.title}</h2>
              <p className="text-caption text-foreground-tertiary">{formatElapsed(elapsedSeconds)}</p>
            </div>
            <button
              onClick={handleEndWorkout}
              className="h-9 px-3 rounded-sm text-body-sm text-foreground-secondary hover:text-danger hover:bg-danger-muted transition-colors duration-[120ms]"
            >
              End Workout
            </button>
          </div>

          {/* Zone 2 — Active exercise card */}
          <div className="bg-surface border border-accent/28 shadow-[0_0_0_1px_rgba(163,255,18,0.16)] rounded-lg p-5 mb-6">
            <p className="text-label text-foreground-tertiary mb-1">
              NOW · SET {currentSetNumber} OF {currentExercise.target_sets}
            </p>
            <h2 className="text-h2 font-display text-foreground mb-4">
              {currentExercise.exercise.name}
            </h2>

            {/* Set input row */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1">
                <p className="text-label text-foreground-tertiary mb-1.5">REPS</p>
                <input
                  type="number"
                  value={repsInput}
                  onChange={(e) => setRepsInput(e.target.value)}
                  className="w-full h-11 bg-background border border-border rounded-md px-[14px] text-h4 font-display text-foreground text-center focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)]"
                  min={1}
                />
              </div>
              <div className="flex-1">
                <p className="text-label text-foreground-tertiary mb-1.5">WEIGHT (kg)</p>
                <input
                  type="number"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="—"
                  className="w-full h-11 bg-background border border-border rounded-md px-[14px] text-h4 font-display text-foreground text-center focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)]"
                  min={0}
                  step={0.5}
                />
              </div>
            </div>

            {error && (
              <p className="text-body-sm text-danger mb-3 text-center">{error}</p>
            )}

            <button
              onClick={handleCompleteSet}
              disabled={isSaving}
              className="w-full h-10 bg-accent text-accent-foreground text-[14px] font-bold rounded-md hover:bg-accent-strong transition-colors duration-[160ms] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving…" : "Complete Set"}
            </button>
          </div>

          {/* Zone 3 — Completed sets */}
          {completedSetsForCurrent.length > 0 && (
            <div className="space-y-2 mb-6">
              {completedSetsForCurrent.map((set) => (
                <div
                  key={`${set.exerciseIdx}-${set.setNumber}`}
                  className="flex items-center gap-3 h-12 px-4 bg-success-muted border border-success/20 rounded-md"
                >
                  <span className="text-label text-success w-8">
                    <Check className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" />
                    {set.setNumber}
                  </span>
                  <span className="text-body text-foreground">
                    {set.reps} reps
                    {set.weightKg !== null ? ` @ ${set.weightKg}kg` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Zone 3 — Upcoming exercises */}
          {upcomingExercises.length > 0 && (
            <div className="opacity-50">
              <p className="text-label text-foreground-tertiary mb-3">NEXT UP</p>
              {upcomingExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center gap-3 h-12 px-4 bg-surface border border-border rounded-md mb-2"
                >
                  <span className="text-body text-foreground-secondary">{ex.exercise.name}</span>
                  <span className="text-caption text-foreground-tertiary ml-auto">
                    {ex.target_sets} sets
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* POST-SESSION / PRE-SESSION VIEW                                       */}
      {/* ------------------------------------------------------------------ */}
      {!sessionActive && (
        <>
          {/* Page header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-h1 font-display text-foreground mb-1">{template.title}</h1>
              <p className="text-body text-foreground-secondary">
                {scheduledDate
                  ? new Date(scheduledDate).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "No date set"}{" "}
                · {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Already-completed banner */}
          {isCompleted && !sessionId && (
            <div className="flex items-center gap-3 px-4 py-3 bg-accent-muted border border-accent/24 rounded-lg mb-6">
              <Check className="w-4 h-4 text-accent flex-shrink-0" />
              <p className="text-body-sm font-medium text-accent">
                You already logged this workout. Great work!
              </p>
            </div>
          )}

          {/* Post-log success state */}
          {sessionId && isCompleted && (
            <div className="bg-accent-muted border border-accent/24 rounded-lg p-5 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-body font-semibold text-foreground">Workout complete!</p>
                  <p className="text-caption text-foreground-secondary">
                    {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} ·{" "}
                    {exercises.reduce((sum, e) => sum + e.target_sets, 0)} total sets ·{" "}
                    {formatElapsed(elapsedSeconds)}
                  </p>
                </div>
              </div>
              <Link
                href="/client/workouts"
                className="inline-flex items-center gap-2 text-body-sm text-foreground-secondary hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Workouts
              </Link>
            </div>
          )}

          {/* Exercise list */}
          {exercises.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-12 text-center">
              <p className="text-body text-foreground-tertiary">No exercises in this workout.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {exercises.map((te) => (
                <ExerciseCard key={te.id} te={te} />
              ))}
            </div>
          )}

          {/* Start Workout CTA */}
          {!isCompleted && (
            <div className="sticky bottom-6 pt-2">
              {error && (
                <p className="text-body-sm text-danger mb-2 text-center">{error}</p>
              )}
              <button
                onClick={handleStartWorkout}
                className="w-full h-11 bg-accent text-accent-foreground text-[14px] font-bold font-sans rounded-md hover:bg-accent-strong transition-colors duration-[160ms] mt-6"
              >
                Start Workout
              </button>
            </div>
          )}

          <div className="h-8" />
        </>
      )}
    </div>
  );
}
