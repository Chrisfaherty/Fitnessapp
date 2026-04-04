"use client";
import React from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon?: React.ReactNode;
  suffix?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  icon,
  suffix,
  className = "",
}: StatCardProps) {
  return (
    <motion.div
      className={[
        "bg-surface border border-border rounded-lg p-6 shadow-inset",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top row: label + icon */}
      <div className="flex items-center justify-between mb-[18px]">
        <span className="text-label text-foreground-secondary uppercase tracking-widest">
          {label}
        </span>
        {icon && (
          <span className="w-7 h-7 bg-white/[0.04] rounded-sm flex items-center justify-center text-foreground-secondary">
            {icon}
          </span>
        )}
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-1">
        <span className="text-h1 font-display text-foreground leading-none">
          {value}
        </span>
        {suffix && (
          <span className="text-h3 font-display text-foreground-secondary leading-none">
            {suffix}
          </span>
        )}
      </div>

      {/* Delta row */}
      {delta && (
        <p
          className={[
            "text-body-sm mt-2",
            deltaPositive ? "text-success" : "text-danger",
          ].join(" ")}
        >
          {delta}
        </p>
      )}
    </motion.div>
  );
}
