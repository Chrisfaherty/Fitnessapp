"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SparklineCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: React.ElementType;
  data?: number[];          // up to 7 values, latest last
  trendPct?: number | null; // e.g. 5.2 or -2.1
  accent?: boolean;
  color?: string;           // recharts line/area color
  className?: string;
}

function Trend({ pct }: { pct: number }) {
  if (pct > 0)  return <span className="trend-up"><TrendingUp  className="w-3 h-3" />+{pct.toFixed(1)}%</span>;
  if (pct < 0)  return <span className="trend-down"><TrendingDown className="w-3 h-3" />{pct.toFixed(1)}%</span>;
  return              <span className="trend-flat"><Minus className="w-3 h-3" />0%</span>;
}

function SparkTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-foreground">
      {payload[0].value}
    </div>
  );
}

export function SparklineCard({
  label,
  value,
  unit,
  icon: Icon,
  data,
  trendPct,
  accent = false,
  color,
  className = "",
}: SparklineCardProps) {
  const chartColor = color ?? (accent ? "#A3FF12" : "#4F6EF7");
  const chartData = (data ?? []).map((v, i) => ({ i, v }));
  const hasChart  = chartData.length >= 2;

  return (
    <motion.div
      className={`stat-card cursor-default ${accent ? "border-accent/20 bg-accent/[0.03]" : ""} ${className}`}
      whileHover={{ scale: 1.02, y: -1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      {/* Top row: icon + trend */}
      <div className="flex items-start justify-between">
        <div className={accent ? "stat-card-icon-accent" : "stat-card-icon"}>
          <Icon className={`w-4 h-4 ${accent ? "text-accent" : "text-foreground-secondary"}`} />
        </div>
        {trendPct != null && <Trend pct={trendPct} />}
      </div>

      {/* Value — Geist Mono via text-metric */}
      <div>
        <div className="flex items-baseline gap-1">
          <span className={`text-metric ${accent ? "text-accent" : "text-foreground"}`}>
            {value}
          </span>
          {unit && <span className="text-sm text-foreground-secondary font-normal font-sans">{unit}</span>}
        </div>
        <p className="text-caption mt-1 text-xs">{label}</p>
      </div>

      {/* Sparkline — bottom 30% of card */}
      {hasChart && (
        <div className="h-14 -mx-1 -mb-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <Tooltip
                content={<SparkTooltip />}
                cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={chartColor}
                strokeWidth={1.5}
                fill={`url(#grad-${label.replace(/\s/g, "")})`}
                dot={false}
                activeDot={{ r: 3, fill: chartColor, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
