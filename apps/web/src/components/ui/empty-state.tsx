import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={["flex flex-col items-center justify-center text-center py-12 px-6", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="max-w-[360px] mx-auto flex flex-col items-center">
        {icon && (
          <div className="w-12 h-12 bg-white/[0.04] rounded-md flex items-center justify-center mb-4 text-foreground-tertiary">
            {icon}
          </div>
        )}

        <h3 className="text-h3 font-display text-foreground mb-2">{title}</h3>

        {description && (
          <p className="text-body text-foreground-secondary mb-6">
            {description}
          </p>
        )}

        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
