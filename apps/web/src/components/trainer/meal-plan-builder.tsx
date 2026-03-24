"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
  UtensilsCrossed,
  CalendarDays,
  User,
  CheckCircle2,
  X,
} from "lucide-react";
import type { Database } from "@/types/database";

// ── Types ────────────────────────────────────────────────────────────────────

type MealPlanInsert = Database["public"]["Tables"]["meal_plans"]["Insert"];
type MealPlanDayInsert = Database["public"]["Tables"]["meal_plan_days"]["Insert"];

interface LinkedClient {
  id: string;
  full_name: string;
}

interface MealEntry {
  localId: string;
  meal_name: string;
  description: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
}

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// day_of_week: Mon=1 … Sat=6, Sun=0 — display Mon→Sun
const DAYS: { label: string; dayOfWeek: DayIndex }[] = [
  { label: "Mon", dayOfWeek: 1 },
  { label: "Tue", dayOfWeek: 2 },
  { label: "Wed", dayOfWeek: 3 },
  { label: "Thu", dayOfWeek: 4 },
  { label: "Fri", dayOfWeek: 5 },
  { label: "Sat", dayOfWeek: 6 },
  { label: "Sun", dayOfWeek: 0 },
];

const MEAL_PRESETS = ["Breakfast", "Lunch", "Dinner", "Snack", "Pre-Workout", "Post-Workout", "Custom"];

// ── Step indicator ───────────────────────────────────────────────────────────

function StepDot({ active, done, label, step }: { active: boolean; done: boolean; label: string; step: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-fast
          ${done
            ? "bg-accent text-accent-foreground"
            : active
              ? "bg-accent/20 text-accent border border-accent/50"
              : "bg-white/[0.06] text-muted border border-border"
          }`}
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <span
        className={`text-[10px] uppercase tracking-widest font-semibold transition-colors duration-fast
          ${active ? "text-accent" : done ? "text-foreground-secondary" : "text-muted"}`}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ done }: { done: boolean }) {
  return (
    <div
      className={`flex-1 h-px mt-[-12px] transition-colors duration-fast
        ${done ? "bg-accent/40" : "bg-border"}`}
    />
  );
}

// ── Inline add-meal form ─────────────────────────────────────────────────────

interface AddMealFormProps {
  onAdd: (entry: Omit<MealEntry, "localId">) => void;
  onCancel: () => void;
}

function AddMealForm({ onAdd, onCancel }: AddMealFormProps) {
  const [meal_name, setMealName] = useState("Breakfast");
  const [customName, setCustomName] = useState("");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [protein_g, setProtein] = useState("");
  const [carbs_g, setCarbs] = useState("");
  const [fat_g, setFat] = useState("");

  const resolvedName = meal_name === "Custom" ? customName.trim() : meal_name;

  const handleAdd = () => {
    if (!resolvedName) {
      toast.error("Meal name is required");
      return;
    }
    onAdd({ meal_name: resolvedName, description, calories, protein_g, carbs_g, fat_g });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="bg-surface-elevated border border-border rounded-xl p-4 space-y-3"
    >
      {/* Meal name */}
      <div className="space-y-1.5">
        <label className="text-label block">Meal</label>
        <select
          value={meal_name}
          onChange={(e) => setMealName(e.target.value)}
          className="input text-sm"
        >
          {MEAL_PRESETS.map((p) => (
            <option key={p} value={p} className="bg-surface text-foreground">
              {p}
            </option>
          ))}
        </select>
        {meal_name === "Custom" && (
          <input
            type="text"
            placeholder="Custom meal name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="input text-sm mt-1.5"
          />
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-label block">Description (optional)</label>
        <textarea
          placeholder="e.g. Oatmeal with berries and whey protein…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="input text-sm resize-none"
        />
      </div>

      {/* Macros */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-label block">Calories</label>
          <input
            type="number"
            min={0}
            placeholder="kcal"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="input text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label block">Protein (g)</label>
          <input
            type="number"
            min={0}
            placeholder="g"
            value={protein_g}
            onChange={(e) => setProtein(e.target.value)}
            className="input text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label block">Carbs (g)</label>
          <input
            type="number"
            min={0}
            placeholder="g"
            value={carbs_g}
            onChange={(e) => setCarbs(e.target.value)}
            className="input text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label block">Fat (g)</label>
          <input
            type="number"
            min={0}
            placeholder="g"
            value={fat_g}
            onChange={(e) => setFat(e.target.value)}
            className="input text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={handleAdd} className="btn-primary rounded-full px-4 py-2 text-xs flex-1">
          Add Meal
        </button>
        <button onClick={onCancel} className="btn-ghost rounded-full px-3 py-2 text-xs">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Meal card ────────────────────────────────────────────────────────────────

function MealCard({ entry, onRemove }: { entry: MealEntry; onRemove: () => void }) {
  const hasMacros = entry.calories || entry.protein_g || entry.carbs_g || entry.fat_g;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="group bg-surface border border-border rounded-lg p-3 relative"
    >
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 rounded text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all duration-fast"
        aria-label="Remove meal"
      >
        <Trash2 className="w-3 h-3" />
      </button>
      <p className="text-xs font-semibold text-foreground pr-5 leading-tight">{entry.meal_name}</p>
      {entry.description && (
        <p className="text-[11px] text-foreground-secondary mt-0.5 line-clamp-2">{entry.description}</p>
      )}
      {hasMacros && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
          {entry.calories && (
            <span className="text-[10px] text-accent font-semibold">{entry.calories} kcal</span>
          )}
          {entry.protein_g && (
            <span className="text-[10px] text-foreground-secondary">{entry.protein_g}g P</span>
          )}
          {entry.carbs_g && (
            <span className="text-[10px] text-foreground-secondary">{entry.carbs_g}g C</span>
          )}
          {entry.fat_g && (
            <span className="text-[10px] text-foreground-secondary">{entry.fat_g}g F</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface MealPlanBuilderProps {
  clients: LinkedClient[];
}

export function MealPlanBuilder({ clients }: MealPlanBuilderProps) {
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  // ── Step ────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1 state ────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [weekStart, setWeekStart] = useState("");

  // ── Step 2 state ────────────────────────────────────────────
  // Map dayOfWeek → list of meal entries
  const [mealsByDay, setMealsByDay] = useState<Record<number, MealEntry[]>>(() => {
    const init: Record<number, MealEntry[]> = {};
    DAYS.forEach(({ dayOfWeek }) => { init[dayOfWeek] = []; });
    return init;
  });
  // Which day's add-form is open
  const [openFormDay, setOpenFormDay] = useState<number | null>(null);

  // ── Step 3 / save state ─────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);

  // ── Derived ─────────────────────────────────────────────────
  const totalMeals = Object.values(mealsByDay).reduce((sum, arr) => sum + arr.length, 0);
  const selectedClient = clients.find((c) => c.id === clientId);

  // ── Step 1 → 2 ─────────────────────────────────────────────
  const goToStep2 = () => {
    if (!title.trim()) { toast.error("Plan title is required"); return; }
    if (!clientId) { toast.error("Please select a client"); return; }
    setStep(2);
  };

  // ── Meal actions ────────────────────────────────────────────
  const addMeal = useCallback(
    (dayOfWeek: number, entry: Omit<MealEntry, "localId">) => {
      setMealsByDay((prev) => ({
        ...prev,
        [dayOfWeek]: [...(prev[dayOfWeek] ?? []), { ...entry, localId: crypto.randomUUID() }],
      }));
      setOpenFormDay(null);
    },
    []
  );

  const removeMeal = useCallback((dayOfWeek: number, localId: string) => {
    setMealsByDay((prev) => ({
      ...prev,
      [dayOfWeek]: (prev[dayOfWeek] ?? []).filter((e) => e.localId !== localId),
    }));
  }, []);

  // ── Save ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Insert meal_plan
      const planInsert: MealPlanInsert = {
        trainer_id: user.id,
        client_id: clientId,
        title: title.trim(),
        description: description.trim() || null,
        week_start: weekStart || null,
        active: true,
      };

      const { data: plan, error: planErr } = await supabase
        .from("meal_plans")
        .insert(planInsert)
        .select("id")
        .single();
      if (planErr) throw planErr;
      if (!plan) throw new Error("Failed to create meal plan");

      // 2. Build meal_plan_days rows
      const dayRows: MealPlanDayInsert[] = [];
      DAYS.forEach(({ dayOfWeek }) => {
        const meals = mealsByDay[dayOfWeek] ?? [];
        meals.forEach((entry, idx) => {
          dayRows.push({
            meal_plan_id: plan.id,
            day_of_week: dayOfWeek,
            meal_name: entry.meal_name,
            description: entry.description.trim() || null,
            calories: entry.calories ? Number(entry.calories) : null,
            protein_g: entry.protein_g ? Number(entry.protein_g) : null,
            carbs_g: entry.carbs_g ? Number(entry.carbs_g) : null,
            fat_g: entry.fat_g ? Number(entry.fat_g) : null,
            sort_order: idx,
          });
        });
      });

      if (dayRows.length > 0) {
        const { error: daysErr } = await supabase.from("meal_plan_days").insert(dayRows);
        if (daysErr) throw daysErr;
      }

      toast.success("Plan created!");
      router.push("/trainer/meal-plans");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save plan";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Animation variants ──────────────────────────────────────
  const stepVariants = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-5xl">

      {/* Page header */}
      <div>
        <nav className="flex items-center gap-1.5 text-[11px] text-muted uppercase tracking-widest mb-2 font-medium">
          <span>Meal Plans</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground-secondary">New Plan</span>
        </nav>
        <h1 className="text-heading">{title || <span className="text-muted font-normal italic">Untitled Plan</span>}</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-start gap-3">
        <StepDot active={step === 1} done={step > 1} label="Details" step={1} />
        <StepConnector done={step > 1} />
        <StepDot active={step === 2} done={step > 2} label="Meals" step={2} />
        <StepConnector done={step > 2} />
        <StepDot active={step === 3} done={false} label="Review" step={3} />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">

        {/* ── Step 1: Plan details ────────────────────────────── */}
        {step === 1 && (
          <motion.div
            key="step1"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="card space-y-6"
          >
            <h2 className="text-subheading">Plan Details</h2>

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="plan-title" className="text-label block">
                Title <span className="text-danger">*</span>
              </label>
              <input
                id="plan-title"
                type="text"
                placeholder="e.g. Week 1 — High Protein Cut"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="plan-description" className="text-label block">
                Description (optional)
              </label>
              <textarea
                id="plan-description"
                placeholder="Overview or coaching notes for this plan…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="input resize-none"
              />
            </div>

            {/* Client */}
            <div className="space-y-1.5">
              <label htmlFor="plan-client" className="text-label flex items-center gap-1.5">
                <User className="w-3 h-3" />
                Assign to client <span className="text-danger">*</span>
              </label>
              {clients.length === 0 ? (
                <p className="text-sm text-foreground-secondary bg-surface-elevated border border-border rounded-lg px-3 py-2.5">
                  No linked clients — link a client first.
                </p>
              ) : (
                <select
                  id="plan-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="input"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-surface text-foreground">
                      {c.full_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Week start */}
            <div className="space-y-1.5">
              <label htmlFor="plan-week-start" className="text-label flex items-center gap-1.5">
                <CalendarDays className="w-3 h-3" />
                Week start date (optional)
              </label>
              <input
                id="plan-week-start"
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="input"
              />
            </div>

            {/* Next */}
            <div className="flex justify-end pt-2">
              <button
                onClick={goToStep2}
                disabled={clients.length === 0}
                className="btn-primary rounded-full px-6 flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Meal builder ─────────────────────────────── */}
        {step === 2 && (
          <motion.div
            key="step2"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-subheading">Meal Builder</h2>
              <span className="badge-neutral font-mono">
                {totalMeals} meal{totalMeals !== 1 ? "s" : ""}
              </span>
            </div>

            {/* 7-column day grid — scrolls horizontally on small screens */}
            <div className="overflow-x-auto pb-2">
              <div className="grid grid-cols-7 gap-2 min-w-[700px]">
                {DAYS.map(({ label, dayOfWeek }) => {
                  const dayMeals = mealsByDay[dayOfWeek] ?? [];
                  const isFormOpen = openFormDay === dayOfWeek;

                  return (
                    <div
                      key={dayOfWeek}
                      className="flex flex-col gap-2 bg-surface border border-border rounded-xl p-2.5 min-h-[280px]"
                    >
                      {/* Day header */}
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-secondary">
                          {label}
                        </p>
                        {dayMeals.length > 0 && (
                          <span className="text-[10px] text-accent font-semibold">
                            {dayMeals.length}
                          </span>
                        )}
                      </div>

                      {/* Meal cards */}
                      <AnimatePresence mode="popLayout">
                        {dayMeals.map((entry) => (
                          <MealCard
                            key={entry.localId}
                            entry={entry}
                            onRemove={() => removeMeal(dayOfWeek, entry.localId)}
                          />
                        ))}
                      </AnimatePresence>

                      {/* Add meal form or button */}
                      <AnimatePresence mode="wait">
                        {isFormOpen ? (
                          <AddMealForm
                            key="form"
                            onAdd={(e) => addMeal(dayOfWeek, e)}
                            onCancel={() => setOpenFormDay(null)}
                          />
                        ) : (
                          <motion.button
                            key="add-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpenFormDay(dayOfWeek)}
                            className="mt-auto flex items-center justify-center gap-1 w-full py-2 rounded-lg border border-dashed border-border text-muted text-[11px] hover:border-accent/40 hover:text-accent transition-all duration-fast"
                          >
                            <Plus className="w-3 h-3" />
                            Add meal
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="btn-ghost flex items-center gap-2 rounded-full px-5"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="btn-primary rounded-full px-6 flex items-center gap-2"
              >
                Review
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Review & save ────────────────────────────── */}
        {step === 3 && (
          <motion.div
            key="step3"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="space-y-4"
          >
            <h2 className="text-subheading">Review & Save</h2>

            {/* Summary card */}
            <div className="card space-y-5">
              {/* Plan details */}
              <div>
                <p className="text-label mb-3">Plan Details</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-0.5">Title</p>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-0.5">Client</p>
                    <p className="text-sm text-foreground">{selectedClient?.full_name ?? "—"}</p>
                  </div>
                  {weekStart && (
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-0.5">Week Start</p>
                      <p className="text-sm text-foreground">
                        {new Date(weekStart).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </p>
                    </div>
                  )}
                  {description && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-0.5">Description</p>
                      <p className="text-sm text-foreground-secondary">{description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="divider my-0" />

              {/* Meal summary */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-label">Meal Schedule</p>
                  <span className="badge-accent">
                    {totalMeals} meal{totalMeals !== 1 ? "s" : ""} total
                  </span>
                </div>

                {totalMeals === 0 ? (
                  <div className="flex items-center gap-3 bg-surface-elevated rounded-lg px-4 py-3">
                    <UtensilsCrossed className="w-4 h-4 text-muted" />
                    <p className="text-sm text-foreground-secondary">No meals added — plan will be saved empty.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {DAYS.map(({ label, dayOfWeek }) => {
                      const dayMeals = mealsByDay[dayOfWeek] ?? [];
                      if (dayMeals.length === 0) return null;
                      return (
                        <div key={dayOfWeek} className="flex items-start gap-3">
                          <span className="w-8 text-[10px] font-bold uppercase tracking-widest text-foreground-secondary pt-0.5 flex-shrink-0">
                            {label}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {dayMeals.map((entry) => (
                              <span key={entry.localId} className="badge-neutral text-xs">
                                {entry.meal_name}
                                {entry.calories ? ` · ${entry.calories} kcal` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="btn-ghost flex items-center gap-2 rounded-full px-5"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary rounded-full px-8 flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {isSaving ? "Saving…" : "Save Plan"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
