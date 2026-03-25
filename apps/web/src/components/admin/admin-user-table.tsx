"use client";

import { useState, useMemo } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { Search, ChevronDown, Link2, Link2Off, UserX, UserCheck } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  deactivated_at: string | null;
  trainer_id: string | null;
}

interface Trainer {
  id: string;
  full_name: string;
}

export function AdminUserTable({ initialUsers, trainers }: { initialUsers: User[]; trainers: Trainer[] }) {
  const supabase = createClientSupabaseClient();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [linkModal, setLinkModal] = useState<{ userId: string; name: string } | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const updateRole = async (userId: string, newRole: string) => {
    setBusy(userId + "-role");
    const { error } = await supabase.from("profiles").update({ role: newRole as any }).eq("id", userId);
    if (!error) setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    setBusy(null);
  };

  const linkTrainer = async () => {
    if (!linkModal || !selectedTrainer) return;
    setBusy(linkModal.userId + "-link");
    const { error } = await supabase.from("trainer_clients").upsert(
      { trainer_id: selectedTrainer, client_id: linkModal.userId, active: true },
      { onConflict: "trainer_id,client_id" }
    );
    if (!error) setUsers((prev) => prev.map((u) => u.id === linkModal.userId ? { ...u, trainer_id: selectedTrainer } : u));
    setLinkModal(null);
    setSelectedTrainer("");
    setBusy(null);
  };

  const unlink = async (userId: string) => {
    setBusy(userId + "-unlink");
    const { error } = await supabase
      .from("trainer_clients")
      .update({ active: false })
      .eq("client_id", userId)
      .eq("active", true);
    if (!error) setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, trainer_id: null } : u));
    setBusy(null);
  };

  const toggleDeactivate = async (u: User) => {
    setBusy(u.id + "-deactivate");
    const val = u.deactivated_at ? null : new Date().toISOString();
    const { error } = await supabase.from("profiles").update({ deactivated_at: val } as any).eq("id", u.id);
    if (!error) setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, deactivated_at: val } : x));
    setBusy(null);
  };

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="trainer">Trainer</option>
          <option value="client">Client</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-foreground-secondary text-left">
              <th className="py-3 px-4 font-medium">User</th>
              <th className="py-3 px-4 font-medium">Email</th>
              <th className="py-3 px-4 font-medium">Role</th>
              <th className="py-3 px-4 font-medium hidden md:table-cell">Joined</th>
              <th className="py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.id}
                className={`border-b border-border/50 last:border-0 transition-colors ${u.deactivated_at ? "opacity-50" : "hover:bg-surface-elevated"}`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {u.full_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{u.full_name}</p>
                      {u.deactivated_at && <span className="text-xs text-foreground-secondary">Deactivated</span>}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-foreground-secondary">{u.email ?? "—"}</td>
                <td className="py-3 px-4">
                  <div className="relative inline-flex items-center gap-1">
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      disabled={busy === u.id + "-role"}
                      className="bg-surface-elevated border border-border rounded-md px-2 py-1 text-xs text-foreground appearance-none pr-6 focus:outline-none focus:border-accent/50 disabled:opacity-50"
                    >
                      <option value="client">client</option>
                      <option value="trainer">trainer</option>
                      <option value="admin">admin</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground-secondary pointer-events-none" />
                  </div>
                </td>
                <td className="py-3 px-4 text-foreground-secondary hidden md:table-cell">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    {u.role === "client" && !u.trainer_id && (
                      <button
                        onClick={() => setLinkModal({ userId: u.id, name: u.full_name })}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-foreground-secondary hover:text-foreground transition-colors"
                        title="Link trainer"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                    )}
                    {u.role === "client" && u.trainer_id && (
                      <button
                        onClick={() => unlink(u.id)}
                        disabled={busy === u.id + "-unlink"}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-foreground-secondary hover:text-amber-400 transition-colors disabled:opacity-50"
                        title="Unlink trainer"
                      >
                        <Link2Off className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleDeactivate(u)}
                      disabled={busy === u.id + "-deactivate"}
                      className="p-1.5 rounded-lg hover:bg-white/[0.06] text-foreground-secondary hover:text-red-400 transition-colors disabled:opacity-50"
                      title={u.deactivated_at ? "Reactivate" : "Deactivate"}
                    >
                      {u.deactivated_at ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Link Trainer Modal */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-border rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="text-heading">Link Trainer to {linkModal.name}</h3>
            <select
              value={selectedTrainer}
              onChange={(e) => setSelectedTrainer(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50"
            >
              <option value="">Select a trainer…</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => { setLinkModal(null); setSelectedTrainer(""); }}
                className="px-4 py-2 rounded-lg text-sm text-foreground-secondary hover:text-foreground border border-border hover:border-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={linkTrainer}
                disabled={!selectedTrainer || busy === linkModal.userId + "-link"}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                Link
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
