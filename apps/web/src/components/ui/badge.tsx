import React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "accent";

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-white/[0.04] border border-border text-foreground-secondary",
  success: "bg-success-muted border border-success/24 text-success",
  warning: "bg-warning-muted border border-warning/24 text-warning",
  danger:  "bg-danger-muted  border border-danger/24  text-danger",
  info:    "bg-indigo-muted  border border-indigo/24  text-indigo",
  accent:  "bg-accent-muted  border border-accent/24  text-accent",
};

const dotColorClasses: Record<BadgeVariant, string> = {
  default: "bg-foreground-secondary",
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-danger",
  info:    "bg-indigo",
  accent:  "bg-accent",
};

export function Badge({
  variant = "default",
  dot = false,
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "h-6 px-[10px] rounded-pill text-caption font-semibold inline-flex items-center gap-1.5",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColorClasses[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
