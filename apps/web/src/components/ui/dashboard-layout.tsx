"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  LayoutTemplate,
  BookOpen,
  MessageSquare,
  Dumbbell,
  BookText,
  ClipboardCheck,
  Salad,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface Profile {
  id: string;
  role: string;
  full_name: string;
  avatar_url: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

const trainerNav: NavItem[] = [
  { href: "/trainer",           label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/trainer/clients",   label: "Clients",   icon: Users },
  { href: "/trainer/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/trainer/exercises", label: "Exercises", icon: BookOpen },
  { href: "/trainer/messaging", label: "Messages",  icon: MessageSquare },
];

const clientNav: NavItem[] = [
  { href: "/client",            label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/client/workouts",   label: "Workouts",  icon: Dumbbell },
  { href: "/client/diary",      label: "Diary",     icon: BookText },
  { href: "/client/check-ins",  label: "Check-In",  icon: ClipboardCheck },
  { href: "/client/meals",      label: "Meal Plan", icon: Salad },
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
  const roleLabel = profile.role === "trainer" ? "TRAINER" : "CLIENT";

  const handleSignOut = async () => {
    const supabase = createClientSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initial = profile.full_name[0].toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border flex flex-col
          transition-transform duration-200 lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center shadow-glow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
                <path d="M4 12h3l3-8 4 16 3-8h3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-foreground tracking-tight">FitnessCoach</span>
          </div>
          <button
            className="lg:hidden btn-icon w-7 h-7"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Section label */}
          <p className="text-label px-3 mb-2">{roleLabel}</p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-fast
                    ${isActive
                      ? "bg-accent/10 text-accent"
                      : "text-foreground-secondary hover:text-foreground hover:bg-surface-elevated"
                    }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-accent" : ""}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-surface-elevated transition-colors group">
            {/* Avatar with accent ring */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-surface-elevated border-2 border-accent/40 flex items-center justify-center text-xs font-bold text-foreground">
                {initial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-surface" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-none mb-0.5">
                {profile.full_name}
              </p>
              <p className="text-xs text-foreground-secondary capitalize leading-none">
                {profile.role}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-muted hover:text-danger transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-surface sticky top-0 z-20">
          <button className="btn-icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
                <path d="M4 12h3l3-8 4 16 3-8h3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-foreground text-sm">FitnessCoach</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
