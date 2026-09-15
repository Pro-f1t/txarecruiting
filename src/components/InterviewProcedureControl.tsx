"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_INTERVIEW_PROCEDURE } from "@/lib/interviewProcedure";

export default function InterviewProcedureControl({ current }: { current: string | null }) {
  const router = useRouter();
  const [text, setText] = useState(current ?? DEFAULT_INTERVIEW_PROCEDURE);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = text.trim() !== (current ?? DEFAULT_INTERVIEW_PROCEDURE).trim();

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/config/interview-procedure", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ procedure: text }),
      });
      const body = await res.json();
      if (!res.ok) { setMsg(body.error || "Failed."); return; }
      setMsg("Saved");
      router.refresh();
      setTimeout(() => setMsg(null), 2500);
    } finally { setBusy(false); }
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-eyebrow">Interview procedure</p>
        <span className={`badge ${current ? "badge-ok" : "badge-muted"}`}>{current ? "Custom - shown to interviewers" : "Using the default"}</span>
      </div>
      <p className="t-body mt-2 text-muted">
        Shown at the top of every applicant&apos;s Interview review page. Formatting: a blank line starts a new paragraph, lines starting with <span className="text-white">*</span> or <span className="text-white">-</span> are bullets, <span className="text-white">1.</span> lines are numbered, and <span className="text-white">**text**</span> is bold (use it for must-ask questions).
      </p>
      <textarea rows={16} value={text} onChange={(e) => setText(e.target.value)}
        className="mt-4 w-full resize-y rounded-2xl px-4 py-3 font-mono text-[13px] leading-relaxed text-white outline-none"
        style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)", minHeight: 260 }} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={busy || !dirty} className="pill pill-blue disabled:opacity-50">{busy ? "Saving…" : "Save procedure"}</button>
        <button onClick={() => setText(DEFAULT_INTERVIEW_PROCEDURE)} disabled={busy} className="pill pill-ghost">Reset to default</button>
        <span className="text-[12px] text-muted">{text.length} / 8000</span>
        {msg && <span className="text-[13px]" style={{ color: msg === "Saved" ? "var(--color-ok)" : "var(--color-danger)" }}>{msg}</span>}
      </div>
    </div>
  );
}
