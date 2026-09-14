"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Prev / Next through the applicants of one track, in the same order as the
 * review board. ← / → keys work too (ignored while typing in a field).
 */
export default function ReviewNav({
  base, track, sort, prevId, nextId, index, total, prevName, nextName,
}: {
  base: string; track: string; sort?: "submitted" | "score"; prevId: string | null; nextId: string | null; index: number; total: number; prevName?: string; nextName?: string;
}) {
  const router = useRouter();
  const href = (id: string) => `${base}/${id}?track=${encodeURIComponent(track)}${sort === "score" ? "&sort=score" : ""}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" && nextId) router.push(href(nextId));
      if (e.key === "ArrowLeft" && prevId) router.push(href(prevId));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevId, nextId, track, base, sort]);

  const btn = "pill pill-ghost !px-4 !py-2 !text-[13px] inline-flex items-center gap-2";
  const disabled = "pointer-events-none opacity-35";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {prevId ? (
        <Link href={href(prevId)} className={btn} title={prevName ? `Previous: ${prevName} (←)` : "Previous (←)"}>← Prev</Link>
      ) : (
        <span className={`${btn} ${disabled}`}>← Prev</span>
      )}
      <span className="text-[13px] text-muted tabular-nums">{index + 1} of {total}{sort === "score" && <span className="ml-1.5 text-[11px] uppercase tracking-wider">by score</span>}</span>
      {nextId ? (
        <Link href={href(nextId)} className="pill pill-blue !px-4 !py-2 !text-[13px] inline-flex items-center gap-2" title={nextName ? `Next: ${nextName} (→)` : "Next (→)"}>Next →</Link>
      ) : (
        <span className={`pill pill-blue !px-4 !py-2 !text-[13px] ${disabled}`}>Next →</span>
      )}
    </div>
  );
}
