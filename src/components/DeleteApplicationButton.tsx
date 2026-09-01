"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteApplicationButton({ appId, name }: { appId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const del = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, { method: "DELETE" });
      if (!res.ok) { const b = await res.json(); setError(b.error || "Failed."); return; }
      router.push("/admin/applications");
      router.refresh();
    } finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="pill !px-4 !py-2 !text-[13px]" style={{ background: "color-mix(in srgb, var(--color-danger) 15%, transparent)", color: "var(--color-danger)", border: "1px solid color-mix(in srgb, var(--color-danger) 40%, transparent)" }}>
        Delete application
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }}>
          <div className="animate-fade-slide-down w-full max-w-md rounded-[28px] p-7" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-danger)" }}>
            <h3 className="t-card-title" style={{ color: "var(--color-danger)" }}>Delete this application?</h3>
            <p className="t-body mt-3 text-muted">
              This permanently deletes <span className="text-white">{name}</span>&apos;s application, all its scores, and decisions. This cannot be undone.
            </p>
            {error && <p className="mt-3 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button onClick={() => setOpen(false)} className="pill pill-ghost">Cancel</button>
              <button onClick={del} disabled={busy} className="pill disabled:opacity-50" style={{ background: "var(--color-danger)", color: "#08050f" }}>
                {busy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
