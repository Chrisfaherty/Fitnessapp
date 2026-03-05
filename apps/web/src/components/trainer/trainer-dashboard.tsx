"use client";

import Link from "next/link";
import { Users, ClipboardList, LayoutTemplate, MessageSquare, ArrowUpRight } from "lucide-react";

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
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-caption">Welcome back,</p>
        <h1 className="text-heading">{profile.full_name}</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Clients"
          value={clientLinks.length.toString()}
          icon={Users}
        />
        <StatCard
          label="Pending Check-ins"
          value={pendingCheckIns.length.toString()}
          icon={ClipboardList}
          accent
        />
        <Link href="/trainer/templates" className="block group">
          <StatCard label="Templates" value="—" icon={LayoutTemplate} isLink />
        </Link>
        <Link href="/trainer/messaging" className="block group">
          <StatCard label="Messages" value="—" icon={MessageSquare} isLink />
        </Link>
      </div>

      {/* Pending check-ins */}
      {pendingCheckIns.length > 0 && (
        <section>
          <h2 className="text-subheading mb-4">Pending Check-ins</h2>
          <div className="space-y-3">
            {pendingCheckIns.map((ci) => (
              <Link
                key={ci.id}
                href={`/trainer/clients/${ci.client_id}?tab=checkins`}
                className="card-compact flex items-center gap-4 hover:border-accent/40 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-sm font-semibold text-accent">
                  {ci.profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {ci.profiles?.full_name ?? "Unknown Client"}
                  </p>
                  <p className="text-caption">Week of {ci.week_start_date}</p>
                </div>
                <span className="badge-warning">Submitted</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Clients grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-subheading">My Clients</h2>
          <Link href="/trainer/clients" className="text-sm text-accent hover:text-accent-hover font-medium">
            View all
          </Link>
        </div>
        {clientLinks.length === 0 ? (
          <div className="card-compact text-center py-8 text-foreground-secondary">
            <p className="text-sm">No clients linked yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientLinks.map((link) => (
              <Link
                key={link.client_id}
                href={`/trainer/clients/${link.client_id}`}
                className="card-compact hover:border-accent/30 transition-all hover:shadow-md group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-semibold text-foreground-secondary flex-shrink-0">
                    {link.profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground group-hover:text-accent transition-colors truncate">
                      {link.profiles?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-caption">View profile →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
  isLink = false,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: boolean;
  isLink?: boolean;
}) {
  return (
    <div
      className={`card-compact flex flex-col gap-3 h-full ${
        accent ? "border-accent/30 bg-accent/5" : ""
      } ${isLink ? "group-hover:border-accent/30 transition-colors" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            accent ? "bg-accent/20" : "bg-surface-elevated"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              accent ? "text-accent" : "text-foreground-secondary"
            }`}
          />
        </div>
        {isLink && (
          <ArrowUpRight className="w-4 h-4 text-foreground-secondary group-hover:text-accent transition-colors" />
        )}
      </div>
      <div>
        <p
          className={`text-2xl font-bold ${
            accent ? "text-accent" : "text-foreground"
          }`}
        >
          {value}
        </p>
        <p className="text-caption mt-0.5">{label}</p>
      </div>
    </div>
  );
}
