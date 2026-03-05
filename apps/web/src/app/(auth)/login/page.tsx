import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign In" };

const QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Strength does not come from the body. It comes from the will.", author: "Gandhi" },
];
const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding + quote (desktop only) ──────── */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-[#0D0E14] flex-col justify-between p-12 overflow-hidden">
        {/* Dot grid */}
        <div className="absolute inset-0 [background-image:radial-gradient(#252638_1px,transparent_1px)] [background-size:24px_24px]" />
        {/* Gradient overlay — bottom fade to surface */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-indigo/10" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-glow">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
              <path d="M4 12h3l3-8 4 16 3-8h3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">FitnessCoach</span>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-6">
          {[
            { title: "Real-time check-ins",    desc: "Review client submissions the moment they arrive." },
            { title: "Workout templates",       desc: "Build once, assign to any client instantly." },
            { title: "Health data sync",        desc: "HealthKit & Health Connect metrics in one view." },
            { title: "Video messaging",         desc: "Send form-correction clips directly to clients." },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-none mb-1">{f.title}</p>
                <p className="text-[#8B8FA8] text-xs leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="relative z-10">
          <blockquote className="border-l-2 border-accent/40 pl-4">
            <p className="text-[#ECEEF4]/80 text-sm italic leading-relaxed mb-2">&ldquo;{quote.text}&rdquo;</p>
            <cite className="text-[#8B8FA8] text-xs not-italic">— {quote.author}</cite>
          </blockquote>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-12 relative overflow-hidden">
        {/* Dot grid (mobile only, subtle) */}
        <div className="absolute inset-0 lg:hidden [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />

        <div className="relative w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-accent rounded-2xl mb-4 shadow-glow">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-accent-foreground">
                <path d="M4 12h3l3-8 4 16 3-8h3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">FitnessCoach</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
            <p className="text-foreground-secondary text-sm mt-1.5">Sign in to your account to continue</p>
          </div>

          <div className="card shadow-xl">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
