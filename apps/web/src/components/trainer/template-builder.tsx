"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ExercisePickerModal } from "./exercise-picker-modal";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Exercise {
  id: string;
  name: string;
  category: string;
  primary_muscles: string[];
  equipment: string | null;
}

interface TemplateExercise {
  localId: string;
  exercise: Exercise;
  targetSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  notes: string;
}

export function TemplateBuilder({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addExercise = useCallback((ex: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        exercise: ex,
        targetSets: 3,
        repMin: 8,
        repMax: 12,
        restSeconds: 90,
        notes: "",
      },
    ]);
    setPickerOpen(false);
  }, []);

  const removeExercise = (localId: string) =>
    setExercises((prev) => prev.filter((e) => e.localId !== localId));

  const updateExercise = (localId: string, patch: Partial<TemplateExercise>) =>
    setExercises((prev) =>
      prev.map((e) => (e.localId === localId ? { ...e, ...patch } : e))
    );

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(exercises);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setExercises(items);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Template needs a title"); return; }
    if (exercises.length === 0) { toast.error("Add at least one exercise"); return; }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upsert template
      const { data: template, error: tErr } = await supabase
        .from("workout_templates")
        .upsert({ id: templateId, trainer_id: user.id, title: title.trim(), description: description.trim() || null })
        .select()
        .single();
      if (tErr) throw tErr;

      // Delete existing exercises if editing
      if (templateId) {
        await supabase.from("workout_template_exercises").delete().eq("template_id", templateId);
      }

      // Insert exercises
      const rows = exercises.map((e, idx) => ({
        template_id: template.id,
        exercise_id: e.exercise.id,
        sort_order: idx,
        target_sets: e.targetSets,
        rep_min: e.repMin,
        rep_max: e.repMax,
        rest_seconds: e.restSeconds,
        notes: e.notes || null,
      }));

      const { error: exErr } = await supabase.from("workout_template_exercises").insert(rows);
      if (exErr) throw exErr;

      toast.success("Template saved!");
      router.push("/trainer/templates");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-heading">{templateId ? "Edit Template" : "New Template"}</h1>
        <p className="text-caption mt-1">Build a workout to assign to clients.</p>
      </div>

      {/* Title + Description */}
      <div className="card space-y-4">
        <div className="space-y-1.5">
          <label className="text-label">Template Name</label>
          <input
            className="input"
            placeholder="e.g. Full Body Strength A"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-label">Description (optional)</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Notes for the client about this program…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Exercises */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-subheading">Exercises ({exercises.length})</h2>
          <button className="btn-secondary text-sm" onClick={() => setPickerOpen(true)}>
            + Add Exercise
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="exercises">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {exercises.length === 0 && (
                  <div className="card text-center py-10 border-dashed">
                    <p className="text-foreground-secondary">
                      No exercises yet — click "Add Exercise" to pick from the library.
                    </p>
                  </div>
                )}
                {exercises.map((ex, idx) => (
                  <Draggable key={ex.localId} draggableId={ex.localId} index={idx}>
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`card-compact transition-shadow ${snapshot.isDragging ? "shadow-lg border-accent/30" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag handle */}
                          <div
                            {...drag.dragHandleProps}
                            className="mt-1 text-foreground-secondary cursor-grab active:cursor-grabbing"
                            title="Drag to reorder"
                          >
                            ⠿
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-foreground">{ex.exercise.name}</p>
                                <p className="text-caption">
                                  {ex.exercise.primary_muscles.join(", ")} · {ex.exercise.equipment ?? "bodyweight"}
                                </p>
                              </div>
                              <button
                                onClick={() => removeExercise(ex.localId)}
                                className="btn-icon text-danger/70 hover:text-danger"
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Config row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <NumberField
                                label="Sets"
                                value={ex.targetSets}
                                min={1} max={10}
                                onChange={(v) => updateExercise(ex.localId, { targetSets: v })}
                              />
                              <NumberField
                                label="Rep Min"
                                value={ex.repMin}
                                min={1} max={100}
                                onChange={(v) => updateExercise(ex.localId, { repMin: v })}
                              />
                              <NumberField
                                label="Rep Max"
                                value={ex.repMax}
                                min={1} max={100}
                                onChange={(v) => updateExercise(ex.localId, { repMax: v })}
                              />
                              <div className="space-y-1">
                                <label className="text-label">Rest (s)</label>
                                <select
                                  className="input"
                                  value={ex.restSeconds}
                                  onChange={(e) => updateExercise(ex.localId, { restSeconds: Number(e.target.value) })}
                                >
                                  {[30, 60, 90, 120, 180, 240, 300].map((s) => (
                                    <option key={s} value={s}>{s}s</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Notes */}
                            <input
                              className="input text-sm"
                              placeholder="Notes (optional)…"
                              value={ex.notes}
                              onChange={(e) => updateExercise(ex.localId, { notes: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Save */}
      <div className="flex gap-3">
        <button
          className="btn-primary flex-1"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save Template"}
        </button>
        <button className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
      </div>

      <ExercisePickerModal
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
        selectedIds={exercises.map((e) => e.exercise.id)}
      />
    </div>
  );
}

function NumberField({
  label, value, min, max, onChange,
}: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-label">{label}</label>
      <input
        type="number"
        className="input"
        value={value}
        min={min} max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
      />
    </div>
  );
}
