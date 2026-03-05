import type { Config } from "tailwindcss";
import tokens from "./tokens.json";

const config: Config = {
  darkMode: "class",
  content: [
    "../../apps/web/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light mode (default)
        background:    "var(--color-background)",
        surface:       "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        foreground:    "var(--color-text)",
        "foreground-secondary": "var(--color-text-secondary)",
        muted:         "var(--color-muted)",
        border:        "var(--color-border)",
        "border-subtle": "var(--color-border-subtle)",
        // Accent
        accent: {
          DEFAULT:    tokens.color.accent.default,
          foreground: tokens.color.accent.foreground,
          muted:      tokens.color.accent.muted,
          hover:      tokens.color.accent.hover,
          pressed:    tokens.color.accent.pressed,
        },
        // System
        success: {
          DEFAULT:    tokens.color.system.success,
          foreground: tokens.color.system.successForeground,
          muted:      tokens.color.system.successMuted,
        },
        warning: {
          DEFAULT:    tokens.color.system.warning,
          foreground: tokens.color.system.warningForeground,
          muted:      tokens.color.system.warningMuted,
        },
        danger: {
          DEFAULT:    tokens.color.system.danger,
          foreground: tokens.color.system.dangerForeground,
          muted:      tokens.color.system.dangerMuted,
        },
      },
      fontFamily: {
        sans: tokens.typography.fontFamily.sans,
        mono: tokens.typography.fontFamily.mono,
      },
      borderRadius: {
        sm:  tokens.borderRadius.sm,
        md:  tokens.borderRadius.md,
        lg:  tokens.borderRadius.lg,
        xl:  tokens.borderRadius.xl,
        "2xl": tokens.borderRadius["2xl"],
      },
      boxShadow: {
        sm:     tokens.shadow.sm,
        md:     tokens.shadow.md,
        lg:     tokens.shadow.lg,
        accent: tokens.shadow.accent,
      },
      transitionDuration: {
        fast:   tokens.animation.durationFast,
        normal: tokens.animation.durationNormal,
        slow:   tokens.animation.durationSlow,
      },
    },
  },
  plugins: [],
};

export default config;
