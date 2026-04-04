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

// ── Shared input style ───────────────────────────────────────────────────────

const inputCls =
  "w-full h-11 bg-surface border border-border text-foreground text-[14px] rounded-md px-[14px] placeholder:text-foreground-disabled focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] hover:border-border-hover transition-all duration-[160ms]";

// ── Step indicator ───────────────────────────────────────────────────────────

function StepDot({ active, done, label, step }: { active: boolean; done: boolean; label: string; step: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-[160ms]
          ${done
            ? "bg-accent text-accent-foreground"
            : active
              ? "bg-accent-muted text-accent border border-accent/50"
              : "bg-surface-elevated text-foreground-tertiary border border-border"
          }`}
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <span
        className={`text-[10px] uppercase tracking-widest font-semibold transition-colors duration-[160ms]
          ${active ? "text-accent" : done ? "text-foreground-secondary" : "text-foreground-tertiary"}`}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ done }: { done: boolean }) {
  return (
    <div
      className={`flex-1 h-px mt-[-12px] transition-colors duration-[160ms]
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

  const smallInput =
    "w-full h-9 bg-surface border border-border text-foreground text-[13px] rounded-md px-3 placeholder:text-foreground-disabled focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] transition-all duration-[160ms]";

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="bg-surface-elevated border border-border rounded-md p-3 space-y-3"
    >
      {/* Meal name */}
      <div className="space-y-1.5">
        <label className="text-label text-foreground-secondary block">Meal</label>
        <select
          value={meal_name}
          onChange={(e) => setMealName(e.target.value)}
          className={smallInput}
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
            className={`${smallInput} mt-1.5`}
          />
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-label text-foreground-secondary block">Description (optional)</label>
        <textarea
          placeholder="e.g. Oatmeal with berries and whey protein…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-surface border border-border text-foreground text-[13px] rounded-md px-3 py-2 placeholder:text-foreground-disabled focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] transition-all duration-[160ms] resize-none"
        />
      </div>

      {/* Macros */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Calories", placeholder: "kcal", value: calories, setter: setCalories },
          { label: "Protein (g)", placeholder: "g", value: protein_g, setter: setProtein },
          { label: "Carbs (g)", placeholder: "g", value: carbs_g, setter: setCarbs },
          { label: "Fat (g)", placeholder: "g", value: fat_g, setter: setFat },
        ].map(({ label, placeholder, value, setter }) => (
          <div key={label} className="space-y-1">
            <label className="text-label text-foreground-secondary block">{label}</label>
            <input
              type="number"
              min={0}
              placeholder={placeholder}
              value={value}
              onChange={(e) => setter(e.target.value)}
              className={smallInput}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleAdd}
          className="flex-1 h-8 bg-accent text-accent-foreground text-[12px] font-bold rounded-md hover:bg-accent-strong transition-colors duration-[160ms]"
        >
          Add Meal
        </button>
        <button
          onClick={onCancel}
          className="h-8 w-8 flex items-center justify-center bg-surface-elevated border border-border text-foreground-tertiary hover:text-foreground rounded-md transition-colors duration-[160ms]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Meal card ────────────────────────────────────────────────────────────────

function MealCard({ entry, onRemove }: { entry: MealEntry; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="group flex items-start gap-3 p-3 border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
    >
      {/* Drag handle */}
      <span className="text-foreground-tertiary opacity-0 group-hover:opacity-100 cursor-grab mt-1 select-none text-[14px] leading-none">
        ⠿
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-body text-foreground font-medium leading-tight truncate pr-1">{entry.meal_name}</p>
          <button
            onClick={onRemove}
            className="shrink-0 p-1 rounded text-foreground-tertiary hover:text-danger opacity-0 group-hover:opacity-100 transition-all duration-[160ms]"
            aria-label="Remove meal"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        {entry.description && (
          <p className="text-caption text-foreground-secondary mt-0.5 line-clamp-2">{entry.description}</p>
        )}
        {(entry.protein_g || entry.carbs_g || entry.fat_g) && (
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {entry.protein_g && (
              <span className="text-caption px-2.5 py-0.5 bg-surface-elevated border border-border rounded-pill text-foreground-secondary">
                P: {entry.protein_g}g
              </span>
            )}
            {entry.carbs_g && (
              <span className="text-caption px-2.5 py-0.5 bg-surface-elevated border border-border rounded-pill text-foreground-secondary">
                C: {entry.carbs_g}g
              </span>
            )}
            {entry.fat_g && (
              <span className="text-caption px-2.5 py-0.5 bg-surface-elevated border border-border rounded-pill text-foreground-secondary">
                F: {entry.fat_g}g
              </span>
            )}
          </div>
        )}
      </div>
      {entry.calories && (
        <span className="text-caption text-foreground-tertiary whitespace-nowrap shrink-0">{entry.calories} kcal</span>
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

  // Daily macro totals (across all days, averaged for footer display)
  const allMeals = Object.values(mealsByDay).flat();
  const totalCalories = allMeals.reduce((s, m) => s + (Number(m.calories) || 0), 0);
  const totalProtein = allMeals.reduce((s, m) => s + (Number(m.protein_g) || 0), 0);
  const totalCarbs = allMeals.reduce((s, m) => s + (Number(m.carbs_g) || 0), 0);
  const totalFat = allMeals.reduce((s, m) => s + (Number(m.fat_g) || 0), 0);
  const avgCalories = DAYS.length > 0 ? Math.round(totalCalories / DAYS.length) : 0;
  const avgProtein = DAYS.length > 0 ? Math.round(totalProtein / DAYS.length) : 0;
  const avgCarbs = DAYS.length > 0 ? Math.round(totalCarbs / DAYS.length) : 0;
  const avgFat = DAYS.length > 0 ? Math.round(totalFat / DAYS.length) : 0;

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
    <div className="space-y-8 max-w-5xl pb-24">

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-display text-foreground mb-1">
            {title || "New Meal Plan"}
          </h1>
          <p className="text-body text-foreground-secondary">
            Build a 7-day nutrition plan for your client
          </p>
        </div>
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
          >
            <div className="bg-surface border border-border rounded-lg shadow-inset p-6">
              <h2 className="text-h4 font-display text-foreground mb-6">Plan Details</h2>

              <div className="max-w-[560px] space-y-5">
                {/* Title */}
                <div>
                  <label htmlFor="plan-title" className="text-label text-foreground-secondary block mb-2">
                    Plan Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="plan-title"
                    type="text"
                    placeholder="e.g. Week 1 — High Protein Cut"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="plan-description" className="text-label text-foreground-secondary block mb-2">
                    Description <span className="text-foreground-tertiary font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="plan-description"
                    placeholder="Overview or coaching notes for this plan…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-surface border border-border text-foreground text-[14px] rounded-md px-[14px] py-3 placeholder:text-foreground-disabled focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] hover:border-border-hover transition-all duration-[160ms] resize-none"
                  />
                </div>

                {/* Client */}
                <div>
                  <label htmlFor="plan-client" className="text-label text-foreground-secondary flex items-center gap-1.5 mb-2">
                    <User className="w-3 h-3" />
                    Client <span className="text-danger">*</span>
                  </label>
                  {clients.length === 0 ? (
                    <p className="text-body-sm text-foreground-secondary bg-surface-elevated border border-border rounded-md px-[14px] py-3">
                      No linked clients — link a client first.
                    </p>
                  ) : (
                    <select
                      id="plan-client"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className={inputCls}
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id} className="bg-surface text-foreground">
                          {c.full_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Calories + Week start */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-label text-foreground-secondary block mb-2">
                      Daily Calories <span className="text-foreground-tertiary font-normal">(optional)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="kcal"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="plan-week-start" className="text-label text-foreground-secondary flex items-center gap-1.5 mb-2">
                      <CalendarDays className="w-3 h-3" />
                      Start Date
                    </label>
                    <input
                      id="plan-week-start"
                      type="date"
                      value={weekStart}
                      onChange={(e) => setWeekStart(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Next */}
              <div className="flex justify-end pt-6 mt-2 border-t border-border">
                <button
                  onClick={goToStep2}
                  disabled={clients.length === 0}
                  className="h-9 px-5 bg-accent text-accent-foreground text-[13px] font-bold rounded-md hover:bg-accent-strong transition-colors duration-[160ms] flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
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
              <h2 className="text-h4 font-display text-foreground">Meal Builder</h2>
              <span className="text-caption text-foreground-secondary bg-surface-elevated border border-border rounded-pill px-3 py-1 font-mono">
                {totalMeals} meal{totalMeals !== 1 ? "s" : ""}
              </span>
            </div>

            {/* 7-column day grid */}
            <div className="bg-surface border border-border rounded-lg shadow-inset overflow-hidden">
              <div className="grid grid-cols-7 divide-x divide-border overflow-x-auto">
                {DAYS.map(({ label, dayOfWeek }) => {
                  const dayMeals = mealsByDay[dayOfWeek] ?? [];
                  const isFormOpen = openFormDay === dayOfWeek;

                  return (
                    <div key={dayOfWeek} className="flex flex-col min-w-[120px]">
                      {/* Day column header */}
                      <div className="text-label text-foreground-tertiary text-center py-3 border-b border-border bg-surface-elevated">
                        {label}
                        {dayMeals.length > 0 && (
                          <span className="ml-1.5 text-accent font-semibold">{dayMeals.length}</span>
                        )}
                      </div>

                      {/* Meal entries */}
                      <div className="flex-1 flex flex-col">
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
                            <div key="form" className="p-2">
                              <AddMealForm
                                onAdd={(e) => addMeal(dayOfWeek, e)}
                                onCancel={() => setOpenFormDay(null)}
                              />
                            </div>
                          ) : (
                            <motion.button
                              key="add-btn"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => setOpenFormDay(dayOfWeek)}
                              className="w-full py-2.5 text-caption text-foreground-tertiary hover:text-foreground hover:bg-white/[0.03] transition-colors rounded-b-lg mt-auto"
                            >
                              + Add meal
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="h-9 px-4 bg-surface-elevated border border-border text-foreground-secondary text-[13px] rounded-md hover:text-foreground hover:border-border-hover transition-all duration-[160ms] flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="h-9 px-5 bg-accent text-accent-foreground text-[13px] font-bold rounded-md hover:bg-accent-strong transition-colors duration-[160ms] flex items-center gap-2"
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
            <h2 className="text-h4 font-display text-foreground">Review & Save</h2>

            {/* Summary card */}
            <div className="bg-surface border border-border rounded-lg shadow-inset overflow-hidden">
              {/* Plan details */}
              <div className="p-5">
                <p className="text-label text-foreground-secondary mb-4">Plan Details</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <p className="text-caption text-foreground-tertiary uppercase tracking-widest mb-1">Title</p>
                    <p className="text-body text-foreground font-semibold">{title}</p>
                  </div>
                  <div>
                    <p className="text-caption text-foreground-tertiary uppercase tracking-widest mb-1">Client</p>
                    <p className="text-body text-foreground">{selectedClient?.full_name ?? "—"}</p>
                  </div>
                  {weekStart && (
                    <div>
                      <p className="text-caption text-foreground-tertiary uppercase tracking-widest mb-1">Week Start</p>
                      <p className="text-body text-foreground">
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
                      <p className="text-caption text-foreground-tertiary uppercase tracking-widest mb-1">Description</p>
                      <p className="text-body-sm text-foreground-secondary">{description}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Meal summary */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-label text-foreground-secondary">Meal Schedule</p>
                  <span className="text-caption text-accent bg-accent-muted border border-accent/20 rounded-pill px-3 py-0.5">
                    {totalMeals} meal{totalMeals !== 1 ? "s" : ""} total
                  </span>
                </div>

                {totalMeals === 0 ? (
                  <div className="flex items-center gap-3 bg-surface-elevated border border-border rounded-md px-4 py-3">
                    <UtensilsCrossed className="w-4 h-4 text-foreground-tertiary" />
                    <p className="text-body-sm text-foreground-secondary">No meals added — plan will be saved empty.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {DAYS.map(({ label, dayOfWeek }) => {
                      const dayMeals = mealsByDay[dayOfWeek] ?? [];
                      if (dayMeals.length === 0) return null;
                      return (
                        <div key={dayOfWeek} className="flex items-start gap-3">
                          <span className="w-8 text-caption font-bold uppercase tracking-widest text-foreground-tertiary pt-0.5 flex-shrink-0">
                            {label}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {dayMeals.map((entry) => (
                              <span
                                key={entry.localId}
                                className="text-caption text-foreground-secondary bg-surface-elevated border border-border rounded-pill px-2.5 py-0.5"
                              >
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
                className="h-9 px-4 bg-surface-elevated border border-border text-foreground-secondary text-[13px] rounded-md hover:text-foreground hover:border-border-hover transition-all duration-[160ms] flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="h-9 px-5 bg-accent text-accent-foreground text-[13px] font-bold rounded-md hover:bg-accent-strong transition-colors duration-[160ms] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* ── Sticky footer — macro totals (Step 2 only) ─────────────────────── */}
      {step === 2 && (
        <div className="fixed bottom-0 left-[264px] right-0 bg-surface-elevated border-t border-border-strong px-8 py-4 z-20">
          <div className="max-w-content mx-auto flex items-center gap-6">
            <p className="text-label text-foreground-tertiary">DAILY AVG</p>
            <div className="flex items-center gap-4 flex-1">
              {/* Calories progress */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-caption text-foreground-secondary whitespace-nowrap">
                  {avgCalories} kcal/day
                </span>
                {avgCalories > 0 && (
                  <div className="h-1.5 bg-surface rounded-pill overflow-hidden flex-1 max-w-[200px]">
                    <div
                      className="h-full rounded-pill bg-accent transition-all duration-300"
                      style={{ width: "100%" }}
                    />
                  </div>
                )}
              </div>
              {/* Macro pills */}
              <span className="text-caption text-foreground-secondary">P: {avgProtein}g</span>
              <span className="text-caption text-foreground-secondary">C: {avgCarbs}g</span>
              <span className="text-caption text-foreground-secondary">F: {avgFat}g</span>
            </div>
            <button
              onClick={() => setStep(3)}
              className="h-9 px-5 bg-accent text-accent-foreground text-[13px] font-bold rounded-md hover:bg-accent-strong transition-colors duration-[160ms]"
            >
              Review Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
