"use client";

import { useState, useRef } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { Search, Pencil, Trash2, Upload, X, Check } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  level: string;
  primary_muscles: string[];
  image_paths: string[];
}

export function AdminExerciseTable({ initialExercises, totalCount }: { initialExercises: Exercise[]; totalCount: number }) {
  const supabase = createClientSupabaseClient();
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [search, setSearch] = useState("");
  const [editEx, setEditEx] = useState<Exercise | null>(null);
  const [editForm, setEditForm] = useState<Partial<Exercise & { secondary_muscles: string[]; instructions: string[] }>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (ex: Exercise) => {
    setEditEx(ex);
    setEditForm({ ...ex, secondary_muscles: [], instructions: [] });
  };

  const saveEdit = async () => {
    if (!editEx) return;
    setBusy(true);
    const { error } = await supabase
      .from("exercises")
      .update({
        name: editForm.name,
        category: editForm.category,
        equipment: editForm.equipment,
        level: editForm.level,
        primary_muscles: editForm.primary_muscles,
        secondary_muscles: editForm.secondary_muscles,
        instructions: editForm.instructions,
      })
      .eq("id", editEx.id);
    if (!error) {
      setExercises((prev) =>
        prev.map((e) => e.id === editEx.id ? { ...e, ...editForm } as Exercise : e)
      );
      setEditEx(null);
    }
    setBusy(false);
  };

  const deleteEx = async () => {
    if (!deleteId) return;
    setBusy(true);
    const { error } = await supabase.from("exercises").delete().eq("id", deleteId);
    if (!error) setExercises((prev) => prev.filter((e) => e.id !== deleteId));
    setDeleteId(null);
    setBusy(false);
  };

  const importJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const arr: Exercise[] = JSON.parse(text);
      const chunks = Array.from({ length: Math.ceil(arr.length / 50) }, (_, i) => arr.slice(i * 50, i * 50 + 50));
      for (const chunk of chunks) {
        await supabase.from("exercises").upsert(chunk as any, { onConflict: "id" });
      }
      // Refresh first page
      const { data } = await supabase.from("exercises").select("id, name, category, equipment, level, primary_muscles, image_paths").order("name").limit(50);
      if (data) setExercises(data);
    } catch {}
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises…"
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-accent/50"
          />
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border text-sm text-foreground hover:bg-surface-elevated transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" /> Import JSON
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-foreground-secondary text-left">
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium hidden sm:table-cell">Category</th>
              <th className="py-3 px-4 font-medium hidden md:table-cell">Equipment</th>
              <th className="py-3 px-4 font-medium hidden md:table-cell">Level</th>
              <th className="py-3 px-4 font-medium hidden lg:table-cell">Muscles</th>
              <th className="py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ex) => (
              <tr key={ex.id} className="border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors">
                <td className="py-3 px-4 font-medium text-foreground">{ex.name}</td>
                <td className="py-3 px-4 text-foreground-secondary hidden sm:table-cell capitalize">{ex.category}</td>
                <td className="py-3 px-4 text-foreground-secondary hidden md:table-cell capitalize">{ex.equipment ?? '—'}</td>
                <td className="py-3 px-4 text-foreground-secondary hidden md:table-cell capitalize">{ex.level}</td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {ex.primary_muscles.slice(0, 2).map((m) => (
                      <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 capitalize">{m}</span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(ex)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-foreground-secondary hover:text-foreground transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(ex.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-foreground-secondary hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Slide-over */}
      {editEx && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setEditEx(null)} />
          <div className="w-full max-w-md bg-surface-elevated border-l border-border flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-heading">Edit Exercise</h3>
              <button onClick={() => setEditEx(null)} className="p-1 rounded-lg hover:bg-white/[0.06] text-foreground-secondary hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 flex-1">
              {[
                { key: "name", label: "Name", type: "text" },
                { key: "category", label: "Category", type: "text" },
                { key: "equipment", label: "Equipment", type: "text" },
                { key: "level", label: "Level", type: "text" },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-label text-foreground-secondary mb-1.5 block">{label}</label>
                  <input
                    type={type}
                    value={(editForm as any)[key] ?? ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
                  />
                </div>
              ))}
              <div>
                <label className="text-label text-foreground-secondary mb-1.5 block">Primary Muscles (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.primary_muscles?.join(", ") ?? ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, primary_muscles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="text-label text-foreground-secondary mb-1.5 block">Secondary Muscles (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.secondary_muscles?.join(", ") ?? ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, secondary_muscles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="text-label text-foreground-secondary mb-1.5 block">Instructions (one per line)</label>
                <textarea
                  rows={6}
                  value={editForm.instructions?.join("\n") ?? ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, instructions: e.target.value.split("\n").filter(Boolean) }))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50 resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-border">
              <button
                onClick={saveEdit}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-border rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="text-heading">Delete Exercise?</h3>
            <p className="text-body text-foreground-secondary">This action cannot be undone. The exercise will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-sm border border-border text-foreground-secondary hover:text-foreground transition-colors">Cancel</button>
              <button onClick={deleteEx} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30 transition-colors disabled:opacity-50">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
