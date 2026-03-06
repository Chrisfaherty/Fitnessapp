import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background:    "var(--color-background)",
        surface:       "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        "surface-alt": "var(--color-surface-elevated)",
        foreground:    "var(--color-text)",
        "foreground-secondary": "var(--color-text-secondary)",
        muted:         "var(--color-muted)",
        border:        "var(--color-border)",
        "border-subtle": "var(--color-border-subtle)",
        accent: {
          DEFAULT:    "#A3FF12",
          foreground: "#080809",
          muted:      "#A3FF1215",
          hover:      "#8EE60F",
        },
        indigo: {
          DEFAULT:    "#4F6EF7",
          muted:      "#4F6EF715",
          foreground: "#fff",
        },
        success: { DEFAULT: "#30D158", foreground: "#fff", muted: "#30D15815" },
        warning: { DEFAULT: "#FFAB00", foreground: "#000", muted: "#FFAB0015" },
        danger:  { DEFAULT: "#FF3B30", foreground: "#fff", muted: "#FF3B3015" },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
      },
      transitionDuration: {
        fast: "150ms",
      },
      borderRadius: {
        sm:   "0.375rem",
        md:   "0.5rem",
        lg:   "0.75rem",
        xl:   "1rem",
        "2xl":"1.5rem",
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)",
      },
      boxShadow: {
        card:        "inset 0 1px 0 0 rgba(255,255,255,0.04)",
        "card-hover": "0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 0 rgba(255,255,255,0.06)",
        accent:      "0 0 0 2px #A3FF12",
        glow:        "0 0 24px 0 rgb(163 255 18 / 0.25)",
      },
      animation: {
        "fade-in":     "fadeIn 0.25s ease-out",
        "slide-up":    "slideUp 0.3s cubic-bezier(0.4,0,0.2,1)",
        "pulse-accent":"pulseAccent 2s infinite",
        "number-in":   "numberIn 0.4s cubic-bezier(0.4,0,0.2,1)",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" },                                  to: { opacity: "1" } },
        slideUp:   { from: { transform: "translateY(8px)", opacity: "0" },    to: { transform: "translateY(0)", opacity: "1" } },
        pulseAccent: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
        numberIn:  { from: { transform: "translateY(4px)", opacity: "0" },    to: { transform: "translateY(0)", opacity: "1" } },
      },
    },
  },
  plugins: [],
};

export default config;
