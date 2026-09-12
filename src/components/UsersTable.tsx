"use client";

import { useMemo, useState } from "react";

export type UserRow = { uid: string; name: string; email: string; role: string; canReviewApplications: boolean };

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
  type Pending =
    | { kind: "role"; uid: string; name: string; role: string; label: string }
    | { kind: "review"; uid: string; name: string; allow: boolean };
  const [pending, setPending] = useState<Pending | null>(null);

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

  async function changeReview(uid: string, allow: boolean) {
    setError(null);
    setBusy(uid);
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, canReviewApplications: allow } : r))); // optimistic
    try {
      const res = await fetch(`/api/admin/users/${uid}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canReviewApplications: allow }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, canReviewApplications: !allow } : r))); // revert
      setError(e instanceof Error ? e.message : "Failed to update permission.");
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
              <div className="flex flex-wrap items-center gap-3">
                {r.role === "exec" && (canEdit ? (
                  <button
                    onClick={() => setPending({ kind: "review", uid: r.uid, name: r.name, allow: !r.canReviewApplications })}
                    disabled={busy === r.uid}
                    title={r.canReviewApplications ? "Can score and decide applications — click to revoke" : "Grant access to the Application review tab"}
                    className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
                    style={r.canReviewApplications
                      ? { background: "color-mix(in srgb, var(--color-accent) 18%, transparent)", color: "var(--color-accent)", border: "1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)" }
                      : { background: "var(--color-surface-2)", color: "var(--color-muted)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.canReviewApplications ? "var(--color-accent)" : "rgba(255,255,255,0.25)" }} />
                    Application review {r.canReviewApplications ? "on" : "off"}
                  </button>
                ) : r.canReviewApplications ? (
                  <span className="badge badge-muted">Application review</span>
                ) : null)}
              {canEdit ? (
                <div className="flex items-center gap-1.5">
                  {ROLE_OPTIONS.map((opt) => {
                    const active = r.role === opt.value;
                    const selfDemote = isMe && opt.value !== "admin";
                    return (
                      <button
                        key={opt.value}
                        onClick={() => !active && !selfDemote && setPending({ kind: "role", uid: r.uid, name: r.name, role: opt.value, label: opt.label })}
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
            </div>
          );
        })}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setPending(null)}>
          <div className="card w-full max-w-sm p-7" onClick={(e) => e.stopPropagation()}>
            {pending.kind === "role" ? (
              <>
                <p className="t-eyebrow">Change role</p>
                <p className="t-body mt-3">
                  Set <span className="font-semibold text-white">{pending.name}</span> as <span className="font-semibold text-white">{pending.label}</span>?
                </p>
              </>
            ) : (
              <>
                <p className="t-eyebrow">{pending.allow ? "Grant" : "Revoke"} Application review</p>
                <p className="t-body mt-3">
                  {pending.allow
                    ? <>Let <span className="font-semibold text-white">{pending.name}</span> score applications and advance or reject them at the review stage?</>
                    : <>Remove <span className="font-semibold text-white">{pending.name}</span>&rsquo;s access to Application review? Their existing scores stay.</>}
                </p>
              </>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setPending(null)} className="pill pill-ghost !px-4 !py-2 !text-[13px]">Cancel</button>
              <button
                onClick={() => { const p = pending; setPending(null); if (p.kind === "role") changeRole(p.uid, p.role); else changeReview(p.uid, p.allow); }}
                className="pill pill-blue !px-4 !py-2 !text-[13px]"
              >
                {pending.kind === "role" ? `Set as ${pending.label}` : pending.allow ? "Grant access" : "Revoke access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
