"use client";

import { useMemo, useState } from "react";

export type UserRow = { uid: string; name: string; email: string; role: string };

export default function UsersTable({ rows, meUid }: { rows: UserRow[]; meUid: string }) {
  const [q, setQ] = useState("");
  const [onlyAdmins, setOnlyAdmins] = useState(false);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyAdmins && r.role !== "admin") return false;
      if (n && !`${r.name} ${r.email}`.toLowerCase().includes(n)) return false;
      return true;
    });
  }, [rows, q, onlyAdmins]);

  const field = "rounded-2xl px-4 py-2.5 text-[14px] text-white";
  const fieldStyle = { background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)" } as const;
  const admins = rows.filter((r) => r.role === "admin").length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className={`${field} min-w-[220px] flex-1`} style={fieldStyle} />
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={onlyAdmins} onChange={(e) => setOnlyAdmins(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Admins only
        </label>
        <span className="text-[13px] text-muted">{admins} admin{admins === 1 ? "" : "s"} · {rows.length} users</span>
      </div>

      <div className="mt-5 space-y-2">
        {filtered.map((r) => {
          const isAdmin = r.role === "admin";
          const isMe = r.uid === meUid;
          return (
            <div key={r.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: "var(--color-surface)" }}>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{r.name}{isMe && <span className="ml-2 text-[12px] text-muted">(you)</span>}</p>
                <p className="truncate text-[12px] text-muted">{r.email}</p>
              </div>
              <span className={`badge ${isAdmin ? "badge-ok" : "badge-muted"}`}>{isAdmin ? "Admin" : "Applicant"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
