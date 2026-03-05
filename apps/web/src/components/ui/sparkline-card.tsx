"use client";

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
  color?: string;           // recharts line/area color — defaults to accent
  className?: string;
}

function Trend({ pct }: { pct: number }) {
  if (pct > 0)  return <span className="trend-up"><TrendingUp  className="w-3 h-3" />+{pct.toFixed(1)}%</span>;
  if (pct < 0)  return <span className="trend-down"><TrendingDown className="w-3 h-3" />{pct.toFixed(1)}%</span>;
  return              <span className="trend-flat"><Minus className="w-3 h-3" />0%</span>;
}

// Tiny custom tooltip so we don't show ugly defaults
function SparkTooltip({ active, payload, label: _label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-2 py-1 text-xs font-medium text-foreground shadow-card">
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
    <div className={`stat-card ${accent ? "border-accent/20 bg-accent/[0.03]" : ""} ${className}`}>
      {/* Top row: icon + trend */}
      <div className="flex items-start justify-between">
        <div className={accent ? "stat-card-icon-accent" : "stat-card-icon"}>
          <Icon className={`w-4 h-4 ${accent ? "text-accent" : "text-foreground-secondary"}`} />
        </div>
        {trendPct != null && <Trend pct={trendPct} />}
      </div>

      {/* Value */}
      <div>
        <div className="flex items-baseline gap-1">
          <span className={`text-metric ${accent ? "text-accent" : "text-foreground"}`}>
            {value}
          </span>
          {unit && <span className="text-sm text-foreground-secondary font-normal">{unit}</span>}
        </div>
        <p className="text-caption mt-0.5">{label}</p>
      </div>

      {/* Sparkline */}
      {hasChart && (
        <div className="h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <defs>
                <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0}    />
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
                fill={`url(#grad-${label})`}
                dot={false}
                activeDot={{ r: 3, fill: chartColor, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
