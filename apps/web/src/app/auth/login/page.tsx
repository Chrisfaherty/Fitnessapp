import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left pane — form (44%) */}
      <div className="w-full lg:w-[44%] flex flex-col justify-center px-8 py-12 lg:px-12">
        <div className="w-full max-w-auth-form mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center shadow-glow flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
                <path d="M4 12h3l3-8 4 16 3-8h3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-display font-semibold text-[16px] tracking-tight text-foreground">FitCoach</span>
          </div>

          {/* Heading */}
          <h1 className="text-h1 font-display text-foreground mb-2">Welcome back</h1>
          <p className="text-body text-foreground-secondary mb-8">Sign in to your coaching platform</p>

          <LoginForm />
        </div>
      </div>

      {/* Right pane — abstract visual (56%) — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[56%] relative overflow-hidden bg-surface">
        {/* Radial highlights */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(circle at 78% 18%, rgba(163,255,18,0.14), transparent 34%),
            radial-gradient(circle at 22% 70%, rgba(79,110,247,0.10), transparent 30%)
          `
        }} />

        {/* Technical dot grid */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: `28px 28px`
        }} />

        {/* Floating preview cards */}
        <div className="relative z-10 flex flex-col justify-center px-16 gap-4 w-full">
          {/* Card 1 — Client adherence */}
          <div className="bg-surface-elevated border border-border-strong rounded-lg p-5 shadow-elevated max-w-[280px] ml-8">
            <p className="text-label text-foreground-tertiary mb-3">Client Adherence</p>
            <p className="text-h1 font-display text-foreground mb-1">87<span className="text-h3 text-foreground-secondary">%</span></p>
            <p className="text-body-sm text-success">↑ 4% this week</p>
          </div>

          {/* Card 2 — Check-ins pending */}
          <div className="bg-surface-elevated border border-border-strong rounded-lg p-5 shadow-elevated max-w-[260px] ml-20">
            <p className="text-label text-foreground-tertiary mb-3">Check-ins Pending</p>
            <p className="text-h1 font-display text-foreground mb-1">3</p>
            <div className="flex gap-2 mt-2">
              <span className="text-caption px-2 py-0.5 bg-warning-muted border border-warning/24 text-warning rounded-pill">2 flagged</span>
            </div>
          </div>

          {/* Card 3 — Weekly load */}
          <div className="bg-surface-elevated border border-border-strong rounded-lg p-5 shadow-elevated max-w-[240px] ml-4">
            <p className="text-label text-foreground-tertiary mb-3">Weekly Load</p>
            <p className="text-h1 font-display text-foreground mb-1">12,480<span className="text-h3 text-foreground-secondary ml-1">kg</span></p>
            <p className="text-body-sm text-foreground-secondary">Across 6 clients</p>
          </div>
        </div>
      </div>
    </div>
  );
}
