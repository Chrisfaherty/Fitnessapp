"use client";

import Link from "next/link";
import { motion, type Transition } from "framer-motion";
import {
  Users,
  ClipboardCheck,
  Dumbbell,
  TrendingUp,
} from "lucide-react";

interface Props {
  profile: { id: string; role: string; full_name: string };
  clientLinks: Array<{
    client_id: string;
    profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  }>;
  pendingCheckIns: Array<{
    id: string;
    client_id: string;
    week_start_date: string;
    status: string;
    profiles: { full_name: string } | null;
  }>;
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function TrainerDashboard({ profile, clientLinks, pendingCheckIns }: Props) {
  const firstName = profile.full_name.split(" ")[0];

  const stats = [
    {
      label: "Active Clients",
      value: clientLinks.length.toString(),
      Icon: Users,
      delta: null as string | null,
      deltaPositive: true,
    },
    {
      label: "Check-ins Pending",
      value: pendingCheckIns.length.toString(),
      Icon: ClipboardCheck,
      delta: null as string | null,
      deltaPositive: false,
    },
    {
      label: "Workouts Assigned",
      value: "—",
      Icon: Dumbbell,
      delta: null as string | null,
      deltaPositive: true,
    },
    {
      label: "Weekly Sessions",
      value: "—",
      Icon: TrendingUp,
      delta: null as string | null,
      deltaPositive: true,
    },
  ];

  // Derive recent activity from available data
  const recentActivity = pendingCheckIns.map((ci) => ({
    title: `${ci.profiles?.full_name ?? "A client"} submitted a check-in`,
    time: `Week of ${formatDate(ci.week_start_date)}`,
  }));

  const pendingItems = pendingCheckIns;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-6 py-8">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] } as Transition}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-h1 font-display text-foreground mb-1">
              Good morning, {firstName} 👋
            </h1>
            <p className="text-body text-foreground-secondary">
              {todayLabel()} · {clientLinks.length} active client{clientLinks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </motion.div>

        {/* ── Stat cards ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.06, ease: [0.16, 1, 0.3, 1] } as Transition}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] } as Transition}
              className="bg-surface border border-border rounded-lg p-6 shadow-inset"
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-[18px]">
                <span className="text-label text-foreground-secondary">{stat.label}</span>
                <div className="w-7 h-7 bg-white/[0.04] rounded-sm flex items-center justify-center">
                  <stat.Icon className="w-4 h-4 text-foreground-tertiary" />
                </div>
              </div>
              {/* Value */}
              <p className="text-h1 font-display text-foreground mb-2.5">{stat.value}</p>
              {/* Delta */}
              {stat.delta && (
                <p className={`text-body-sm ${stat.deltaPositive ? "text-success" : "text-danger"}`}>
                  {stat.deltaPositive ? "↑" : "↓"} {stat.delta}
                </p>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* ── Two-column main content ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.12, ease: [0.16, 1, 0.3, 1] } as Transition}
          className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6"
        >

          {/* ── Left: Needs Attention ─────────────────────────────────── */}
          <div className="bg-surface border border-border rounded-lg shadow-inset overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-h4 font-display text-foreground">Needs Attention</h2>
              <span className="text-caption px-2.5 py-0.5 bg-warning-muted border border-warning/24 text-warning rounded-pill">
                {pendingItems.length} item{pendingItems.length !== 1 ? "s" : ""}
              </span>
            </div>

            {pendingItems.map((ci) => (
              <div
                key={ci.id}
                className="flex items-center gap-4 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-caption font-bold text-foreground flex-shrink-0">
                  {initials(ci.profiles?.full_name)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-foreground truncate">
                    {ci.profiles?.full_name ?? "Unknown Client"}
                  </p>
                  <p className="text-caption text-foreground-tertiary">
                    Check-in · {formatDate(ci.week_start_date)}
                  </p>
                </div>
                {/* Badge */}
                <span className="text-caption px-2.5 py-0.5 bg-warning-muted border border-warning/24 text-warning rounded-pill flex-shrink-0">
                  Pending
                </span>
                {/* Action */}
                <Link
                  href="/trainer/check-ins"
                  className="h-8 px-3 rounded-sm text-body-sm text-foreground-secondary border border-border hover:border-border-hover hover:text-foreground transition-colors duration-[120ms] flex items-center flex-shrink-0"
                >
                  Review
                </Link>
              </div>
            ))}

            {pendingItems.length === 0 && (
              <div className="px-6 py-10 text-center">
                <p className="text-body-sm text-foreground-tertiary">All caught up 🎉</p>
              </div>
            )}
          </div>

          {/* ── Right: Activity Feed ──────────────────────────────────── */}
          <div className="bg-surface border border-border rounded-lg shadow-inset overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-h4 font-display text-foreground">Recent Activity</h2>
            </div>
            <div className="px-6 py-4">
              {recentActivity.length > 0 ? (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

                  <div className="space-y-4">
                    {recentActivity.map((event, i) => (
                      <div key={i} className="flex items-start gap-4 relative">
                        {/* Dot */}
                        <div className="w-6 h-6 rounded-full bg-surface-elevated border border-border flex items-center justify-center flex-shrink-0 relative z-10">
                          <div className="w-1.5 h-1.5 rounded-full bg-foreground-tertiary" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-body-sm text-foreground">{event.title}</p>
                          <p className="text-caption text-foreground-tertiary mt-0.5">{event.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-body-sm text-foreground-tertiary">No recent activity</p>
                </div>
              )}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
