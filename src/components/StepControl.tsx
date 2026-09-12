"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecruitingStep, STEP_ORDER, STEP_LABELS } from "@/lib/models/Config";

const HINTS: Partial<Record<RecruitingStep, string>> = {
  [RecruitingStep.INTERVIEWING]: "Reveals interview decisions to applicants (advanced → Interview + your scheduling message, rejected → Not selected).",
  [RecruitingStep.RELEASE_DECISIONS]: "Reveals final decisions (Accepted / Not selected).",
};

type Readiness = { undecidedReview: number; undecidedFinal: number; interviewMessageSet: boolean };

export default function StepControl({ current, readiness }: { current: RecruitingStep; readiness: Readiness }) {
  const router = useRouter();
  const [step, setStep] = useState<RecruitingStep>(current);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/config/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      });
      const body = await res.json();
      if (!res.ok) { setMsg(body.error || "Failed to update."); return; }
      setMsg("Saved");
      router.refresh();
      setTimeout(() => setMsg(null), 2500);
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const currentIdx = STEP_ORDER.indexOf(current);

  // Failsafe checks relevant to the target step.
  const warnings: string[] = [];
  if (step === RecruitingStep.INTERVIEWING) {
    if (readiness.undecidedReview > 0) warnings.push(`${readiness.undecidedReview} application-review decision${readiness.undecidedReview === 1 ? " is" : "s are"} still pending — those applicants have no Interview/Reject yet.`);
    if (!readiness.interviewMessageSet) warnings.push("No interview scheduling message is set — applicants won't know how to book their interview.");
  }
  if (step === RecruitingStep.RELEASE_DECISIONS && readiness.undecidedFinal > 0) {
    warnings.push(`${readiness.undecidedFinal} interview decision${readiness.undecidedFinal === 1 ? " is" : "s are"} still pending — those interviewees have no Accept/Reject yet.`);
  }

  return (
    <div className="card p-7" style={{ border: "1px solid color-mix(in srgb, var(--color-danger) 45%, transparent)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="t-eyebrow">Recruiting step</p>
          <p className="mt-1 text-[18px] font-semibold">{STEP_LABELS[current]}</p>
        </div>
        <span className="badge badge-warn">Step {currentIdx + 1} / {STEP_ORDER.length}</span>
      </div>

      {/* Bright red danger warning */}
      <div className="mt-4 flex items-start gap-2.5 rounded-2xl p-4"
        style={{ background: "color-mix(in srgb, var(--color-danger) 15%, transparent)", border: "1px solid var(--color-danger)" }}>
        <span className="mt-0.5 shrink-0 text-[16px]" style={{ color: "var(--color-danger)" }}>⚠</span>
        <p className="text-[13px] font-bold leading-relaxed" style={{ color: "var(--color-danger)" }}>
          DO NOT TOUCH THIS unless you know exactly what you&apos;re doing. Changing the step instantly changes what every applicant sees — including revealing interview and final decisions. Set all decisions first.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <select
          value={step}
          onChange={(e) => setStep(e.target.value as RecruitingStep)}
          className="rounded-2xl px-4 py-3 text-[15px] text-white"
          style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {STEP_ORDER.map((s) => (
            <option key={s} value={s}>{STEP_LABELS[s]}</option>
          ))}
        </select>
        <button onClick={() => setConfirmOpen(true)} disabled={saving || step === current} className="pill pill-blue disabled:opacity-50">
          Set step…
        </button>
        {msg && <span className="text-[13px]" style={{ color: msg === "Saved" ? "var(--color-ok)" : "var(--color-danger)" }}>{msg}</span>}
      </div>

      {HINTS[step] && step !== current && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--color-warn)" }}>{HINTS[step]}</p>
      )}

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div className="animate-fade-slide-down w-full max-w-md rounded-[28px] p-7"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-danger)" }}>
            <h3 className="t-card-title" style={{ color: "var(--color-danger)" }}>Change the recruiting step?</h3>
            <p className="t-body mt-3 text-muted">
              You&apos;re about to move from <span className="text-white">{STEP_LABELS[current]}</span> to{" "}
              <span className="text-white">{STEP_LABELS[step]}</span>. This is applied immediately for every applicant.
              {HINTS[step] ? " " + HINTS[step] : ""}
            </p>

            {warnings.length > 0 && (
              <div className="mt-4 rounded-2xl p-4" style={{ background: "color-mix(in srgb, var(--color-warn) 14%, transparent)", border: "1px solid var(--color-warn)" }}>
                <p className="text-[13px] font-bold" style={{ color: "var(--color-warn)" }}>⚠ Before you continue:</p>
                <ul className="mt-2 space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-[12.5px]" style={{ color: "var(--color-warn)" }}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} className="pill pill-ghost">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="pill disabled:opacity-50"
                style={{ background: "var(--color-danger)", color: "#08050f" }}>
                {saving ? "Applying…" : `Yes, set to ${STEP_LABELS[step]}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
