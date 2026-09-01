import { getRecentAudit } from "@/lib/firebase/audit";

export default async function AdminActivity() {
  const entries = await getRecentAudit(100);
  return (
    <div>
      <h1 className="t-card-title">Activity</h1>
      <p className="t-body mt-2 text-muted">Admin actions — decisions and step changes.</p>
      <div className="mt-6 space-y-2">
        {entries.length === 0 && <p className="t-body text-muted">No activity yet.</p>}
        {entries.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: "var(--color-surface)" }}>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{e.action}</p>
              <p className="truncate text-[12px] text-muted">{e.actorName ?? e.actorUid}{e.detail ? ` · ${e.detail}` : ""}{e.target ? ` · ${e.target}` : ""}</p>
            </div>
            <span className="text-[12px] text-muted">{e.at ? new Date(e.at).toLocaleString() : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
