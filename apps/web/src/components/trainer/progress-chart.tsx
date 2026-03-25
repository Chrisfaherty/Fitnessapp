"use client";

import { useState, useEffect } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { Search, TrendingUp } from "lucide-react";

interface Props {
  clientId: string;
}

interface VolumeRow {
  week_label: string;
  total_volume: number;
  max_weight: number;
  session_count: number;
}

interface LoggedExercise {
  exercise_id: string;
  exercises: { name: string } | null;
}

const RANGES = [
  { label: "30d", value: 30 },
  { label: "60d", value: 60 },
  { label: "90d", value: 90 },
];

export function ProgressChart({ clientId }: Props) {
  const supabase = createClientSupabaseClient();
  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [search, setSearch] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<{ id: string; name: string } | null>(null);
  const [days, setDays] = useState(90);
  const [data, setData] = useState<VolumeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load exercises the client has logged
  useEffect(() => {
    supabase
      .from("workout_session_sets")
      .select("exercise_id, exercises(name)")
      .eq("client_id", clientId)
      .then(({ data: rows }) => {
        if (!rows) return;
        const seen = new Set<string>();
        const unique = rows.filter((r: any) => {
          if (seen.has(r.exercise_id)) return false;
          seen.add(r.exercise_id);
          return true;
        });
        setExercises(unique as any);
      });
  }, [clientId]);

  // Fetch chart data when exercise or range changes
  useEffect(() => {
    if (!selectedExercise) return;
    setLoading(true);
    supabase
      .rpc("get_exercise_volume_trend", {
        p_client_id: clientId,
        p_exercise_id: selectedExercise.id,
        p_days: days,
      })
      .then(({ data: rows }) => {
        setData((rows as unknown as VolumeRow[]) ?? []);
        setLoading(false);
      });
  }, [selectedExercise, days, clientId]);

  const filtered = exercises.filter((e: any) =>
    (e.exercises?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const bestWeight = data.reduce((max, r) => Math.max(max, r.max_weight ?? 0), 0);
  const totalSessions = data.reduce((sum, r) => sum + (r.session_count ?? 0), 0);
  const avgVolume = data.length > 0
    ? Math.round(data.reduce((sum, r) => sum + (r.total_volume ?? 0), 0) / data.length)
    : 0;

  const tooltipStyle = {
    backgroundColor: "#1C1D26",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    color: "#F0F0F0",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      {/* Exercise selector */}
      <div className="relative">
        <label className="text-label text-foreground-secondary mb-2 block">Select Exercise</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
          <input
            type="text"
            value={selectedExercise ? selectedExercise.name : search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedExercise(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search exercises this client has logged…"
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-accent/50"
          />
        </div>
        {showDropdown && filtered.length > 0 && !selectedExercise && (
          <div className="absolute z-10 top-full mt-1 w-full bg-surface-elevated border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
            {filtered.map((e: any) => (
              <button
                key={e.exercise_id}
                onMouseDown={() => {
                  setSelectedExercise({ id: e.exercise_id, name: e.exercises?.name ?? e.exercise_id });
                  setSearch("");
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-white/[0.06] transition-colors"
              >
                {e.exercises?.name ?? e.exercise_id}
              </button>
            ))}
          </div>
        )}
      </div>

      {!selectedExercise && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingUp className="w-10 h-10 text-foreground-secondary mb-3 opacity-40" />
          <p className="text-body text-foreground-secondary">Select an exercise to view progress charts</p>
        </div>
      )}

      {selectedExercise && (
        <>
          {/* Range selector */}
          <div className="flex items-center gap-2">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  days === r.value
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface border border-border text-foreground-secondary hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-body text-foreground-secondary">No sets logged for this exercise yet</p>
            </div>
          ) : (
            <>
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Volume Bar Chart */}
                <div className="bg-surface border border-border rounded-xl p-5">
                  <p className="text-label text-foreground-secondary mb-4">Weekly Volume (reps × kg)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="week_label" tick={{ fill: "rgba(240,240,240,0.55)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "rgba(240,240,240,0.55)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                      <Bar dataKey="total_volume" fill="#A3FF12" radius={[4, 4, 0, 0]} name="Volume" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Max Weight Line Chart */}
                <div className="bg-surface border border-border rounded-xl p-5">
                  <p className="text-label text-foreground-secondary mb-4">Max Weight (kg)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="week_label" tick={{ fill: "rgba(240,240,240,0.55)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "rgba(240,240,240,0.55)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="max_weight"
                        stroke="#A3FF12"
                        strokeWidth={2}
                        dot={{ fill: "#A3FF12", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#A3FF12" }}
                        name="Max Weight (kg)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Best Weight", value: `${bestWeight} kg` },
                  { label: "Total Sessions", value: totalSessions.toString() },
                  { label: "Avg Weekly Volume", value: avgVolume.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
                    <p className="text-label text-foreground-secondary mb-1">{label}</p>
                    <p className="text-xl font-bold font-display text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
