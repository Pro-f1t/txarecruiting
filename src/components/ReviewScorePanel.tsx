"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScoringGuideCallout from "@/components/ScoringGuideCallout";

type Other = { reviewerName?: string; score: number; comment?: string };

export default function ReviewScorePanel({
  appId, track, stage = "review", myScore, myComment, others, avg, priorAvg, locked = false,
}: {
  appId: string; track: string; stage?: string;
  myScore: number | null; myComment: string; others: Other[]; avg: number | null; priorAvg?: number | null;
  /** Read-only: scoring is closed for this stage. */
  locked?: boolean;
}) {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(myScore);
  const [comment, setComment] = useState(myComment);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Application review hides other reviewers until you've scored (avoids anchoring) unless the
  // stage is locked. Interviews are graded by two people concurrently, so nothing is hidden there.
  const gated = stage === "review" && myScore == null && !locked;

  const save = async () => {
    if (score == null) { setMsg("Pick a score first."); return; }
    if (comment.trim().length === 0) { setMsg("Add a comment explaining your score."); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/score`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, stage, score, comment }),
      });
      const body = await res.json();
      if (!res.ok) { setMsg(body.error || "Failed."); return; }
      setMsg("Saved");
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    } finally { setBusy(false); }
  };

  const clear = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/score`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, stage, clear: true }),
      });
      if (res.ok) { setScore(null); setComment(""); setMsg("Cleared"); router.refresh(); setTimeout(() => setMsg(null), 2000); }
    } finally { setBusy(false); }
  };

  return (
    <div className="card p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-eyebrow">Your rating</p>
        {gated ? (
          <span className="text-[13px] text-muted">Score first to reveal others</span>
        ) : (
          <span className="text-[13px] text-muted">
            Team average: <span className="font-semibold text-white">{avg != null ? avg.toFixed(1) : "-"}</span> · {others.length + (myScore != null ? 1 : 0)} score{others.length + (myScore != null ? 1 : 0) === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {priorAvg != null && (
        <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl px-4 py-3" style={{ background: "var(--color-surface-2)" }}>
          <span className="text-[13px]"><span className="text-muted">Application review:</span> <span className="font-bold">{priorAvg.toFixed(1)}</span></span>
          {myScore != null && avg != null && (
            <>
              <span className="text-[13px]"><span className="text-muted">Interview:</span> <span className="font-bold">{avg.toFixed(1)}</span></span>
              <span className="text-[13px]"><span className="text-muted">Average:</span> <span className="font-bold text-accent">{((priorAvg + avg) / 2).toFixed(1)}</span></span>
            </>
          )}
        </div>
      )}

      {locked && (
        <div className="mt-4 rounded-2xl p-3.5 text-[13px]" style={{ background: "color-mix(in srgb, var(--color-danger) 12%, transparent)", border: "1px solid var(--color-danger)", color: "var(--color-danger)" }}>
          🔒 Scoring is locked - interview invites have been released. Your score and comment are shown for reference.
        </div>
      )}
      {stage === "review" && !locked && <ScoringGuideCallout compact />}

      {/* 1–10 scale */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => !locked && setScore(n)} disabled={locked}
            className="h-10 w-10 rounded-xl text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            style={score === n ? { background: "var(--color-accent)", color: "var(--color-ink)" } : { background: "var(--color-surface-2)", color: "#fff" }}>
            {n}
          </button>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-[13px] text-muted">Comment <span className="text-danger">*</span></span>
        <textarea rows={7} value={comment} onChange={(e) => setComment(e.target.value)} disabled={locked} placeholder="What stood out (good or bad), specific examples from their answers, and any reservations. Other reviewers will read this."
          className="w-full resize-y rounded-2xl px-4 py-3 text-[14px] leading-relaxed text-white outline-none" style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)", minHeight: 168 }} />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={locked || busy || score == null || comment.trim().length === 0} title={comment.trim().length === 0 ? "A comment is required" : undefined} className="pill pill-blue disabled:opacity-50">{busy ? "Saving…" : myScore != null ? "Update score" : "Save score"}</button>
        {myScore != null && !locked && <button onClick={clear} disabled={busy} className="pill pill-ghost">Clear my score</button>}
        {msg && <span className="text-[13px]" style={{ color: msg === "Saved" || msg === "Cleared" ? "var(--color-ok)" : "var(--color-danger)" }}>{msg}</span>}
      </div>

      {/* Other reviewers */}
      {gated ? (
        <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-5">
          <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>🔒</span>
          <p className="text-[13px] text-muted">Other reviewers&apos; scores and comments unlock once you submit your own score.</p>
        </div>
      ) : others.length === 0 ? (
        <p className="mt-6 border-t border-white/10 pt-5 text-[13px] text-muted">No other reviewers have scored this yet.</p>
      ) : (
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-[12px] uppercase tracking-wider text-muted">Other reviewers</p>
          <div className="mt-3 space-y-2">
            {others.map((o, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl p-3" style={{ background: "var(--color-surface-2)" }}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[14px] font-bold" style={{ background: "var(--color-accent)", color: "var(--color-ink)" }}>{o.score}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">{o.reviewerName ?? "Reviewer"}</p>
                  {o.comment && <p className="text-[13px] text-muted">{o.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
