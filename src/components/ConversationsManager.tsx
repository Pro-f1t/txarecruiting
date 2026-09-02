"use client";

import { useMemo, useState } from "react";

export type ConvRow = {
  uid: string;
  name: string;
  email: string;
  talkedByMe: boolean;
  myComment: string;
  others: { staffName: string; comment: string }[];
};

export default function ConversationsManager({ rows: initial }: { rows: ConvRow[] }) {
  const [rows, setRows] = useState<ConvRow[]>(initial);
  const [q, setQ] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myCount = useMemo(() => rows.filter((r) => r.talkedByMe).length, [rows]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyMine && !r.talkedByMe) return false;
      if (n && !`${r.name} ${r.email}`.toLowerCase().includes(n)) return false;
      return true;
    });
  }, [rows, q, onlyMine]);

  function patch(uid: string, next: Partial<ConvRow>) {
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...next } : r)));
  }

  async function post(applicantUid: string, talked: boolean, comment?: string) {
    const res = await fetch("/api/admin/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantUid, talked, comment }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
  }

  async function toggle(row: ConvRow) {
    const next = !row.talkedByMe;
    setError(null);
    setBusy(row.uid);
    patch(row.uid, { talkedByMe: next, ...(next ? {} : { myComment: "" }) });
    try {
      await post(row.uid, next, next ? row.myComment : undefined);
    } catch (e) {
      patch(row.uid, { talkedByMe: !next }); // revert
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(null);
    }
  }

  async function saveComment(row: ConvRow, comment: string) {
    if (!row.talkedByMe || comment === row.myComment) return;
    setError(null);
    try {
      await post(row.uid, true, comment);
      patch(row.uid, { myComment: comment });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note.");
    }
  }

  const field = "rounded-2xl px-4 py-2.5 text-[14px] text-white";
  const fieldStyle = { background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)" } as const;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className={`${field} min-w-[220px] flex-1`} style={fieldStyle} />
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          I&apos;ve talked to
        </label>
        <span className="text-[13px] text-muted">{myCount} logged by you · {rows.length} people</span>
      </div>

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      <div className="mt-5 space-y-2">
        {filtered.length === 0 && <p className="t-body text-muted">No matching people.</p>}
        {filtered.map((r) => (
          <div key={r.uid} className="rounded-2xl p-4" style={{ background: "var(--color-surface)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{r.name}</p>
                <p className="truncate text-[12px] text-muted">{r.email}</p>
              </div>
              <button
                onClick={() => toggle(r)}
                disabled={busy === r.uid}
                className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50"
                style={r.talkedByMe
                  ? { background: "var(--color-ok)", color: "#08050f" }
                  : { background: "var(--color-surface-2)", color: "var(--color-muted)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {busy === r.uid ? "…" : r.talkedByMe ? "✓ I talked to them" : "Mark I talked to them"}
              </button>
            </div>

            {r.talkedByMe && (
              <input
                defaultValue={r.myComment}
                placeholder="Optional note about your conversation…"
                onBlur={(e) => saveComment(r, e.target.value)}
                className="mt-3 w-full rounded-xl px-3.5 py-2.5 text-[13px] text-white"
                style={fieldStyle}
              />
            )}

            {r.others.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-[12px] uppercase tracking-wider text-muted">Also talked to by</p>
                <div className="mt-1.5 space-y-1">
                  {r.others.map((o, i) => (
                    <p key={i} className="text-[13px]">
                      <span className="font-medium">{o.staffName}</span>
                      {o.comment && <span className="text-muted"> — {o.comment}</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
