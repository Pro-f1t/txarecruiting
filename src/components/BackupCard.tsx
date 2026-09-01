"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import BackupCheckinButton from "@/components/BackupCheckinButton";

export default function BackupCard({
  eventId, title, time, location, day, date, typeLabel, badgeClass, url, count, initialArmedMs,
}: {
  eventId: string; title: string; time: string; location: string; day: string; date: string;
  typeLabel: string; badgeClass: string; url: string; count: number; initialArmedMs: number;
}) {
  const [open, setOpen] = useState(initialArmedMs > 0); // auto-open if already armed
  const [qr, setQr] = useState("");

  // Generate the QR only when revealed — keeps it out of the page source.
  useEffect(() => {
    if (!open || qr) return;
    QRCode.toDataURL(url, { margin: 1, width: 440, color: { dark: "#08050f", light: "#ffffff" } })
      .then(setQr)
      .catch(() => {});
  }, [open, qr, url]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className={`badge ${badgeClass}`}>{typeLabel}</span>
        <span className="text-[12px] text-muted">{day} {date}</span>
      </div>
      <p className="mt-3 text-[15px] font-semibold">{title}</p>
      <p className="text-[12px] text-muted">{time} · {location}</p>
      <p className="mt-2 text-[13px]"><span className="font-semibold text-white">{count}</span> <span className="text-muted">checked in</span></p>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 w-full rounded-full px-3 py-2 text-[12px] font-semibold transition-colors"
        style={{ background: "var(--color-surface-2)", color: "var(--color-muted)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        {open ? "Hide backup QR ▲" : "Show backup QR ▼"}
      </button>

      {open && (
        <div className="mt-4">
          <div className="mx-auto w-full max-w-[220px] rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr ? <img src={qr} alt="Backup check-in QR" className="w-full" /> : <div className="aspect-square w-full" />}
          </div>
          <div className="mt-3 text-right">
            <a href={url} target="_blank" rel="noreferrer" className="text-[12px] text-accent hover:underline break-all">Open link ↗</a>
          </div>
          <BackupCheckinButton eventId={eventId} initialArmedMs={initialArmedMs} />
        </div>
      )}
    </div>
  );
}
