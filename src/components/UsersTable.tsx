"use client";

import { useMemo, useState } from "react";

export type UserRow = { uid: string; name: string; email: string; role: string };

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "exec", label: "Exec" },
  { value: "applicant", label: "Applicant" },
] as const;

const ROLE_BADGE: Record<string, string> = { admin: "badge-ok", exec: "badge-warn", applicant: "badge-muted" };
const ROLE_LABEL: Record<string, string> = { admin: "Admin", exec: "Exec", applicant: "Applicant" };
const ROLE_RANK: Record<string, number> = { admin: 0, exec: 1, applicant: 2 };

export default function UsersTable({ rows: initialRows, meUid, canEdit }: { rows: UserRow[]; meUid: string; canEdit: boolean }) {
  const [rows, setRows] = useState<UserRow[]>(initialRows);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "staff">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const admins = rows.filter((r) => r.role === "admin").length;
    const execs = rows.filter((r) => r.role === "exec").length;
    return { admins, execs };
  }, [rows]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter === "staff" && r.role !== "admin" && r.role !== "exec") return false;
        if (n && !`${r.name} ${r.email}`.toLowerCase().includes(n)) return false;
        return true;
      })
      .sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || a.name.localeCompare(b.name));
  }, [rows, q, filter]);

  async function changeRole(uid: string, role: string) {
    setError(null);
    setBusy(uid);
    const prev = rows.find((r) => r.uid === uid)?.role;
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, role } : r))); // optimistic
    try {
      const res = await fetch(`/api/admin/users/${uid}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, role: prev ?? r.role } : r))); // revert
      setError(e instanceof Error ? e.message : "Failed to update role.");
    } finally {
      setBusy(null);
    }
  }

  const field = "rounded-2xl px-4 py-2.5 text-[14px] text-white";
  const fieldStyle = { background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)" } as const;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className={`${field} min-w-[220px] flex-1`} style={fieldStyle} />
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={filter === "staff"} onChange={(e) => setFilter(e.target.checked ? "staff" : "all")} className="h-4 w-4 accent-[var(--color-accent)]" />
          Staff only
        </label>
        <span className="text-[13px] text-muted">{counts.admins} admin{counts.admins === 1 ? "" : "s"} · {counts.execs} exec{counts.execs === 1 ? "" : "s"} · {rows.length} users</span>
      </div>

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      <div className="mt-5 space-y-2">
        {filtered.map((r) => {
          const isMe = r.uid === meUid;
          return (
            <div key={r.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: "var(--color-surface)" }}>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{r.name}{isMe && <span className="ml-2 text-[12px] text-muted">(you)</span>}</p>
                <p className="truncate text-[12px] text-muted">{r.email}</p>
              </div>
              {canEdit ? (
                <div className="flex items-center gap-1.5">
                  {ROLE_OPTIONS.map((opt) => {
                    const active = r.role === opt.value;
                    const selfDemote = isMe && opt.value !== "admin";
                    return (
                      <button
                        key={opt.value}
                        onClick={() => !active && !selfDemote && changeRole(r.uid, opt.value)}
                        disabled={busy === r.uid || active || selfDemote}
                        title={selfDemote ? "You can't remove your own admin access" : undefined}
                        className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:cursor-default"
                        style={
                          active
                            ? { background: opt.value === "admin" ? "var(--color-ok)" : opt.value === "exec" ? "var(--color-warn)" : "var(--color-surface-2)", color: opt.value === "applicant" ? "var(--color-muted)" : "#08050f" }
                            : { background: "var(--color-surface-2)", color: selfDemote ? "rgba(255,255,255,0.25)" : "var(--color-muted)", border: "1px solid rgba(255,255,255,0.12)" }
                        }
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className={`badge ${ROLE_BADGE[r.role] ?? "badge-muted"}`}>{ROLE_LABEL[r.role] ?? r.role}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
