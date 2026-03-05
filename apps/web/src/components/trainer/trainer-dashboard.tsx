"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SparklineCard } from "@/components/ui/sparkline-card";
import {
  Users,
  ClipboardList,
  LayoutTemplate,
  MessageSquare,
  ArrowUpRight,
  ChevronRight,
  Clock,
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

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 300, damping: 30, delay },
});

export function TrainerDashboard({ profile, clientLinks, pendingCheckIns }: Props) {
  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────── */}
      <motion.div {...fadeUp(0)}>
        <p className="text-label mb-1.5">Good to see you</p>
        <h1 className="text-display">{firstName} 👋</h1>
      </motion.div>

      {/* ── Bento grid — top row ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div {...fadeUp(0.04)}>
          <SparklineCard
            label="Active Clients"
            value={clientLinks.length.toString()}
            icon={Users}
            color="#4F6EF7"
            className="h-full"
          />
        </motion.div>

        <motion.div {...fadeUp(0.08)}>
          <SparklineCard
            label="Pending Check-ins"
            value={pendingCheckIns.length.toString()}
            icon={ClipboardList}
            accent={pendingCheckIns.length > 0}
            color="#A3FF12"
            className="h-full"
          />
        </motion.div>

        {/* Templates — action card */}
        <motion.div {...fadeUp(0.12)}>
          <Link href="/trainer/templates" className="block h-full group">
            <motion.div
              className="stat-card h-full group-hover:border-indigo/30 transition-all duration-fast"
              whileHover={{ scale: 1.02, y: -1 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <div className="flex items-start justify-between">
                <div className="stat-card-icon-indigo">
                  <LayoutTemplate className="w-4 h-4 text-indigo" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-indigo transition-colors" />
              </div>
              <div>
                <p className="text-metric text-foreground">Templates</p>
                <p className="text-caption text-xs mt-1">Workout library</p>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Messages — action card */}
        <motion.div {...fadeUp(0.16)}>
          <Link href="/trainer/messaging" className="block h-full group">
            <motion.div
              className="stat-card h-full group-hover:border-accent/20 transition-all duration-fast"
              whileHover={{ scale: 1.02, y: -1 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <div className="flex items-start justify-between">
                <div className="stat-card-icon">
                  <MessageSquare className="w-4 h-4 text-foreground-secondary" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
              </div>
              <div>
                <p className="text-metric text-foreground">Messages</p>
                <p className="text-caption text-xs mt-1">Client conversations</p>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      </div>

      {/* ── Attention Required — Inbox pattern ───────────────── */}
      {pendingCheckIns.length > 0 && (
        <motion.section {...fadeUp(0.2)}>
          <div className="section-header">
            <div className="flex items-center gap-2">
              <h2 className="section-title">Needs Review</h2>
              <span className="badge-warning">{pendingCheckIns.length} pending</span>
            </div>
            <Link href="/trainer/clients" className="section-action flex items-center gap-1 text-xs">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="card p-0 overflow-hidden divide-y divide-border">
            {pendingCheckIns.map((ci, idx) => (
              <motion.div
                key={ci.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22 + idx * 0.05, type: "spring", stiffness: 300, damping: 30 }}
              >
                <Link
                  href={`/trainer/clients/${ci.client_id}?tab=checkins`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                    {ci.profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {ci.profiles?.full_name ?? "Unknown Client"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3 text-foreground-secondary" />
                      <p className="text-caption text-xs">Week of {ci.week_start_date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="badge-warning text-[10px]">Submitted</span>
                    <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── My Clients ───────────────────────────────────────── */}
      <motion.section {...fadeUp(pendingCheckIns.length > 0 ? 0.3 : 0.2)}>
        <div className="section-header">
          <h2 className="section-title">My Clients</h2>
          <Link href="/trainer/clients" className="section-action flex items-center gap-1 text-xs">
            View all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {clientLinks.length === 0 ? (
          <div className="empty-state">
            <div className="stat-card-icon mx-auto">
              <Users className="w-5 h-5 text-foreground-secondary" />
            </div>
            <p className="text-subheading">No clients yet</p>
            <p className="text-caption max-w-xs text-sm">
              Clients will appear here once linked to your account.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clientLinks.map((link, idx) => {
              const name = link.profiles?.full_name ?? "Unknown";
              return (
                <motion.div
                  key={link.client_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: (pendingCheckIns.length > 0 ? 0.32 : 0.22) + idx * 0.04,
                    type: "spring",
                    stiffness: 280,
                    damping: 28,
                  }}
                >
                  <Link
                    href={`/trainer/clients/${link.client_id}`}
                    className="card-compact hover:border-white/20 transition-all duration-fast group flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-bold text-sm text-foreground-secondary flex-shrink-0 group-hover:border-accent/30 transition-colors">
                      {name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors truncate">
                        {name}
                      </p>
                      <p className="text-caption text-xs">View profile</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors flex-shrink-0" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}
