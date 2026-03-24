"use client";

import { useState } from "react";
import Link from "next/link";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { AssignmentStatus } from "@/types/database";
import {
  Dumbbell,
  ChevronRight,
  Check,
  Clock,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";

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

export function WorkoutDetailClient({
  assignmentId,
  assignmentStatus,
  scheduledDate,
  clientId,
  template,
  exercises,
}: WorkoutDetailClientProps) {
  const supabase = createClientSupabaseClient();

  const [status, setStatus] = useState<AssignmentStatus>(assignmentStatus);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const isCompleted = status === "completed";

  const handleStartWorkout = async () => {
    setIsLogging(true);
    setError(null);

    try {
      // Insert a new workout session
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

      // Mark assignment as completed
      const { error: assignError } = await supabase
        .from("workout_assignments")
        .update({ status: "completed" })
        .eq("id", assignmentId);

      if (assignError) throw assignError;

      setSessionId(session.id);
      setStatus("completed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log workout");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back nav */}
      <Link
        href="/client/workouts"
        className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Workouts
      </Link>

      {/* Header card */}
      <div
        className="card space-y-3"
        style={{ background: "#12131A" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-4 h-4 text-accent flex-shrink-0" />
              <h1 className="text-heading font-bold truncate">{template.title}</h1>
            </div>
            {template.description && (
              <p className="text-body text-foreground/60">{template.description}</p>
            )}
          </div>

          {/* Status badge */}
          {isCompleted ? (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0"
              style={{ background: "rgba(163,255,18,0.15)", color: "#A3FF12" }}
            >
              <Check className="w-3.5 h-3.5" />
              Completed
            </span>
          ) : (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}
            >
              Assigned
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-caption text-foreground/40">
          <span className="flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5" />
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
          </span>
          {scheduledDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(scheduledDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Already-completed banner */}
      {isCompleted && !sessionId && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{
            background: "rgba(163,255,18,0.07)",
            borderColor: "rgba(163,255,18,0.2)",
          }}
        >
          <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#A3FF12" }} />
          <p className="text-sm font-medium" style={{ color: "#A3FF12" }}>
            You already logged this workout. Great work!
          </p>
        </div>
      )}

      {/* Success state after logging */}
      {sessionId && (
        <div
          className="card space-y-3 border"
          style={{
            background: "rgba(163,255,18,0.07)",
            borderColor: "rgba(163,255,18,0.25)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(163,255,18,0.2)" }}
            >
              <Check className="w-5 h-5" style={{ color: "#A3FF12" }} />
            </div>
            <div>
              <p className="font-semibold text-foreground">Workout logged!</p>
              <p className="text-caption text-foreground/50">
                {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} •{" "}
                {exercises.reduce((sum, e) => sum + e.target_sets, 0)} total sets
              </p>
            </div>
          </div>
          <Link
            href="/client/workouts"
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Workouts
          </Link>
        </div>
      )}

      {/* Exercise list */}
      <section className="space-y-3">
        <h2 className="text-label font-semibold text-foreground/70 uppercase tracking-widest text-xs">
          Exercises
        </h2>

        {exercises.length === 0 ? (
          <div
            className="card text-center py-12"
            style={{ background: "#12131A" }}
          >
            <Dumbbell className="w-8 h-8 mx-auto mb-3 text-foreground/20" />
            <p className="text-body text-foreground/40">No exercises in this workout.</p>
          </div>
        ) : (
          exercises.map((te, idx) => (
            <div
              key={te.id}
              className="card space-y-4"
              style={{ background: "#12131A" }}
            >
              {/* Exercise header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Index badge */}
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                    style={{ background: "rgba(163,255,18,0.15)", color: "#A3FF12" }}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground leading-tight">
                      {te.exercise.name}
                    </h3>
                    <p className="text-caption text-foreground/50 capitalize mt-0.5">
                      {te.exercise.category}
                    </p>
                  </div>
                </div>

                {/* Equipment badge */}
                {te.exercise.equipment && (
                  <span
                    className="flex-shrink-0 px-2 py-0.5 rounded-md text-[11px] font-medium capitalize"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    {te.exercise.equipment}
                  </span>
                )}
              </div>

              {/* Sets × reps, rest */}
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-bold tabular-nums" style={{ color: "#A3FF12" }}>
                    {te.target_sets}
                  </span>
                  <span className="text-foreground/40 text-sm">sets</span>
                  <ChevronRight className="w-3.5 h-3.5 text-foreground/20 mx-0.5" />
                  <span className="text-2xl font-mono font-bold tabular-nums" style={{ color: "#A3FF12" }}>
                    {te.rep_min === te.rep_max
                      ? te.rep_min
                      : `${te.rep_min}–${te.rep_max}`}
                  </span>
                  <span className="text-foreground/40 text-sm">reps</span>
                </div>

                <div className="flex items-center gap-1 text-foreground/50 text-sm">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{formatRest(te.rest_seconds)} rest</span>
                </div>
              </div>

              {/* Primary muscles */}
              {te.exercise.primary_muscles.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {te.exercise.primary_muscles.map((muscle) => (
                    <span
                      key={muscle}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize"
                      style={{
                        background: "rgba(163,255,18,0.1)",
                        color: "#A3FF12",
                      }}
                    >
                      {muscle}
                    </span>
                  ))}
                </div>
              )}

              {/* Coaching notes */}
              {te.notes && (
                <p
                  className="text-sm italic border-l-2 pl-3"
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    borderColor: "rgba(163,255,18,0.3)",
                  }}
                >
                  {te.notes}
                </p>
              )}
            </div>
          ))
        )}
      </section>

      {/* CTA — only show if not yet completed */}
      {!isCompleted && (
        <div className="sticky bottom-6 pt-2">
          {error && (
            <p className="text-sm text-red-400 mb-2 text-center">{error}</p>
          )}
          <button
            onClick={handleStartWorkout}
            disabled={isLogging}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base font-bold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "#A3FF12", color: "#0B0C10" }}
          >
            {isLogging ? (
              <>
                <RotateCcw className="w-5 h-5 animate-spin" />
                Logging…
              </>
            ) : (
              <>
                <Dumbbell className="w-5 h-5" />
                Start Workout
              </>
            )}
          </button>
        </div>
      )}

      {/* Bottom breathing room */}
      <div className="h-8" />
    </div>
  );
}
