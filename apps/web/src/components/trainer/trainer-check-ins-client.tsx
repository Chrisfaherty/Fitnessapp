"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ClipboardCheck,
  X,
  Scale,
  Zap,
  Brain,
  Moon,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { CheckInWithClient } from "@/app/(dashboard)/trainer/check-ins/page";

type CheckInRow = Database["public"]["Tables"]["check_ins"]["Row"];
type CheckInStatus = Database["public"]["Tables"]["check_ins"]["Row"]["status"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatWeekDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function clientInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

type MetricLevel = 1 | 2 | 3 | 4 | 5;

function levelColor(level: MetricLevel): string {
  if (level <= 2) return "bg-danger/15 text-danger border-danger/20";
  if (level === 3) return "bg-warning/15 text-warning border-warning/20";
  return "bg-success/10 text-success border-success/20";
}

function LevelChip({ value, label }: { value: number | null; label: string }) {
  if (value === null) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-label">{label}</span>
        <span className="badge badge-neutral">—</span>
      </div>
    );
  }
  const clamped = (Math.min(5, Math.max(1, value)) as MetricLevel);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-label">{label}</span>
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border ${levelColor(clamped)}`}
      >
        {clamped}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

interface RowProps {
  checkIn: CheckInWithClient;
  onClick: () => void;
}

function CheckInRow({ checkIn, onClick }: RowProps) {
  const { client, week_start_date, body_weight_kg, energy_level, stress_level, sleep_quality } =
    checkIn;

  return (
    <button
      onClick={onClick}
      className="w-full text-left card-compact hover:border-white/20 transition-all duration-fast group flex items-center gap-4 cursor-pointer"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center flex-shrink-0 text-sm font-semibold text-foreground-secondary group-hover:border-accent/40 transition-colors">
        {client.avatar_url ? (
          <img
            src={client.avatar_url}
            alt={client.full_name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          clientInitial(client.full_name)
        )}
      </div>

      {/* Name + week */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">
          {client.full_name}
        </p>
        <p className="text-caption mt-0.5">
          Week of {formatWeekDate(week_start_date)}
        </p>
      </div>

      {/* Weight */}
      <div className="hidden sm:flex flex-col items-center gap-0.5 flex-shrink-0 w-16">
        <span className="text-label">Weight</span>
        <span className="text-sm font-semibold text-foreground font-mono">
          {body_weight_kg != null ? `${body_weight_kg} kg` : "—"}
        </span>
      </div>

      {/* Metric chips */}
      <div className="hidden md:flex items-center gap-3 flex-shrink-0">
        <LevelChip value={energy_level} label="Energy" />
        <LevelChip value={stress_level} label="Stress" />
        <LevelChip value={sleep_quality} label="Sleep" />
      </div>

      <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors flex-shrink-0" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Slide-over panel
// ---------------------------------------------------------------------------

interface SlideOverProps {
  checkIn: CheckInWithClient;
  onClose: () => void;
  onMarkReviewed: (
    id: string,
    trainerNotes: string,
    trainerVideoUrl: string
  ) => Promise<void>;
  isSubmitting: boolean;
}

function SlideOver({ checkIn, onClose, onMarkReviewed, isSubmitting }: SlideOverProps) {
  const [trainerNotes, setTrainerNotes] = useState(checkIn.trainer_notes ?? "");
  const [trainerVideoUrl, setTrainerVideoUrl] = useState(
    checkIn.trainer_video_url ?? ""
  );

  const isReviewed = checkIn.status === "reviewed";

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-lg bg-surface border-l border-border shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-semibold text-foreground-secondary text-base flex-shrink-0">
              {checkIn.client.avatar_url ? (
                <img
                  src={checkIn.client.avatar_url}
                  alt={checkIn.client.full_name}
                  className="w-11 h-11 rounded-full object-cover"
                />
              ) : (
                clientInitial(checkIn.client.full_name)
              )}
            </div>
            <div>
              <h2 className="text-subheading text-foreground">
                {checkIn.client.full_name}
              </h2>
              <p className="text-caption mt-0.5">
                Week of {formatWeekDate(checkIn.week_start_date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon ml-4 flex-shrink-0"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-6">
          {/* Status badge */}
          {isReviewed ? (
            <span className="badge-accent">Reviewed</span>
          ) : (
            <span className="badge-warning">Awaiting Review</span>
          )}

          {/* Metrics grid */}
          <div>
            <p className="text-label mb-3">Client Metrics</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Body weight */}
              <div className="card-compact flex items-center gap-3">
                <div className="stat-card-icon flex-shrink-0">
                  <Scale className="w-4 h-4 text-foreground-secondary" />
                </div>
                <div>
                  <p className="text-label">Body Weight</p>
                  <p className="text-sm font-semibold text-foreground font-mono mt-0.5">
                    {checkIn.body_weight_kg != null
                      ? `${checkIn.body_weight_kg} kg`
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Energy */}
              <div className="card-compact flex items-center gap-3">
                <div className="stat-card-icon flex-shrink-0">
                  <Zap className="w-4 h-4 text-foreground-secondary" />
                </div>
                <div>
                  <p className="text-label">Energy Level</p>
                  <div className="mt-0.5">
                    <LevelChip value={checkIn.energy_level} label="" />
                  </div>
                </div>
              </div>

              {/* Stress */}
              <div className="card-compact flex items-center gap-3">
                <div className="stat-card-icon flex-shrink-0">
                  <Brain className="w-4 h-4 text-foreground-secondary" />
                </div>
                <div>
                  <p className="text-label">Stress Level</p>
                  <div className="mt-0.5">
                    <LevelChip value={checkIn.stress_level} label="" />
                  </div>
                </div>
              </div>

              {/* Sleep */}
              <div className="card-compact flex items-center gap-3">
                <div className="stat-card-icon flex-shrink-0">
                  <Moon className="w-4 h-4 text-foreground-secondary" />
                </div>
                <div>
                  <p className="text-label">Sleep Quality</p>
                  <div className="mt-0.5">
                    <LevelChip value={checkIn.sleep_quality} label="" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client notes */}
          <div>
            <p className="text-label mb-2">Client Notes</p>
            <div className="bg-surface-elevated border border-border rounded-lg px-3 py-3 text-sm text-foreground leading-relaxed min-h-[80px] whitespace-pre-wrap">
              {checkIn.client_notes?.trim()
                ? checkIn.client_notes
                : <span className="text-muted italic">No notes from client.</span>}
            </div>
          </div>

          {/* Trainer notes */}
          <div>
            <label
              htmlFor="trainer-notes"
              className="text-label mb-2 block"
            >
              Trainer Notes
            </label>
            <textarea
              id="trainer-notes"
              rows={4}
              className="input resize-none"
              placeholder="Add your coaching notes here…"
              value={trainerNotes}
              onChange={(e) => setTrainerNotes(e.target.value)}
              disabled={isReviewed}
            />
          </div>

          {/* Trainer video URL */}
          <div>
            <label
              htmlFor="trainer-video"
              className="text-label mb-2 block"
            >
              Trainer Video URL
            </label>
            <div className="relative">
              <input
                id="trainer-video"
                type="url"
                className="input pr-10"
                placeholder="https://loom.com/share/…"
                value={trainerVideoUrl}
                onChange={(e) => setTrainerVideoUrl(e.target.value)}
                disabled={isReviewed}
              />
              {trainerVideoUrl && (
                <a
                  href={trainerVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-accent transition-colors"
                  aria-label="Open video URL"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {!isReviewed && (
          <div className="p-6 border-t border-border flex-shrink-0">
            <button
              onClick={() =>
                onMarkReviewed(checkIn.id, trainerNotes, trainerVideoUrl)
              }
              disabled={isSubmitting}
              className="btn-primary w-full justify-center rounded-xl"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                "Mark as Reviewed"
              )}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type Tab = "pending" | "reviewed";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}

function TabButton({ active, onClick, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative pb-3 text-sm font-medium transition-colors duration-fast focus-visible:outline-none ${
        active
          ? "text-foreground"
          : "text-foreground-secondary hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
          active
            ? "bg-accent/15 text-accent"
            : "bg-white/[0.06] text-foreground-secondary"
        }`}
      >
        {count}
      </span>
      {active && (
        <motion.span
          layoutId="tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-full"
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface Props {
  checkIns: CheckInWithClient[];
}

export function TrainerCheckInsClient({ checkIns }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [items, setItems] = useState<CheckInWithClient[]>(checkIns);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pending = items.filter((c) => c.status === "submitted");
  const reviewed = items.filter((c) => c.status === "reviewed");
  const displayed = activeTab === "pending" ? pending : reviewed;
  const selected = items.find((c) => c.id === selectedId) ?? null;

  const handleMarkReviewed = useCallback(
    async (id: string, trainerNotes: string, trainerVideoUrl: string) => {
      setIsSubmitting(true);
      const supabase = createClientSupabaseClient();
      const now = new Date().toISOString();

      const updatePayload: Database["public"]["Tables"]["check_ins"]["Update"] = {
        trainer_notes: trainerNotes || null,
        trainer_video_url: trainerVideoUrl || null,
        status: "reviewed" as CheckInStatus,
        reviewed_at: now,
      };

      const { error } = await supabase
        .from("check_ins")
        .update(updatePayload)
        .eq("id", id);

      setIsSubmitting(false);

      if (error) {
        toast.error("Failed to save review. Please try again.");
        return;
      }

      setItems((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: "reviewed" as CheckInStatus,
                trainer_notes: trainerNotes || null,
                trainer_video_url: trainerVideoUrl || null,
                reviewed_at: now,
                updated_at: now,
              }
            : c
        )
      );

      toast.success("Check-in marked as reviewed.");
      setSelectedId(null);
      setActiveTab("reviewed");
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-label mb-1.5">Coaching</p>
        <h1 className="text-heading">Check-Ins</h1>
        <p className="text-caption mt-1">
          Review your clients&apos; weekly submissions
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border">
        <TabButton
          active={activeTab === "pending"}
          onClick={() => setActiveTab("pending")}
          label="Pending"
          count={pending.length}
        />
        <TabButton
          active={activeTab === "reviewed"}
          onClick={() => setActiveTab("reviewed")}
          label="Reviewed"
          count={reviewed.length}
        />
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="empty-state">
          <div className="stat-card-icon mx-auto">
            <ClipboardCheck className="w-5 h-5 text-foreground-secondary" />
          </div>
          <p className="text-subheading">
            {activeTab === "pending"
              ? "No pending check-ins"
              : "No reviewed check-ins"}
          </p>
          <p className="text-caption max-w-xs">
            {activeTab === "pending"
              ? "When clients submit their weekly check-in you will see it here."
              : "Check-ins you have reviewed will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {displayed.map((checkIn) => (
            <CheckInRow
              key={checkIn.id}
              checkIn={checkIn}
              onClick={() => setSelectedId(checkIn.id)}
            />
          ))}
        </div>
      )}

      {/* Slide-over */}
      <AnimatePresence>
        {selected && (
          <SlideOver
            key={selected.id}
            checkIn={selected}
            onClose={() => setSelectedId(null)}
            onMarkReviewed={handleMarkReviewed}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
