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
  Shield,
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
  { href: "/trainer",             label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/trainer/clients",     label: "Clients",   icon: Users },
  { href: "/trainer/check-ins",   label: "Check-Ins", icon: ClipboardCheck },
  { href: "/trainer/templates",   label: "Templates", icon: LayoutTemplate },
  { href: "/trainer/meal-plans",  label: "Meal Plans", icon: Salad },
  { href: "/trainer/exercises",   label: "Exercises", icon: BookOpen },
  { href: "/trainer/messaging",   label: "Messages",  icon: MessageSquare },
];

const clientNav: NavItem[] = [
  { href: "/client",            label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/client/workouts",   label: "Workouts",  icon: Dumbbell },
  { href: "/client/diary",      label: "Diary",     icon: BookText },
  { href: "/client/check-ins",  label: "Check-In",  icon: ClipboardCheck },
  { href: "/client/meals",      label: "Meal Plan", icon: Salad },
];

const adminNav: NavItem[] = [
  { href: "/admin",           label: "Overview",  icon: Shield, exact: true },
  { href: "/admin/users",     label: "Users",     icon: Users },
  { href: "/admin/exercises", label: "Exercises", icon: Dumbbell },
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

  const navItems =
    profile.role === "admin"
      ? adminNav
      : profile.role === "client"
      ? clientNav
      : trainerNav;

  const portalLabel =
    profile.role === "admin"
      ? "ADMIN PORTAL"
      : profile.role === "client"
      ? "CLIENT PORTAL"
      : "TRAINER PORTAL";

  const handleSignOut = async () => {
    const supabase = createClientSupabaseClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const initial = profile.full_name[0].toUpperCase();

  const SidebarContent = () => (
    <>
      {/* Logo area */}
      <div className="flex items-center h-11 mb-7 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center shadow-glow flex-shrink-0">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              className="text-accent-foreground"
            >
              <path
                d="M4 12h3l3-8 4 16 3-8h3"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-display font-semibold text-[15px] tracking-tight text-foreground">
            FitCoach
          </span>
        </div>
      </div>

      {/* Nav section label */}
      <p className="text-label text-foreground-tertiary px-3 mb-2 flex-shrink-0">
        {portalLabel}
      </p>

      {/* Nav items */}
      <nav className="space-y-[2px]">
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
              className={`flex items-center gap-[10px] h-10 px-3 rounded-md text-body font-medium transition-colors duration-fast cursor-pointer
                ${
                  isActive
                    ? "bg-surface-elevated text-foreground border border-white/[0.06]"
                    : "text-foreground-secondary hover:bg-white/[0.04] hover:text-foreground"
                }`}
            >
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 ${
                  isActive ? "text-accent" : "text-foreground-secondary group-hover:text-foreground"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User profile footer */}
      <div data-testid="profile-card" className="bg-surface border border-border rounded-lg p-3 mt-4 flex-shrink-0 group cursor-default">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-body-sm font-bold text-foreground">
              {initial}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-background" />
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <p className="text-body font-medium text-foreground truncate leading-none mb-0.5">
              {profile.full_name}
            </p>
            <p className="text-caption text-foreground-secondary capitalize leading-none">
              {profile.role}
            </p>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-7 h-7 rounded-sm flex items-center justify-center text-foreground-secondary hover:text-danger hover:bg-danger-muted transition-colors duration-fast opacity-0 group-hover:opacity-100 flex-shrink-0"
            title="Sign out"
          >
            <LogOut className="w-[15px] h-[15px]" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (desktop: static; mobile: slide-in) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[264px] bg-background border-r border-border flex flex-col h-screen px-4 py-6
          transition-transform duration-200 lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Mobile close button — positioned top-right inside sidebar */}
        <button
          className="lg:hidden absolute top-4 right-3 text-foreground-secondary hover:text-foreground transition-colors p-1"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-4 h-4" />
        </button>

        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:pl-[264px] flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-background sticky top-0 z-20">
          <button
            className="text-foreground-secondary hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center shadow-glow">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                className="text-accent-foreground"
              >
                <path
                  d="M4 12h3l3-8 4 16 3-8h3"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-display font-semibold text-[15px] tracking-tight text-foreground">
              FitCoach
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 sm:px-8 py-8 max-w-content mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
