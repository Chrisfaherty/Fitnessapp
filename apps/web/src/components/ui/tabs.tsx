"use client";
import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  return (
    <div
      className={[
        "flex bg-white/[0.03] rounded-md p-1 gap-1",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={[
              "relative h-8 px-[14px] rounded-sm text-body-sm cursor-pointer transition-all duration-[160ms] ease-settle",
              "inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              isActive
                ? "text-foreground"
                : "text-foreground-secondary hover:text-foreground",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Animated active background */}
            {isActive && (
              <motion.span
                layoutId="tab-active"
                className="absolute inset-0 bg-surface-elevated border border-white/[0.05] rounded-sm"
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              />
            )}

            {/* Label */}
            <span className="relative z-10">{tab.label}</span>

            {/* Count badge */}
            {tab.count !== undefined && (
              <span className="relative z-10 ml-1.5 text-caption text-foreground-tertiary bg-white/[0.05] px-1.5 py-0.5 rounded leading-none">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
