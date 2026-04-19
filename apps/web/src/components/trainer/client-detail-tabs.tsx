"use client";

import { useRouter, usePathname } from 'next/navigation';
import { ProgressChart } from './progress-chart';

interface Props {
  clientId: string;
  activeTab: string;
  healthData: any[];
  checkIns: any[];
  sessions: any[];
}

const TABS = [
  { id: 'health', label: 'Health' },
  { id: 'check-ins', label: 'Check-ins' },
  { id: 'workouts', label: 'Workouts' },
  { id: 'progress', label: 'Progress' },
];

export function ClientDetailTabs({ clientId, activeTab, healthData, checkIns, sessions }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const setTab = (tab: string) => {
    router.push(`${pathname}?tab=${tab}`, { scroll: false });
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-foreground-secondary hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Health tab */}
      {activeTab === 'health' && (
        <section>
          <h2 className="text-heading mb-4">Last 7 Days — Health</h2>
          {healthData.length > 0 ? (
            <div className="overflow-x-auto bg-surface border border-border rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-foreground-secondary text-left">
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Steps</th>
                    <th className="py-3 px-4 font-medium">Active kcal</th>
                    <th className="py-3 px-4 font-medium">Weight</th>
                    <th className="py-3 px-4 font-medium">Protein</th>
                  </tr>
                </thead>
                <tbody>
                  {healthData.map((row: any) => (
                    <tr key={row.date} className="border-b border-border/50 last:border-0">
                      <td className="py-3 px-4 text-foreground-secondary">{row.date}</td>
                      <td className="py-3 px-4">{row.steps?.toLocaleString() ?? '—'}</td>
                      <td className="py-3 px-4">{row.active_energy_kcal ? `${Math.round(row.active_energy_kcal)} kcal` : '—'}</td>
                      <td className="py-3 px-4">{row.weight_kg ? `${row.weight_kg} kg` : '—'}</td>
                      <td className="py-3 px-4">{row.protein_g ? `${Math.round(row.protein_g)}g` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-body text-foreground-secondary">No health data synced yet.</p>
          )}
        </section>
      )}

      {/* Check-ins tab */}
      {activeTab === 'check-ins' && (
        <section>
          <h2 className="text-heading mb-4">Check-ins</h2>
          {checkIns.length > 0 ? (
            <div className="space-y-3">
              {checkIns.map((ci: any) => (
                <div key={ci.id} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-label font-medium">Week of {ci.week_start_date}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      ci.status === 'reviewed'
                        ? 'text-accent border-accent/30 bg-accent/10'
                        : 'text-foreground-secondary border-border'
                    }`}>{ci.status}</span>
                  </div>
                  {ci.body_weight_kg && <p className="text-body">Weight: {ci.body_weight_kg} kg</p>}
                  {ci.client_notes && <p className="text-body text-foreground-secondary mt-1">{ci.client_notes}</p>}
                  {ci.trainer_notes && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-label text-accent mb-1">Your Feedback</p>
                      <p className="text-body">{ci.trainer_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body text-foreground-secondary">No check-ins submitted yet.</p>
          )}
        </section>
      )}

      {/* Workouts tab */}
      {activeTab === 'workouts' && (
        <section>
          <h2 className="text-heading mb-4">Completed Sessions</h2>
          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((s: any) => {
                const totalVolume = (s.workout_session_sets ?? []).reduce(
                  (sum: number, set: any) => sum + (set.reps ?? 0) * (set.weight_kg ?? 0),
                  0
                );
                return (
                  <details key={s.id} className="bg-surface border border-border rounded-xl group">
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                      <div>
                        <p className="text-label font-medium">{(s.workout_templates as any)?.title ?? 'Workout'}</p>
                        <p className="text-caption text-foreground-secondary">
                          {new Date(s.performed_at).toLocaleDateString()}
                          {s.duration_seconds ? ` · ${Math.round(s.duration_seconds / 60)} min` : ''}
                          {totalVolume > 0 ? ` · ${Math.round(totalVolume).toLocaleString()} kg total` : ''}
                        </p>
                      </div>
                      <span className="text-foreground-secondary text-xs group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="px-4 pb-4 border-t border-border pt-3 space-y-1">
                      {(s.workout_session_sets ?? []).map((set: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 text-sm">
                          <span className="text-foreground-secondary w-4">{set.set_number}</span>
                          <span className="text-foreground flex-1">{(set.exercises as any)?.name ?? set.exercise_id}</span>
                          <span className="text-foreground-secondary">{set.weight_kg}kg × {set.reps}</span>
                          {set.rpe && <span className="text-foreground-secondary">RPE {set.rpe}</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <p className="text-body text-foreground-secondary">No workout sessions yet.</p>
          )}
        </section>
      )}

      {/* Progress tab */}
      {activeTab === 'progress' && (
        <section>
          <h2 className="text-heading mb-4">Exercise Progress</h2>
          <ProgressChart clientId={clientId} />
        </section>
      )}
    </div>
  );
}
