"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ClipboardCheck,
  X,
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

function clientInitials(name: string): string {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

type MetricLevel = 1 | 2 | 3 | 4 | 5;

function levelColor(level: MetricLevel): string {
  if (level <= 2) return "bg-danger-muted border-danger/24 text-danger";
  if (level === 3) return "bg-warning-muted border-warning/24 text-warning";
  return "bg-success-muted border-success/24 text-success";
}

function LevelBadge({ value, label }: { value: number | null; label: string }) {
  if (value === null) {
    return (
      <div className="bg-surface border border-border rounded-md p-4 shadow-inset">
        <p className="text-label text-foreground-tertiary mb-2">{label}</p>
        <p className="text-h3 font-display text-foreground-secondary">—</p>
      </div>
    );
  }
  const clamped = Math.min(5, Math.max(1, value)) as MetricLevel;
  return (
    <div className="bg-surface border border-border rounded-md p-4 shadow-inset">
      <p className="text-label text-foreground-tertiary mb-2">{label}</p>
      <span
        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold border ${levelColor(clamped)}`}
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
  isSelected: boolean;
  onClick: () => void;
}

function CheckInRow({ checkIn, isSelected, onClick }: RowProps) {
  const { client, week_start_date, status } = checkIn;
  const initials = clientInitials(client.full_name);

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-4 border-b border-border/50 last:border-0 cursor-pointer transition-colors duration-[160ms] ${
        isSelected ? "bg-surface-elevated" : "hover:bg-white/[0.025]"
      }`}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[13px] font-bold text-foreground flex-shrink-0 overflow-hidden">
        {client.avatar_url ? (
          <img
            src={client.avatar_url}
            alt={client.full_name}
            className="w-9 h-9 object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium text-foreground truncate">
          {client.full_name}
        </p>
        <p className="text-caption text-foreground-tertiary">
          Week of {formatWeekDate(week_start_date)}
        </p>
      </div>

      {/* Status badge */}
      <span
        className={`text-caption px-2.5 py-0.5 rounded-pill border flex-shrink-0 ${
          status === "submitted"
            ? "bg-warning-muted border-warning/24 text-warning"
            : "bg-success-muted border-success/24 text-success"
        }`}
      >
        {status === "submitted" ? "pending" : "reviewed"}
      </span>
    </div>
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
  const initials = clientInitials(checkIn.client.full_name);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.9 }}
        className="fixed right-0 inset-y-0 z-50 w-full max-w-[480px] bg-surface-elevated border-l border-border-strong shadow-elevated flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-[13px] font-bold text-foreground flex-shrink-0 overflow-hidden">
              {checkIn.client.avatar_url ? (
                <img
                  src={checkIn.client.avatar_url}
                  alt={checkIn.client.full_name}
                  className="w-9 h-9 object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <p className="text-body font-medium text-foreground">
                {checkIn.client.full_name}
              </p>
              <p className="text-caption text-foreground-tertiary">
                Week of {formatWeekDate(checkIn.week_start_date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="w-8 h-8 rounded-sm flex items-center justify-center text-foreground-secondary hover:text-foreground hover:bg-white/[0.06] transition-colors duration-[160ms]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Status badge */}
          <div>
            <span
              className={`text-caption px-2.5 py-0.5 rounded-pill border ${
                isReviewed
                  ? "bg-success-muted border-success/24 text-success"
                  : "bg-warning-muted border-warning/24 text-warning"
              }`}
            >
              {isReviewed ? "reviewed" : "pending review"}
            </span>
          </div>

          {/* Metrics 2×2 grid */}
          <div>
            <p className="text-label text-foreground-tertiary mb-3">CLIENT METRICS</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface border border-border rounded-md p-4 shadow-inset">
                <p className="text-label text-foreground-tertiary mb-2">Body Weight</p>
                <p className="text-h3 font-display text-foreground">
                  {checkIn.body_weight_kg != null
                    ? (
                      <>
                        {checkIn.body_weight_kg}
                        <span className="text-body-sm text-foreground-secondary ml-1">kg</span>
                      </>
                    )
                    : <span className="text-foreground-secondary">—</span>}
                </p>
              </div>

              <LevelBadge value={checkIn.energy_level} label="Energy Level" />
              <LevelBadge value={checkIn.stress_level} label="Stress Level" />
              <LevelBadge value={checkIn.sleep_quality} label="Sleep Quality" />
            </div>
          </div>

          {/* Text responses */}
          <div className="space-y-5">
            {/* Client notes */}
            <div>
              <p className="text-label text-foreground-tertiary mb-2">CLIENT NOTES</p>
              <div className="bg-surface border border-border rounded-md px-4 py-3 shadow-inset text-body text-foreground leading-relaxed min-h-[80px] whitespace-pre-wrap">
                {checkIn.client_notes?.trim() ? (
                  checkIn.client_notes
                ) : (
                  <span className="text-foreground-tertiary italic">
                    No notes from client.
                  </span>
                )}
              </div>
            </div>

            {/* Trainer notes */}
            <div>
              <label
                htmlFor="trainer-notes"
                className="text-label text-foreground-tertiary mb-2 block"
              >
                TRAINER NOTES
              </label>
              <textarea
                id="trainer-notes"
                rows={4}
                className="w-full bg-surface border border-border rounded-md px-4 py-3 text-body text-foreground placeholder:text-foreground-tertiary resize-none focus:outline-none focus:border-accent/40 transition-colors duration-[160ms] disabled:opacity-50"
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
                className="text-label text-foreground-tertiary mb-2 block"
              >
                TRAINER VIDEO URL
              </label>
              <div className="relative">
                <input
                  id="trainer-video"
                  type="url"
                  className="w-full bg-surface border border-border rounded-md px-4 py-2.5 pr-10 text-body text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-accent/40 transition-colors duration-[160ms] disabled:opacity-50"
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
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-3 flex-shrink-0">
          {isReviewed ? (
            <button
              onClick={onClose}
              className="flex-1 h-10 bg-surface-elevated border border-border text-foreground text-[14px] font-medium rounded-md hover:border-white/20 transition-colors duration-[160ms]"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 h-10 bg-surface-elevated border border-border text-foreground text-[14px] font-medium rounded-md hover:border-white/20 transition-colors duration-[160ms]"
              >
                Message
              </button>
              <button
                onClick={() => onMarkReviewed(checkIn.id, trainerNotes, trainerVideoUrl)}
                disabled={isSubmitting}
                className="flex-1 h-10 bg-accent text-[#0B0C10] text-[14px] font-bold rounded-md hover:bg-accent/90 transition-colors duration-[160ms] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0B0C10] border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Mark Reviewed"
                )}
              </button>
            </>
          )}
        </div>
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
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "h-8 px-[14px] rounded-sm text-body-sm text-foreground bg-surface-elevated border border-white/[0.05] transition-colors duration-[160ms]"
          : "h-8 px-[14px] rounded-sm text-body-sm text-foreground-secondary hover:text-foreground transition-colors duration-[160ms]"
      }
    >
      {label}
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-display text-foreground mb-1">Check-ins</h1>
          <p className="text-body text-foreground-secondary">
            {pending.length} pending review
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-white/[0.03] rounded-md p-1 gap-1 w-fit mb-6">
        <TabButton
          active={activeTab === "pending"}
          onClick={() => setActiveTab("pending")}
          label="Pending"
        />
        <TabButton
          active={activeTab === "reviewed"}
          onClick={() => setActiveTab("reviewed")}
          label="Reviewed"
        />
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="w-10 h-10 rounded-md bg-surface-elevated border border-border flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-foreground-secondary" />
          </div>
          <p className="text-body font-medium text-foreground">
            {activeTab === "pending"
              ? "No pending check-ins"
              : "No reviewed check-ins"}
          </p>
          <p className="text-caption text-foreground-secondary max-w-xs">
            {activeTab === "pending"
              ? "When clients submit their weekly check-in you will see it here."
              : "Check-ins you have reviewed will appear here."}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg shadow-inset overflow-hidden">
          {displayed.map((checkIn) => (
            <CheckInRow
              key={checkIn.id}
              checkIn={checkIn}
              isSelected={selectedId === checkIn.id}
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
