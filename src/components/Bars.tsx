// Simple horizontal bar chart (server-safe). Optionally stacked (member+lead).
export function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.length === 0 && <p className="t-body text-muted">No data yet.</p>}
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate text-[13px] text-muted" title={d.label}>{d.label}</span>
          <div className="h-6 flex-1 overflow-hidden rounded-full" style={{ background: "var(--color-surface-2)" }}>
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, minWidth: d.value > 0 ? 6 : 0, background: "var(--color-accent)" }} />
          </div>
          <span className="w-8 shrink-0 text-right text-[13px] font-semibold">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// Conversion bars — the advanced portion filled against the total, with a %.
export function StageBars({ data }: { data: { label: string; advanced: number; total: number; pct: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="space-y-2.5">
      {data.length === 0 && <p className="t-body text-muted">No data yet.</p>}
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate text-[13px] text-muted" title={d.label}>{d.label}</span>
          <div className="relative h-6 flex-1 overflow-hidden rounded-full" style={{ background: "var(--color-surface-2)" }}>
            <div className="h-full" style={{ width: `${(d.total / max) * 100}%`, background: "rgba(255,255,255,0.08)" }} />
            <div className="absolute inset-y-0 left-0 h-full rounded-full" style={{ width: `${(d.advanced / max) * 100}%`, background: "var(--color-ok)" }} />
          </div>
          <span className="w-24 shrink-0 text-right text-[12px]"><span className="font-semibold">{d.advanced}/{d.total}</span> <span className="text-muted">· {d.pct}%</span></span>
        </div>
      ))}
    </div>
  );
}

export function StackedBars({ data }: { data: { label: string; member: number; lead: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.member + d.lead));
  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const total = d.member + d.lead;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-44 shrink-0 truncate text-[13px] text-muted" title={d.label}>{d.label}</span>
            <div className="flex h-6 flex-1 overflow-hidden rounded-full" style={{ background: "var(--color-surface-2)" }}>
              <div className="h-full" style={{ width: `${(d.member / max) * 100}%`, background: "var(--color-accent)" }} />
              <div className="h-full" style={{ width: `${(d.lead / max) * 100}%`, background: "var(--color-warn)" }} />
            </div>
            <span className="w-16 shrink-0 text-right text-[12px]">
              <span className="font-semibold">{total}</span>
              <span className="text-muted"> · L{d.lead}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
