"use client";

import { useState } from "react";

async function download(path: string, filename: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ExportApplicationsButton() {
  const [busy, setBusy] = useState<"records" | "resumes" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stamp = () => new Date().toISOString().slice(0, 10);

  const run = async (kind: "records" | "resumes") => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "records") await download("/api/admin/applications/export", `txa-recruiting-records-${stamp()}.xlsx`);
      else await download("/api/admin/applications/resumes", `txa-resumes-${stamp()}.zip`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => run("records")} disabled={busy != null} title="Excel workbook: responses, application review, interview review, accepted"
          className="pill inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
          {busy === "records" ? "Exporting…" : "⬇ Export records (.xlsx)"}
        </button>
        <button onClick={() => run("resumes")} disabled={busy != null} title="Zip of every uploaded resume, named by applicant"
          className="pill pill-ghost inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-60">
          {busy === "resumes" ? "Zipping…" : "⬇ Export resumes (.zip)"}
        </button>
      </div>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </div>
  );
}
