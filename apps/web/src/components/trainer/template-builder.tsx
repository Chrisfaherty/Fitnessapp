"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  Search,
  GripVertical,
  Plus,
  Save,
  ChevronRight,
  Trash2,
  X,
  Loader2,
  Dumbbell,
} from "lucide-react";

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

  // ── Template state ──────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // ── Exercise library state ──────────────────────────────────
  const [libraryExercises, setLibraryExercises] = useState<Exercise[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryLoading, setLibraryLoading] = useState(true);

  // Fetch library on mount
  useEffect(() => {
    supabase
      .from("exercises")
      .select("id, name, category, primary_muscles, equipment")
      .order("name")
      .then(({ data }) => {
        setLibraryExercises(data ?? []);
        setLibraryLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLibrary = libraryExercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
      ex.category.toLowerCase().includes(librarySearch.toLowerCase())
  );

  const isAlreadyAdded = (id: string) =>
    exercises.some((e) => e.exercise.id === id);

  // ── Exercise actions ────────────────────────────────────────
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
    toast.success(`${ex.name} added`, { duration: 1200 });
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

  // ── Save ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { toast.error("Template needs a title"); return; }
    if (exercises.length === 0) { toast.error("Add at least one exercise"); return; }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: template, error: tErr } = await supabase
        .from("workout_templates")
        .upsert({
          id: templateId,
          trainer_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      if (templateId) {
        await supabase
          .from("workout_template_exercises")
          .delete()
          .eq("template_id", templateId);
      }

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

      const { error: exErr } = await supabase
        .from("workout_template_exercises")
        .insert(rows);
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
    /*
      Fixed full-viewport layout that escapes the dashboard's max-w container.
      - Mobile: starts below the 56px top bar (top-14), full width
      - Desktop: starts at 0 vertically, offset left-60 to clear the sidebar
    */
    <div className="fixed top-14 lg:top-0 left-0 lg:left-60 right-0 bottom-0 z-10 flex bg-background overflow-hidden">

      {/* ── LEFT: Exercise Library panel ─────────────────────── */}
      <aside className="w-72 border-r border-border bg-surface flex flex-col flex-shrink-0">

        {/* Panel header */}
        <div className="px-5 pt-6 pb-4 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground mb-3">
            Exercise Library
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search exercises…"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              className="w-full bg-background border border-border rounded-lg py-2 pl-9 pr-8 text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-muted"
            />
            {librarySearch && (
              <button
                onClick={() => setLibrarySearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {libraryLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-muted animate-spin" />
            </div>
          ) : filteredLibrary.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted">No exercises found</p>
              {librarySearch && (
                <button
                  onClick={() => setLibrarySearch("")}
                  className="mt-2 text-xs text-accent hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filteredLibrary.map((ex) => {
              const added = isAlreadyAdded(ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => !added && addExercise(ex)}
                  disabled={added}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors duration-fast
                    ${added
                      ? "opacity-35 cursor-default"
                      : "hover:bg-white/[0.05] cursor-pointer"
                    }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate leading-tight">
                      {ex.name}
                    </p>
                    <p className="text-[11px] text-muted truncate capitalize mt-0.5">
                      {ex.category}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {added ? (
                      <span className="text-[10px] text-accent font-semibold">✓</span>
                    ) : (
                      <Plus className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer count */}
        <div className="px-5 py-3 border-t border-border flex-shrink-0">
          <p className="text-[10px] text-muted text-center">
            {filteredLibrary.length.toLocaleString()} exercise{filteredLibrary.length !== 1 ? "s" : ""}
          </p>
        </div>
      </aside>

      {/* ── RIGHT: Builder canvas ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">

          {/* Header row */}
          <div className="flex items-start justify-between mb-8">
            <div className="min-w-0 flex-1">
              <nav className="flex items-center gap-1.5 text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">
                <span>Templates</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground-secondary truncate">
                  {title || "New Template"}
                </span>
              </nav>
              <h1 className="text-4xl font-bold tracking-tighter text-foreground leading-none">
                {title ? title : <span className="text-muted font-normal italic">Untitled</span>}
              </h1>
            </div>

            {/* Save — pill button per Gemini spec */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="ml-6 flex-shrink-0 flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSaving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />
              }
              {isSaving ? "Saving…" : "Save Template"}
            </button>
          </div>

          {/* Template meta — underline-style inputs */}
          <div className="space-y-4 mb-10">
            <div>
              <label className="text-label mb-1.5 block">Template name</label>
              <input
                className="w-full bg-transparent border-b border-border text-xl font-semibold text-foreground placeholder:text-muted focus:outline-none focus:border-accent/60 py-2 transition-colors"
                placeholder="e.g. Day 1 — Heavy Pull"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-label mb-1.5 block">Description (optional)</label>
              <input
                className="w-full bg-transparent border-b border-border text-sm text-foreground-secondary placeholder:text-muted focus:outline-none focus:border-accent/60 py-2 transition-colors"
                placeholder="Client-facing notes about this program…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Exercise count label */}
          {exercises.length > 0 && (
            <p className="text-label mb-4">
              {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Drag-and-drop exercise sequence */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="exercises">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  <AnimatePresence mode="popLayout">
                    {exercises.map((ex, idx) => (
                      <Draggable
                        key={ex.localId}
                        draggableId={ex.localId}
                        index={idx}
                      >
                        {(drag, snapshot) => (
                          <div ref={drag.innerRef} {...drag.draggableProps}>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -16, scale: 0.97 }}
                              transition={{ type: "spring", stiffness: 300, damping: 28 }}
                              className={`relative group bg-surface border rounded-2xl p-6 transition-all duration-fast
                                ${snapshot.isDragging
                                  ? "border-accent/40 shadow-glow scale-[1.01] cursor-grabbing"
                                  : "border-border hover:bg-surface-elevated hover:border-white/15"
                                }`}
                            >
                              {/* Drag handle — appears on group hover */}
                              <div
                                {...drag.dragHandleProps}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted p-1"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <div className="ml-6">
                                {/* Exercise name + remove */}
                                <div className="flex items-start justify-between mb-5">
                                  <div>
                                    <h3 className="font-semibold text-foreground leading-tight">
                                      {ex.exercise.name}
                                    </h3>
                                    <p className="text-xs text-muted mt-0.5 capitalize">
                                      {ex.exercise.primary_muscles?.join(", ") || ex.exercise.category}
                                      {ex.exercise.equipment ? ` · ${ex.exercise.equipment}` : ""}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => removeExercise(ex.localId)}
                                    className="text-muted hover:text-danger transition-colors p-1 -mr-1 opacity-0 group-hover:opacity-100 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Sets / Reps / Rest / Notes row */}
                                <div className="flex items-end gap-8 flex-wrap">

                                  {/* Sets */}
                                  <div className="space-y-0.5">
                                    <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">Sets</p>
                                    <input
                                      type="number"
                                      min={1} max={10}
                                      value={ex.targetSets}
                                      onChange={(e) =>
                                        updateExercise(ex.localId, {
                                          targetSets: Math.max(1, Math.min(10, Number(e.target.value))),
                                        })
                                      }
                                      className="bg-transparent w-14 text-2xl font-mono font-bold text-accent focus:outline-none border-b border-border hover:border-accent/50 focus:border-accent transition-colors pb-0.5 tabular-nums"
                                    />
                                  </div>

                                  {/* Reps */}
                                  <div className="space-y-0.5">
                                    <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">Reps</p>
                                    <div className="flex items-baseline gap-1.5">
                                      <input
                                        type="number"
                                        min={1} max={100}
                                        value={ex.repMin}
                                        onChange={(e) =>
                                          updateExercise(ex.localId, {
                                            repMin: Math.max(1, Math.min(100, Number(e.target.value))),
                                          })
                                        }
                                        className="bg-transparent w-12 text-2xl font-mono font-bold text-accent focus:outline-none border-b border-border hover:border-accent/50 focus:border-accent transition-colors pb-0.5 tabular-nums"
                                      />
                                      <span className="text-muted text-lg">–</span>
                                      <input
                                        type="number"
                                        min={1} max={100}
                                        value={ex.repMax}
                                        onChange={(e) =>
                                          updateExercise(ex.localId, {
                                            repMax: Math.max(1, Math.min(100, Number(e.target.value))),
                                          })
                                        }
                                        className="bg-transparent w-12 text-2xl font-mono font-bold text-accent focus:outline-none border-b border-border hover:border-accent/50 focus:border-accent transition-colors pb-0.5 tabular-nums"
                                      />
                                    </div>
                                  </div>

                                  {/* Rest */}
                                  <div className="space-y-0.5">
                                    <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">Rest</p>
                                    <select
                                      value={ex.restSeconds}
                                      onChange={(e) =>
                                        updateExercise(ex.localId, { restSeconds: Number(e.target.value) })
                                      }
                                      className="bg-transparent text-2xl font-mono font-bold text-foreground focus:outline-none cursor-pointer border-b border-border hover:border-accent/50 transition-colors pb-0.5 pr-1 appearance-none"
                                    >
                                      {[30, 60, 90, 120, 180, 240, 300].map((s) => (
                                        <option key={s} value={s} className="bg-surface text-foreground">
                                          {s}s
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Notes */}
                                  <div className="flex-1 min-w-[120px] space-y-0.5">
                                    <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">Coach note</p>
                                    <input
                                      className="w-full bg-transparent text-sm text-foreground-secondary placeholder:text-muted border-b border-border hover:border-accent/40 focus:border-accent focus:outline-none transition-colors pb-0.5"
                                      placeholder="e.g. pause at bottom…"
                                      value={ex.notes}
                                      onChange={(e) =>
                                        updateExercise(ex.localId, { notes: e.target.value })
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>

                  {provided.placeholder}

                  {/* Empty drop zone */}
                  {exercises.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-2 border-dashed border-border rounded-2xl p-16 flex flex-col items-center justify-center text-center hover:border-accent/30 transition-colors"
                    >
                      <Dumbbell className="w-8 h-8 text-muted opacity-30 mb-3" />
                      <p className="text-sm font-medium text-muted">
                        Select an exercise from the library
                      </p>
                      <p className="text-xs text-muted opacity-60 mt-1">
                        Or search by name or category on the left
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Bottom breathing room */}
          <div className="h-24" />
        </div>
      </main>
    </div>
  );
}
