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
}

const trainerNav: NavItem[] = [
  { href: "/trainer", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trainer/clients", label: "Clients", icon: Users },
  { href: "/trainer/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/trainer/exercises", label: "Exercises", icon: BookOpen },
  { href: "/trainer/messaging", label: "Messages", icon: MessageSquare },
];

const clientNav: NavItem[] = [
  { href: "/client", label: "Dashboard", icon: LayoutDashboard },
  { href: "/client/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/client/diary", label: "Diary", icon: BookText },
  { href: "/client/check-ins", label: "Check-In", icon: ClipboardCheck },
  { href: "/client/meals", label: "Meal Plan", icon: Salad },
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
      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-sm">FC</span>
            </div>
            <span className="font-semibold text-foreground">FitnessCoach</span>
          </div>
          <button
            className="lg:hidden btn-icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            // Exact match for root dashboard routes to avoid /trainer matching /trainer/clients
            const isExactRoot =
              item.href === "/trainer" || item.href === "/client";
            const isActive = isExactRoot
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-foreground-secondary hover:text-foreground hover:bg-surface-elevated"
                  }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-sm font-semibold text-foreground-secondary flex-shrink-0">
              {profile.full_name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-foreground-secondary capitalize">
                {profile.role}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-foreground-secondary hover:text-danger transition-colors p-1 rounded"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-surface sticky top-0 z-20">
          <button
            className="btn-icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-xs">FC</span>
            </div>
            <span className="font-semibold text-foreground text-sm">FitnessCoach</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
