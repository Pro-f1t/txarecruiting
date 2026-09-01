"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InterviewLinkControl({ current }: { current: string | null }) {
  const router = useRouter();
  const [link, setLink] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/config/interview-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
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
      <p className="t-eyebrow">Interview signup link</p>
      <p className="t-body mt-2 text-muted">
        A general link applicants use to book their interview. Once set, it replaces the &ldquo;not available yet&rdquo; placeholder on every interview-stage applicant&apos;s dashboard.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://calendly.com/…"
          className="min-w-[260px] flex-1 rounded-2xl px-4 py-3 text-[15px] text-white" style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)" }} />
        <button onClick={save} disabled={busy} className="pill pill-blue disabled:opacity-50">{busy ? "Saving…" : "Save link"}</button>
        {msg && <span className="text-[13px]" style={{ color: msg === "Saved" ? "var(--color-ok)" : "var(--color-danger)" }}>{msg}</span>}
      </div>
    </div>
  );
}
