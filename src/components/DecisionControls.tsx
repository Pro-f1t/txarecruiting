"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type DecisionItem = {
  key: string;      // `${role}:${team}`
  title: string;    // display
  review?: "advanced" | "rejected" | "pending";
  final?: "advanced" | "rejected" | "pending";
};

const OPTIONS: { value: "advanced" | "rejected" | "pending"; label: string; on: React.CSSProperties }[] = [
  { value: "advanced", label: "Advance", on: { background: "var(--color-ok)", color: "#08050f" } },
  { value: "rejected", label: "Reject", on: { background: "var(--color-danger)", color: "#08050f" } },
  { value: "pending", label: "Clear", on: { background: "var(--color-surface-2)", color: "#fff" } },
];

export default function DecisionControls({ appId, items }: { appId: string; items: DecisionItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const set = async (key: string, stage: "review" | "final", decision: string) => {
    setBusy(`${key}:${stage}`);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, stage, decision }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const Stage = ({ item, stage, current }: { item: DecisionItem; stage: "review" | "final"; current?: string }) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-28 shrink-0 text-[12px] uppercase tracking-wider text-muted">{stage === "review" ? "Interview cut" : "Final decision"}</span>
      {OPTIONS.map((o) => {
        const active = (current ?? "pending") === o.value;
        return (
          <button
            key={o.value}
            onClick={() => set(item.key, stage, o.value)}
            disabled={busy === `${item.key}:${stage}`}
            className="rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
            style={active ? o.on : { background: "rgba(255,255,255,0.06)", color: "var(--color-muted)" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.key} className="rounded-2xl p-5" style={{ background: "var(--color-surface-2)" }}>
          <p className="text-[15px] font-semibold">{item.title}</p>
          <div className="mt-4 space-y-3">
            <Stage item={item} stage="review" current={item.review} />
            <Stage item={item} stage="final" current={item.final} />
          </div>
        </div>
      ))}
    </div>
  );
}
