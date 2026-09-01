"use client";

import { useMemo, useState } from "react";

export type AttEvent = { id: string; title: string; type: string; date: string; day: string; location: string };
export type AttUser = { uid: string; name: string; email: string; attendedEventIds: string[] };

export default function AttendanceManager({ events, users }: { events: AttEvent[]; users: AttUser[] }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [q, setQ] = useState("");
  const [onlyHere, setOnlyHere] = useState(false);
  // Local, mutable attendance: uid -> Set(eventId)
  const [att, setAtt] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(users.map((u) => [u.uid, [...u.attendedEventIds]]))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const present = (uid: string) => (att[uid] ?? []).includes(eventId);
  const count = useMemo(() => users.filter((u) => (att[u.uid] ?? []).includes(eventId)).length, [att, users, eventId]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return users.filter((u) => {
      if (onlyHere && !(att[u.uid] ?? []).includes(eventId)) return false;
      if (n && !`${u.name} ${u.email}`.toLowerCase().includes(n)) return false;
      return true;
    });
  }, [users, q, onlyHere, att, eventId]);

  async function toggle(uid: string) {
    const next = !present(uid);
    setError(null);
    setBusy(uid);
    // optimistic
    setAtt((prev) => {
      const cur = new Set(prev[uid] ?? []);
      if (next) cur.add(eventId); else cur.delete(eventId);
      return { ...prev, [uid]: [...cur] };
    });
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, eventId, present: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
    } catch (e) {
      // revert
      setAtt((prev) => {
        const cur = new Set(prev[uid] ?? []);
        if (next) cur.delete(eventId); else cur.add(eventId);
        return { ...prev, [uid]: [...cur] };
      });
      setError(e instanceof Error ? e.message : "Failed to update attendance.");
    } finally {
      setBusy(null);
    }
  }

  const field = "rounded-2xl px-4 py-2.5 text-[14px] text-white";
  const fieldStyle = { background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)" } as const;

  return (
    <div>
      {/* Event selector */}
      <div className="flex flex-wrap gap-2">
        {events.map((e) => {
          const active = e.id === eventId;
          return (
            <button
              key={e.id}
              onClick={() => setEventId(e.id)}
              className="rounded-full px-4 py-2 text-[13px] font-semibold transition-colors"
              style={active ? { background: "var(--color-accent)", color: "#08050f" } : { background: "var(--color-surface-2)", color: "var(--color-muted)" }}
            >
              {e.title}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className={`${field} min-w-[220px] flex-1`} style={fieldStyle} />
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={onlyHere} onChange={(e) => setOnlyHere(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Attended only
        </label>
        <span className="text-[13px] text-muted">{count} checked in</span>
      </div>

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      <div className="mt-5 space-y-2">
        {filtered.length === 0 && <p className="t-body text-muted">No matching applicants.</p>}
        {filtered.map((u) => {
          const here = present(u.uid);
          return (
            <div key={u.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: "var(--color-surface)" }}>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{u.name}</p>
                <p className="truncate text-[12px] text-muted">{u.email}</p>
              </div>
              <button
                onClick={() => toggle(u.uid)}
                disabled={busy === u.uid}
                className="rounded-full px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50"
                style={here ? { background: "var(--color-ok)", color: "#08050f" } : { background: "var(--color-surface-2)", color: "var(--color-muted)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {busy === u.uid ? "…" : here ? "✓ Checked in" : "Mark present"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[12px] text-muted">
        Manual overrides for anyone who couldn&apos;t scan. Attendees normally check themselves in via the QR codes above.
      </p>
    </div>
  );
}
