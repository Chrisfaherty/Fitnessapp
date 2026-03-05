"use client";

import { useState, useEffect, useCallback } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { useDebounce } from "@/lib/utils/use-debounce";

interface Exercise {
  id: string;
  name: string;
  category: string;
  primary_muscles: string[];
  equipment: string | null;
  level: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  selectedIds?: string[];
}

const CATEGORIES = ["All", "strength", "stretching", "plyometrics", "cardio", "powerlifting"];
const MUSCLES = ["All", "chest", "back", "shoulders", "biceps", "triceps", "quadriceps", "hamstrings", "glutes", "calves", "abdominals"];

export function ExercisePickerModal({ isOpen, onClose, onSelect, selectedIds = [] }: Props) {
  const supabase = createClientSupabaseClient();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [muscle, setMuscle] = useState("All");
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const fetchExercises = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("exercises")
        .select("id, name, category, primary_muscles, equipment, level")
        .order("name")
        .limit(100);

      if (debouncedSearch) {
        query = query.ilike("name", `%${debouncedSearch}%`);
      }
      if (category !== "All") {
        query = query.eq("category", category);
      }
      if (muscle !== "All") {
        query = query.contains("primary_muscles", [muscle]);
      }

      const { data } = await query;
      setExercises(data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, category, muscle]);

  useEffect(() => {
    if (isOpen) fetchExercises();
  }, [isOpen, fetchExercises]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-lg overflow-hidden border border-border animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <h2 className="text-subheading flex-1">Exercise Library</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Search + filters */}
        <div className="p-4 border-b border-border space-y-3">
          <input
            className="input"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MUSCLES.map((m) => (
              <button
                key={m}
                onClick={() => setMuscle(m)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  muscle === m
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-elevated text-foreground-secondary hover:text-foreground border border-border"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-12 text-foreground-secondary">No exercises found.</div>
          ) : (
            <div className="divide-y divide-border">
              {exercises.map((ex) => {
                const isSelected = selectedIds.includes(ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => !isSelected && onSelect(ex)}
                    disabled={isSelected}
                    className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
                      isSelected
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-surface-elevated"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-lg shrink-0">
                      {categoryIcon(ex.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{ex.name}</p>
                      <p className="text-caption truncate">
                        {ex.primary_muscles.join(", ")} · {ex.equipment ?? "bodyweight"} · {ex.level}
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="badge-neutral shrink-0">Added</span>
                    ) : (
                      <span className="text-accent font-bold text-lg shrink-0">+</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function categoryIcon(cat: string): string {
  const icons: Record<string, string> = {
    strength: "🏋️", plyometrics: "⚡", cardio: "🏃", stretching: "🧘", powerlifting: "💪"
  };
  return icons[cat] ?? "💪";
}
