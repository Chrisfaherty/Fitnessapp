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
          foreground: "#0B0C10",
          muted:      "#A3FF1240",
          hover:      "#8EE60F",
        },
        success: { DEFAULT: "#22C55E", foreground: "#fff", muted: "#22C55E20" },
        warning: { DEFAULT: "#F59E0B", foreground: "#0B0C10", muted: "#F59E0B20" },
        danger:  { DEFAULT: "#EF4444", foreground: "#fff", muted: "#EF444420" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
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
      boxShadow: {
        card:   "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        accent: "0 0 0 2px #A3FF12",
      },
      animation: {
        "fade-in":  "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s cubic-bezier(0.4,0,0.2,1)",
        "pulse-accent": "pulseAccent 2s infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        pulseAccent: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
      },
    },
  },
  plugins: [],
};

export default config;
