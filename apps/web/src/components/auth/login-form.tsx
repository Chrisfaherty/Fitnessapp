"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClientSupabaseClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      setError(signInErr.message);
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email field */}
      <div>
        <label htmlFor="login-email" className="text-label text-foreground-secondary block mb-2">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@fitcoach.dev"
          className="w-full h-11 bg-surface border border-border text-foreground text-body rounded-md px-[14px] placeholder:text-foreground-disabled focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] hover:border-border-hover transition-all duration-[160ms]"
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>

      {/* Password field */}
      <div>
        <label htmlFor="login-password" className="text-label text-foreground-secondary block mb-2">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full h-11 bg-surface border border-border text-foreground text-body rounded-md px-[14px] placeholder:text-foreground-disabled focus:outline-none focus:border-accent/55 focus:shadow-[0_0_0_3px_rgba(163,255,18,0.12)] hover:border-border-hover transition-all duration-[160ms]"
          required
          autoComplete="current-password"
          disabled={loading}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-caption text-danger bg-danger-muted border border-danger/24 rounded-md px-3 py-2.5">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 bg-accent text-accent-foreground text-body font-bold rounded-md hover:bg-accent-strong disabled:bg-accent-muted disabled:text-accent-foreground/46 disabled:cursor-not-allowed transition-colors duration-[160ms] mt-2 flex items-center justify-center gap-2"
      >
        {loading ? (
          <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="12"/></svg> Signing in…</>
        ) : "Sign in"}
      </button>

      {/* Demo credentials */}
      <div className="mt-4 bg-surface border border-border rounded-md p-[14px]">
        <p className="text-label text-foreground-tertiary mb-2">Demo Accounts</p>
        <div className="space-y-1.5">
          <p className="text-caption text-foreground-secondary"><span className="text-foreground-tertiary">Trainer:</span> trainer1@fitcoach.dev</p>
          <p className="text-caption text-foreground-secondary"><span className="text-foreground-tertiary">Client:</span> client1@fitcoach.dev</p>
          <p className="text-caption text-foreground-secondary"><span className="text-foreground-tertiary">Admin:</span> admin@fitcoach.dev</p>
          <p className="text-caption text-foreground-tertiary mt-1">Password: FitCoach123!</p>
        </div>
      </div>
    </form>
  );
}
