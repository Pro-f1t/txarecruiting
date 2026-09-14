// Reviewer guidance shown on Application review: use the whole 1–10 range so
// every reviewer's scores land on a similar bell curve and stay comparable.
const CURVE = [2, 4, 8, 14, 20, 20, 14, 8, 4, 2]; // illustrative %, scores 1..10

type Mine = { counts: number[]; total: number; mean: number | null };

function Histogram({ values, highlightIdx, tone, maxOverride }: { values: number[]; highlightIdx?: (i: number) => boolean; tone: string; maxOverride?: number }) {
  const max = Math.max(1, maxOverride ?? Math.max(...values));
  return (
    <>
      <div className="mt-2 flex h-[88px] items-end gap-1">
        {values.map((v, i) => (
          <div key={i} className="flex w-6 flex-col items-center justify-end gap-1">
            {v > 0 && <span className="text-[10px] leading-none text-muted tabular-nums">{v}</span>}
            <div className="w-full rounded-t-md" style={{ height: `${Math.max(v > 0 ? 3 : 0, (v / max) * 72)}px`, background: highlightIdx?.(i) ? tone : `color-mix(in srgb, ${tone} 45%, transparent)` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {values.map((_, i) => <span key={i} className="w-6 text-center text-[11px] text-muted tabular-nums">{i + 1}</span>)}
      </div>
    </>
  );
}

export default function ScoringGuideCallout({ compact = false, mine }: { compact?: boolean; mine?: Mine }) {
  if (compact) {
    return (
      <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "var(--color-warn)" }}>
        Use the full 1–10 range - your scores across all applicants should form a bell curve centred around 5–6, not cluster at 7–9.
      </p>
    );
  }
  return (
    <div className="card p-6" style={{ border: "1px solid color-mix(in srgb, var(--color-warn) 55%, transparent)", background: "color-mix(in srgb, var(--color-warn) 7%, var(--color-surface))" }}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-[260px] flex-1">
          <p className="t-eyebrow" style={{ color: "var(--color-warn)" }}>How to score - read before grading</p>
          <p className="mt-2 text-[16px] font-semibold">Your general-member scores should form a bell curve across 1–10.</p>
          <ul className="mt-3 space-y-1.5 text-[14px] text-muted">
            <li>• <span className="text-white">Use the whole range.</span> A few applicants deserve a 1–3, most belong in 4–7, and only the standouts get 9–10.</li>
            <li>• <span className="text-white">5–6 is average</span>, not a bad score. If everything you give is a 7, 8, or 9, your scores carry no information.</li>
            <li>• <span className="text-white">Compare across your whole stack</span>, not just to the last person you read. Re-check your early scores once you&apos;ve seen ten or more.</li>
            <li>• <span className="text-white">Say why in the comment.</span> Other reviewers calibrate off your reasoning, not just the number.</li>
          </ul>
          <p className="mt-3 text-[13px] text-muted">We compare raw scores across reviewers without adjustment, so a generous grader and a strict grader would skew the ranking. Grading on the same curve is what keeps it fair.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-8">
          <div aria-label="Ideal score distribution: a bell curve centred on 5 and 6">
            <p className="text-[11px] uppercase tracking-wider text-muted">Ideal spread</p>
            <Histogram values={CURVE} highlightIdx={(i) => i === 4 || i === 5} tone="var(--color-warn)" />
          </div>
          {mine && (
            <div aria-label="Your current score distribution">
              <p className="text-[11px] uppercase tracking-wider text-muted">
                Your distribution <span className="normal-case tracking-normal">(general member only)</span>
                {mine.total > 0 && <span className="ml-2 normal-case tracking-normal text-white">{mine.total} score{mine.total === 1 ? "" : "s"} · avg {mine.mean!.toFixed(1)}</span>}
              </p>
              {mine.total > 0 ? (
                <Histogram values={mine.counts} highlightIdx={(i) => mine.counts[i] === Math.max(...mine.counts)} tone="var(--color-accent)" />
              ) : (
                <div className="mt-2 flex h-[88px] w-[276px] items-center justify-center rounded-2xl text-[13px] text-muted" style={{ background: "rgba(255,255,255,0.04)" }}>
                  No scores yet - your bars appear here as you grade.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
