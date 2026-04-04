import React from "react";

type SkeletonRounded = "sm" | "md" | "lg" | "pill" | "full";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: SkeletonRounded;
}

const roundedClasses: Record<SkeletonRounded, string> = {
  sm:   "rounded-sm",
  md:   "rounded-md",
  lg:   "rounded-lg",
  pill: "rounded-pill",
  full: "rounded-full",
};

export function Skeleton({
  className = "",
  width,
  height,
  rounded = "md",
}: SkeletonProps) {
  return (
    <div
      className={[
        "bg-white/[0.04] animate-pulse",
        roundedClasses[rounded],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// SkeletonCard — preset approximation of a StatCard
// ---------------------------------------------------------------------------
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "bg-surface border border-border rounded-lg p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {/* Top row: label + icon placeholder */}
      <div className="flex items-center justify-between mb-[18px]">
        <Skeleton height="10px" width="72px" rounded="sm" />
        <Skeleton width="28px" height="28px" rounded="sm" />
      </div>

      {/* Value */}
      <Skeleton height="36px" width="120px" rounded="sm" className="mb-2" />

      {/* Delta */}
      <Skeleton height="14px" width="80px" rounded="sm" />
    </div>
  );
}
