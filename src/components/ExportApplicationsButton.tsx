"use client";

import { useState } from "react";

export default function ExportApplicationsButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/applications/export");
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `txa-applications-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={exportCsv}
        disabled={busy}
        className="pill inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-60"
      >
        {busy ? "Exporting…" : "⬇ Export all (CSV)"}
      </button>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </div>
  );
}
