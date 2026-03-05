"use client";

import Link from "next/link";
import { SparklineCard } from "@/components/ui/sparkline-card";
import { Users, ClipboardList, LayoutTemplate, MessageSquare, ArrowUpRight, ChevronRight } from "lucide-react";

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

export function TrainerDashboard({ profile, clientLinks, pendingCheckIns }: Props) {
  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <p className="text-caption mb-1">Good to see you,</p>
        <h1 className="text-display">{firstName} 👋</h1>
      </div>

      {/* Stats — 2-wide primary cards + 2 action tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SparklineCard
          label="Active Clients"
          value={clientLinks.length.toString()}
          icon={Users}
          color="#4F6EF7"
        />
        <SparklineCard
          label="Pending Check-ins"
          value={pendingCheckIns.length.toString()}
          icon={ClipboardList}
          accent={pendingCheckIns.length > 0}
          color="#A3FF12"
        />

        {/* Templates quick-action */}
        <Link href="/trainer/templates" className="group">
          <div className="stat-card h-full group-hover:border-indigo/30 transition-all duration-fast group-hover:shadow-card-hover">
            <div className="flex items-start justify-between">
              <div className="stat-card-icon-indigo">
                <LayoutTemplate className="w-4 h-4 text-indigo" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-indigo transition-colors" />
            </div>
            <div>
              <p className="text-metric text-foreground">Templates</p>
              <p className="text-caption mt-0.5">Workout library</p>
            </div>
          </div>
        </Link>

        {/* Messaging quick-action */}
        <Link href="/trainer/messaging" className="group">
          <div className="stat-card h-full group-hover:border-accent/20 transition-all duration-fast group-hover:shadow-card-hover">
            <div className="flex items-start justify-between">
              <div className="stat-card-icon">
                <MessageSquare className="w-4 h-4 text-foreground-secondary" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
            </div>
            <div>
              <p className="text-metric text-foreground">Messages</p>
              <p className="text-caption mt-0.5">Client conversations</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Pending check-ins */}
      {pendingCheckIns.length > 0 && (
        <section>
          <div className="section-header">
            <h2 className="section-title">Needs Review</h2>
            <span className="badge-warning">{pendingCheckIns.length} pending</span>
          </div>
          <div className="space-y-2">
            {pendingCheckIns.map((ci) => (
              <Link
                key={ci.id}
                href={`/trainer/clients/${ci.client_id}?tab=checkins`}
                className="card-compact flex items-center gap-4 hover:border-accent/30 transition-all hover:shadow-card-hover group"
              >
                <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                  {ci.profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate text-sm">
                    {ci.profiles?.full_name ?? "Unknown Client"}
                  </p>
                  <p className="text-caption text-xs">Week of {ci.week_start_date}</p>
                </div>
                <span className="badge-warning flex-shrink-0">Submitted</span>
                <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Clients grid */}
      <section>
        <div className="section-header">
          <h2 className="section-title">My Clients</h2>
          <Link href="/trainer/clients" className="section-action flex items-center gap-1">
            View all <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {clientLinks.length === 0 ? (
          <div className="empty-state">
            <div className="stat-card-icon">
              <Users className="w-5 h-5 text-foreground-secondary" />
            </div>
            <p className="text-subheading">No clients yet</p>
            <p className="text-caption max-w-xs">
              Clients will appear here once linked to your account.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clientLinks.map((link) => {
              const name = link.profiles?.full_name ?? "Unknown";
              return (
                <Link
                  key={link.client_id}
                  href={`/trainer/clients/${link.client_id}`}
                  className="card-compact hover:border-accent/20 transition-all hover:shadow-card-hover group flex items-center gap-3"
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
