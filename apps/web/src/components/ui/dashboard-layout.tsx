"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Profile {
  id: string;
  role: string;
  full_name: string;
  avatar_url: string | null;
}

const trainerNav = [
  { href: "/trainer", label: "Dashboard", icon: "🏠" },
  { href: "/trainer/clients", label: "Clients", icon: "👥" },
  { href: "/trainer/templates", label: "Templates", icon: "💪" },
  { href: "/trainer/exercises", label: "Exercises", icon: "📖" },
  { href: "/trainer/messaging", label: "Messages", icon: "💬" },
];

const clientNav = [
  { href: "/client", label: "Dashboard", icon: "🏠" },
  { href: "/client/workouts", label: "Workouts", icon: "💪" },
  { href: "/client/diary", label: "Diary", icon: "📓" },
  { href: "/client/check-ins", label: "Check-In", icon: "✅" },
  { href: "/client/meals", label: "Meal Plan", icon: "🥗" },
];

export function DashboardLayout({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = profile.role === "client" ? clientNav : trainerNav;

  const handleSignOut = async () => {
    const supabase = createClientSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border flex flex-col
        transition-transform duration-200 lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-accent-foreground font-bold text-sm">FC</span>
          </div>
          <span className="font-semibold text-foreground">FitnessCoach</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-accent/10 text-accent"
                    : "text-foreground-secondary hover:text-foreground hover:bg-surface-elevated"
                  }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-sm font-medium text-foreground-secondary">
              {profile.full_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile.full_name}</p>
              <p className="text-xs text-foreground-secondary capitalize">{profile.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-foreground-secondary hover:text-danger transition-colors"
              title="Sign out"
            >
              →
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-border bg-surface sticky top-0 z-20">
          <button
            className="btn-icon"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <span className="font-semibold text-foreground">FitnessCoach</span>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
