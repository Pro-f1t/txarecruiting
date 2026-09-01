"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type ReviewItem = {
  appId: string;
  name: string;
  email: string;
  avg: number | null;
  count: number;
  myScore: number | null;
  decision?: "advanced" | "rejected" | "pending";
  priorAvg?: number | null; // application-review aggregate (shown in interview review)
};
export type Track = { key: string; label: string };

const overall = (a?: number | null, b?: number | null): number | null => {
  const vals = [a, b].filter((v): v is number => v != null);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
};

function Stat({ label, val, highlight }: { label: string; val: number | null | undefined; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[18px] font-bold leading-none" style={highlight ? { color: "var(--color-accent)" } : undefined}>{val != null ? val.toFixed(1) : "—"}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

export default function ReviewBoard({
  tracks, itemsByTrack, decisionStage = "review", detailBase = "/admin/review", advanceLabel = "Interview", dualScore = false,
}: {
  tracks: Track[]; itemsByTrack: Record<string, ReviewItem[]>;
  decisionStage?: "review" | "final"; detailBase?: string; advanceLabel?: string; dualScore?: boolean;
}) {
  const router = useRouter();
  const [track, setTrack] = useState<string>(tracks[0]?.key ?? "");
  const [topN, setTopN] = useState<number>(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [sortByScore, setSortByScore] = useState(false);

  const rawItems = itemsByTrack[track] ?? [];
  const scoreOf = (it: ReviewItem) => (dualScore ? overall(it.priorAvg, it.avg) : it.avg) ?? -1;
  const items = sortByScore ? [...rawItems].sort((a, b) => scoreOf(b) - scoreOf(a)) : rawItems;

  const setDecision = async (appId: string, decision: string) => {
    setBusy(`dec:${appId}`);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/decision`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: track, stage: decisionStage, decision }),
      });
      if (res.ok) router.refresh();
    } finally { setBusy(null); }
  };

  const advanceTopN = async () => {
    const n = Math.max(0, Math.min(topN, items.length));
    if (n === 0) return;
    setBusy("topN");
    try {
      for (const it of items.slice(0, n)) {
        await fetch(`/api/admin/applications/${it.appId}/decision`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: track, stage: decisionStage, decision: "advanced" }),
        });
      }
      router.refresh();
    } finally { setBusy(null); }
  };

  const advancedCount = items.filter((i) => i.decision === "advanced").length;
  const unscored = items.filter((i) => i.myScore == null).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {tracks.map((t) => (
          <button key={t.key} onClick={() => setTrack(t.key)}
            className="rounded-full px-4 py-2 text-[14px] font-semibold transition-colors"
            style={track === t.key ? { background: "var(--color-accent)", color: "var(--color-ink)" } : { background: "var(--color-surface-2)", color: "var(--color-muted)" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {items.length} applicants · {advancedCount} advancing
          {unscored > 0 && <span style={{ color: "var(--color-warn)" }}> · {unscored} not scored by you</span>}
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => setSortByScore((v) => !v)}
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors"
            style={sortByScore ? { background: "var(--color-accent)", color: "var(--color-ink)" } : { background: "var(--color-surface-2)", color: "var(--color-muted)" }}>
            {sortByScore ? "Sorted by score ✓" : "Sort by score"}
          </button>
          <span className="text-[13px] text-muted">Advance top</span>
          <input type="number" min={0} max={items.length} value={topN || ""} onChange={(e) => setTopN(Number(e.target.value))}
            className="w-16 rounded-xl px-3 py-1.5 text-[14px] text-white" style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)" }} />
          <button onClick={advanceTopN} disabled={busy === "topN" || !topN} className="pill pill-blue !px-4 !py-1.5 !text-[13px] disabled:opacity-50">
            {busy === "topN" ? "Advancing…" : "Advance"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.length === 0 && <p className="t-body text-muted">No applicants in this track.</p>}
        {items.map((it, i) => (
          <div key={it.appId} className="flex flex-wrap items-center gap-4 rounded-2xl p-4"
            style={{ background: "var(--color-surface)", border: it.decision === "advanced" ? "1px solid color-mix(in srgb, var(--color-ok) 45%, transparent)" : it.decision === "rejected" ? "1px solid color-mix(in srgb, var(--color-danger) 35%, transparent)" : "1px solid transparent" }}>
            <span className="w-6 shrink-0 text-center text-[14px] font-bold text-muted">{i + 1}</span>

            <Link href={`${detailBase}/${it.appId}?track=${encodeURIComponent(track)}`} className="min-w-[160px] flex-1 group">
              <p className="text-[15px] font-semibold group-hover:text-accent">{it.name}</p>
              <p className="truncate text-[12px] text-muted">{it.email}</p>
            </Link>

            {it.myScore == null
              ? <span className="badge badge-warn">Not scored</span>
              : <span className="text-[12px] text-muted">You: <span className="font-semibold text-white">{it.myScore}</span></span>}

            {dualScore ? (
              <div className="flex items-center gap-4">
                <Stat label="App review" val={it.priorAvg ?? null} />
                <Stat label="Interview" val={it.avg} />
                <Stat label="Avg" val={overall(it.priorAvg, it.avg)} highlight />
              </div>
            ) : (
              <div className="text-center">
                <p className="text-[20px] font-bold leading-none">{it.avg != null ? it.avg.toFixed(1) : "—"}</p>
                <p className="mt-1 text-[11px] text-muted">{it.count} score{it.count === 1 ? "" : "s"}</p>
              </div>
            )}

            <Link href={`${detailBase}/${it.appId}?track=${encodeURIComponent(track)}`} className="pill pill-ghost !px-4 !py-1.5 !text-[13px]">Review</Link>

            <div className="flex items-center gap-2">
              <button onClick={() => setDecision(it.appId, "advanced")} disabled={busy === `dec:${it.appId}`}
                className="rounded-full px-4 py-1.5 text-[13px] font-semibold disabled:opacity-50"
                style={it.decision === "advanced" ? { background: "var(--color-ok)", color: "#08050f" } : { background: "rgba(255,255,255,0.06)", color: "var(--color-muted)" }}>
                {advanceLabel}
              </button>
              <button onClick={() => setDecision(it.appId, "rejected")} disabled={busy === `dec:${it.appId}`}
                className="rounded-full px-4 py-1.5 text-[13px] font-semibold disabled:opacity-50"
                style={it.decision === "rejected" ? { background: "var(--color-danger)", color: "#08050f" } : { background: "rgba(255,255,255,0.06)", color: "var(--color-muted)" }}>
                Reject
              </button>
              {(it.decision === "advanced" || it.decision === "rejected") && (
                <button onClick={() => setDecision(it.appId, "pending")} disabled={busy === `dec:${it.appId}`}
                  className="rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-white disabled:opacity-50">
                  Clear
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
