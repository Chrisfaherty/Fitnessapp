"use client";

import { format, subWeeks, startOfWeek, addDays, isSameDay } from "date-fns";

interface ActivityDay {
  date: string;   // ISO date string yyyy-MM-dd
  count: number;  // number of workouts / activity score 0-4
}

interface ActivityHeatmapProps {
  data: ActivityDay[];
  weeks?: number;
  label?: string;
}

const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getColor(count: number): string {
  if (count === 0) return "bg-surface-elevated";
  if (count === 1) return "bg-accent/20";
  if (count === 2) return "bg-accent/45";
  if (count === 3) return "bg-accent/70";
  return "bg-accent";
}

export function ActivityHeatmap({ data, weeks = 14, label = "Activity" }: ActivityHeatmapProps) {
  const today = new Date();
  const startDate = startOfWeek(subWeeks(today, weeks - 1), { weekStartsOn: 1 });

  // Build grid: array of [week][day]
  const grid: { date: Date; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: { date: Date; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(startDate, w * 7 + d);
      const iso  = format(date, "yyyy-MM-dd");
      const entry = data.find((a) => a.date === iso);
      week.push({ date, count: entry?.count ?? 0 });
    }
    grid.push(week);
  }

  // Month labels — show at first column of that month
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  grid.forEach((week, wi) => {
    const m = week[0].date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: wi, label: format(week[0].date, "MMM") });
      lastMonth = m;
    }
  });

  const totalActive = data.filter((d) => d.count > 0).length;

  return (
    <div className="card p-5 space-y-3">
      <div className="section-header">
        <h3 className="section-title text-base">{label}</h3>
        <span className="text-caption">{totalActive} active days</span>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Month labels */}
          <div className="flex gap-1 pl-7">
            {grid.map((_, wi) => {
              const ml = monthLabels.find((m) => m.col === wi);
              return (
                <div key={wi} className="w-3 text-[9px] text-foreground-secondary text-center">
                  {ml?.label ?? ""}
                </div>
              );
            })}
          </div>

          {/* Day rows */}
          {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-1">
              <span className="w-6 text-[9px] text-foreground-secondary text-right pr-1 leading-none">
                {DAYS[dayIdx]}
              </span>
              {grid.map((week, wi) => {
                const cell = week[dayIdx];
                const isFuture = cell.date > today;
                const isToday = isSameDay(cell.date, today);
                return (
                  <div
                    key={wi}
                    title={`${format(cell.date, "MMM d")}: ${cell.count} workout${cell.count !== 1 ? "s" : ""}`}
                    className={`w-3 h-3 rounded-[2px] transition-transform hover:scale-125 cursor-default
                      ${isFuture ? "opacity-0" : getColor(cell.count)}
                      ${isToday ? "ring-1 ring-accent ring-offset-1 ring-offset-surface" : ""}
                    `}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 pt-1">
        <span className="text-[10px] text-foreground-secondary">Less</span>
        {[0, 1, 2, 3, 4].map((v) => (
          <div key={v} className={`w-3 h-3 rounded-[2px] ${getColor(v)}`} />
        ))}
        <span className="text-[10px] text-foreground-secondary">More</span>
      </div>
    </div>
  );
}
