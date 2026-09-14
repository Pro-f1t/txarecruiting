"use client";

import { useEffect, useState } from "react";

export default function BackupCheckinButton({ eventId, initialArmedMs }: { eventId: string; initialArmedMs: number }) {
  const [remaining, setRemaining] = useState(initialArmedMs); // ms left, 0 = disarmed
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Count the armed window down.
  useEffect(() => {
    if (remaining <= 0) return;
    const iv = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(iv);
  }, [remaining]);

  const armed = remaining > 0;
  const mins = Math.ceil(remaining / 60000);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/attendance/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, armed: !armed }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      setRemaining(!armed ? 15 * 60 * 1000 : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        onClick={toggle}
        disabled={busy}
        className="w-full rounded-full px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-50"
        style={armed
          ? { background: "var(--color-warn)", color: "#08050f" }
          : { background: "var(--color-surface-2)", color: "var(--color-muted)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        {busy ? "…" : armed ? `Disarm backup QR · ${mins}m left` : "Arm backup QR (15 min)"}
      </button>
      <p className="mt-1.5 text-[11px] text-muted">
        {armed
          ? "The static QR above works now - break-glass only, it disarms itself."
          : "The QR above only works while armed. Use the live display for normal check-in."}
      </p>
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
