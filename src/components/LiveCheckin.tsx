"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type Batch = { startBucket: number; bucketMs: number; tokens: string[]; offset: number };

export default function LiveCheckin({
  eventId, eventTitle, eventMeta, displayKey, base,
}: {
  eventId: string; eventTitle: string; eventMeta: string; displayKey: string; base: string;
}) {
  const [dataUrl, setDataUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const batch = useRef<Batch | null>(null);

  async function loadBatch() {
    try {
      const r = await fetch(`/api/attendance/tokens?k=${encodeURIComponent(displayKey)}&eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" });
      if (!r.ok) return;
      const { now, bucketMs, tokens } = await r.json();
      batch.current = { startBucket: Math.floor(now / bucketMs), bucketMs, tokens, offset: now - Date.now() };
      setStale(false);
    } catch { /* keep rotating the batch we have */ }
  }

  // Rotate the QR locally off the batch; refill before it runs out.
  useEffect(() => {
    loadBatch();
    let timer: ReturnType<typeof setTimeout>;
    let lastToken = "";
    let refilling = false;
    const tick = async () => {
      const b = batch.current;
      if (b) {
        const serverNow = Date.now() + b.offset;
        const idx = Math.floor(serverNow / b.bucketMs) - b.startBucket;
        if (idx >= b.tokens.length - 12 && !refilling) { refilling = true; loadBatch().finally(() => (refilling = false)); }
        if (idx >= b.tokens.length) setStale(true);
        const tok = b.tokens[Math.max(0, Math.min(idx, b.tokens.length - 1))];
        if (tok && tok !== lastToken) {
          lastToken = tok;
          try {
            setDataUrl(await QRCode.toDataURL(`${base}/c/${eventId}/${tok}`, { margin: 4, width: 900, color: { dark: "#08050f", light: "#ffffff" } }));
          } catch { /* ignore */ }
        }
        setProgress((serverNow % b.bucketMs) / b.bucketMs);
      }
      timer = setTimeout(tick, 120);
    };
    tick();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Counter — slow poll (reads the whole users collection).
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/attendance/count?k=${encodeURIComponent(displayKey)}&eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" });
        if (r.ok) { const { count } = await r.json(); if (alive) setCount(count); }
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, 25000);
    return () => { alive = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-[0.2em] text-muted">Scan to check in</p>
        <h1 className="mt-2 text-[clamp(28px,5vw,52px)] font-bold leading-tight">{eventTitle}</h1>
        <p className="mt-1 text-[15px] text-muted">{eventMeta}</p>
      </div>

      <div className="relative">
        <div className="rounded-[28px] bg-white p-6" style={{ width: "min(70vh, 88vw)", height: "min(70vh, 88vw)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {dataUrl ? <img src={dataUrl} alt="Check-in QR" className="h-full w-full" /> : <div className="h-full w-full" />}
        </div>
        {/* rotation timer bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.round((1 - progress) * 100)}%`, background: "var(--color-accent)", transition: "width 120ms linear" }} />
        </div>
        {stale && <p className="mt-3 text-[13px] text-warn">Reconnecting…</p>}
      </div>

      <div className="text-[15px] text-muted">
        {count === null ? "…" : <><span className="text-[22px] font-bold text-white">{count}</span> checked in</>}
      </div>
    </div>
  );
}
