"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLACEHOLDER = `Example:
Book ONE 20-minute slot in either room — whichever has a time that works for you.
Room A (PAI 3.14): https://calendly.com/…
Room B (GDC 2.210): https://calendly.com/…
Bring a copy of your resume. Questions? texas.accelerate@gmail.com`;

// `live` = the recruiting step is at Interviewing or later, i.e. applicants can actually see this.
export default function InterviewMessageControl({ current, live = false }: { current: string | null; live?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = message.trim() !== (current ?? "").trim();

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/config/interview-message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
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
        <p className="t-eyebrow">Interview scheduling message</p>
        <span className={`badge ${!current ? "badge-warn" : live ? "badge-ok" : "badge-muted"}`}>
          {!current ? "Not set" : live ? "Live — applicants can see this" : "Saved — hidden until the step is Interviewing"}
        </span>
      </div>
      <p className="t-body mt-2 text-muted">
        Shown only to applicants advanced to interview, and only once the recruiting step is <span className="text-white">Interviewing</span> — nothing is visible during Reviewing. Appears exactly as written here. Put the room links, times, and any instructions in it — URLs become clickable automatically. Applicants interviewing for more than one role are also told to book only one slot.
      </p>
      <textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={PLACEHOLDER}
        className="mt-4 w-full resize-y rounded-2xl px-4 py-3 text-[14px] leading-relaxed text-white outline-none"
        style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)", minHeight: 168 }} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={busy || !dirty} className="pill pill-blue disabled:opacity-50">{busy ? "Saving…" : "Save message"}</button>
        {current && <button onClick={() => setMessage("")} disabled={busy} className="pill pill-ghost">Clear</button>}
        <span className="text-[12px] text-muted">{message.length} / 4000</span>
        {msg && <span className="text-[13px]" style={{ color: msg === "Saved" ? "var(--color-ok)" : "var(--color-danger)" }}>{msg}</span>}
      </div>
    </div>
  );
}
