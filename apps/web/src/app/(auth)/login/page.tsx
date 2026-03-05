import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Subtle dot-grid background */}
      <div className="absolute inset-0 [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent rounded-2xl mb-5 shadow-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
              <path d="M4 12h3l3-8 4 16 3-8h3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">FitnessCoach</h1>
          <p className="text-sm text-foreground-secondary mt-1">Sign in to your account</p>
        </div>

        <div className="card shadow-xl">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
