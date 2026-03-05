"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-label">Email</label>
        <input
          id="email"
          type="email"
          className={error ? "input-error" : "input"}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-label">Password</label>
        <input
          id="password"
          type="password"
          className={error ? "input-error" : "input"}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <p className="text-sm text-danger flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin w-4 h-4" />
            Signing in…
          </>
        ) : "Sign In"}
      </button>

      <p className="text-center text-sm text-foreground-secondary">
        Demo credentials: trainer1@fitnessapp.dev / Trainer1234!
      </p>
    </form>
  );
}
