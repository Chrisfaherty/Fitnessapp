import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background:        "var(--background)",
        surface:           "var(--surface)",
        "surface-elevated":"var(--surface-elevated)",
        "surface-overlay": "var(--surface-overlay)",

        border:            "var(--border)",
        "border-strong":   "var(--border-strong)",
        "border-hover":    "var(--border-hover)",

        foreground:        "var(--text-primary)",
        "foreground-secondary": "var(--text-secondary)",
        "foreground-tertiary":  "var(--text-tertiary)",
        "foreground-disabled":  "var(--text-disabled)",

        accent: {
          DEFAULT: "#A3FF12",
          muted:   "rgba(163,255,18,0.14)",
          strong:  "#B7FF45",
          foreground: "#090A0C",
        },
        success: {
          DEFAULT: "#30D158",
          muted:   "rgba(48,209,88,0.16)",
          foreground: "#fff",
        },
        warning: {
          DEFAULT: "#FFB020",
          muted:   "rgba(255,176,32,0.16)",
          foreground: "#000",
        },
        danger: {
          DEFAULT: "#FF453A",
          muted:   "rgba(255,69,58,0.16)",
          foreground: "#fff",
        },
        indigo: {
          DEFAULT: "#4F6EF7",
          muted:   "rgba(79,110,247,0.16)",
          foreground: "#fff",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans:    ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "display": ["48px", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        "h1":      ["32px", { lineHeight: "1.12", letterSpacing: "-0.025em", fontWeight: "700" }],
        "h2":      ["24px", { lineHeight: "1.2",  letterSpacing: "-0.02em",  fontWeight: "600" }],
        "h3":      ["20px", { lineHeight: "1.28", letterSpacing: "-0.015em", fontWeight: "600" }],
        "h4":      ["16px", { lineHeight: "1.35", letterSpacing: "-0.01em",  fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "1.55", letterSpacing: "0em",      fontWeight: "500" }],
        "body":    ["14px", { lineHeight: "1.5",  letterSpacing: "0em",      fontWeight: "500" }],
        "body-sm": ["13px", { lineHeight: "1.45", letterSpacing: "0.002em",  fontWeight: "500" }],
        "caption": ["12px", { lineHeight: "1.4",  letterSpacing: "0.01em",   fontWeight: "500" }],
        "label":   ["11px", { lineHeight: "1.2",  letterSpacing: "0.08em",   fontWeight: "700" }],
      },
      spacing: {
        "1":  "4px",
        "2":  "8px",
        "3":  "12px",
        "4":  "16px",
        "5":  "20px",
        "6":  "24px",
        "8":  "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
      },
      borderRadius: {
        sm:   "10px",
        md:   "14px",
        lg:   "18px",
        xl:   "20px",
        "2xl":"24px",
        pill: "999px",
      },
      boxShadow: {
        soft:     "0 10px 30px rgba(0,0,0,0.28)",
        elevated: "0 24px 60px rgba(0,0,0,0.42)",
        inset:    "inset 0 1px 0 rgba(255,255,255,0.06)",
        card:     "inset 0 1px 0 rgba(255,255,255,0.06)",
        "card-hover": "0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
        accent:   "0 0 0 3px rgba(163,255,18,0.12)",
        glow:     "0 0 24px 0 rgba(163,255,18,0.25)",
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)",
        "accent-gradient": "radial-gradient(circle at top right, rgba(163,255,18,0.05), transparent 38%)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "160ms",
        slow: "220ms",
      },
      transitionTimingFunction: {
        "entrance": "cubic-bezier(0.16, 1, 0.3, 1)",
        "settle":   "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      animation: {
        "fade-in":      "fadeIn 0.22s cubic-bezier(0.16,1,0.3,1)",
        "slide-up":     "slideUp 0.28s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-right":"slideInRight 0.32s cubic-bezier(0.16,1,0.3,1)",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
        "skeleton":     "skeleton 1.6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:       { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:      { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        slideInRight: { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        pulseSubtle:  { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        skeleton:     { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
      },
      maxWidth: {
        content:  "1280px",
        wizard:   "960px",
        "auth-form": "380px",
        "slide-over": "480px",
        "narrow": "448px",
      },
    },
  },
  plugins: [],
};

export default config;
