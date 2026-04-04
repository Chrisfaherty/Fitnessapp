"use client";

import React from "react";
import { motion } from "framer-motion";

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
}: CardProps) {
  const base =
    "bg-surface border border-border rounded-lg shadow-inset " +
    paddingClasses[padding];

  if (hover) {
    return (
      <motion.div
        className={[base, "hover:border-border-hover", className]
          .filter(Boolean)
          .join(" ")}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={[base, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardHeader
// ---------------------------------------------------------------------------

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div
      className={["flex items-center justify-between mb-6", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardTitle
// ---------------------------------------------------------------------------

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    <h2
      className={["text-h4 font-display text-foreground", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// CardDescription
// ---------------------------------------------------------------------------

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({
  children,
  className = "",
}: CardDescriptionProps) {
  return (
    <p
      className={["text-body-sm text-foreground-secondary mt-1", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Panel — elevated card variant
// ---------------------------------------------------------------------------

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Panel({
  children,
  className = "",
  hover = false,
  padding = "md",
}: PanelProps) {
  const base =
    "bg-surface-elevated border border-border-strong rounded-lg shadow-elevated " +
    paddingClasses[padding];

  if (hover) {
    return (
      <motion.div
        className={[base, "hover:border-border-hover", className]
          .filter(Boolean)
          .join(" ")}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={[base, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
