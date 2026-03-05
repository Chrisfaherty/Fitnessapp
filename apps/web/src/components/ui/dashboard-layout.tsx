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
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar — Linear style: no fill, border-right only ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-background border-r border-border flex flex-col
          transition-transform duration-200 lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between pl-4 pr-3 h-16 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center shadow-glow flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
                <path d="M4 12h3l3-8 4 16 3-8h3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-foreground text-sm tracking-tight">FitnessCoach</span>
          </div>
          <button
            className="lg:hidden text-foreground-secondary hover:text-foreground transition-colors p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav — no horizontal padding on container; items control their own */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <p className="text-label pl-4 mb-1.5">{roleLabel}</p>
          <div className="space-y-[1px]">
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
                  className={`relative flex items-center gap-3 pl-4 pr-3 py-2.5 text-sm font-medium transition-colors duration-fast
                    ${isActive
                      ? "text-foreground"
                      : "text-foreground-secondary hover:text-foreground hover:bg-white/[0.04]"
                    }`}
                >
                  {/* 2px lime left indicator — Linear style */}
                  {isActive && (
                    <span className="absolute left-0 inset-y-[7px] w-[2px] bg-accent rounded-r-full" />
                  )}
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-accent" : ""}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className="px-2 py-3 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group cursor-default">
            {/* Avatar with subtle accent ring + green dot */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-xs font-bold text-foreground">
                {initial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate leading-none mb-0.5">
                {profile.full_name}
              </p>
              <p className="text-[11px] text-foreground-secondary capitalize leading-none">
                {profile.role}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-muted hover:text-danger transition-colors p-1 rounded opacity-0 group-hover:opacity-100 flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:pl-60 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-background sticky top-0 z-20">
          <button
            className="text-foreground-secondary hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
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
