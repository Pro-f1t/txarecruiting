"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ADMIN_STATUS_LABEL, ADMIN_STATUS_BADGE, type AdminStatus } from "@/lib/utils/adminStatus";

export type Row = {
  id: string;
  userName: string;
  userEmail: string;
  hasMember: boolean;
  hasLead: boolean;
  leadCount: number;
  memberTeams: string[];
  leadTeams: string[];
  rowStatus: AdminStatus | "draft";
};

type StatusFilter = "all" | AdminStatus | "draft";
type TypeFilter = "all" | "member" | "lead";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "awaiting_review", label: "Awaiting review" },
  { value: "awaiting_interview", label: "Awaiting interview" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Drafts" },
];

function badgeFor(s: Row["rowStatus"]) {
  if (s === "draft") return { cls: "badge-warn", label: "Draft" };
  return { cls: ADMIN_STATUS_BADGE[s], label: ADMIN_STATUS_LABEL[s] };
}

export default function ApplicationsTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (type === "member" && !r.hasMember) return false;
      if (type === "lead" && !r.hasLead) return false;
      if (status !== "all" && r.rowStatus !== status) return false;
      if (needle && !`${r.userName} ${r.userEmail}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, type, status]);

  const field = "rounded-2xl px-4 py-2.5 text-[14px] text-white";
  const fieldStyle = { background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)" } as const;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className={`${field} min-w-[200px] flex-1`} style={fieldStyle} />
        <select value={type} onChange={(e) => setType(e.target.value as TypeFilter)} className={field} style={fieldStyle}>
          <option value="all">All applications</option>
          <option value="member">General member</option>
          <option value="lead">Field team lead</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={field} style={fieldStyle}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-[13px] text-muted">{filtered.length} of {rows.length}</span>
      </div>

      <div className="mt-5 space-y-2">
        {filtered.length === 0 && <p className="t-body text-muted">No applications match.</p>}
        {filtered.map((r) => {
          const b = badgeFor(r.rowStatus);
          return (
            <Link key={r.id} href={`/admin/applications/${r.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 transition-colors hover:bg-white/[0.03]"
              style={{ background: "var(--color-surface)" }}>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{r.userName}</p>
                <p className="truncate text-[12px] text-muted">{r.userEmail}</p>
                {r.memberTeams.length > 0 && (
                  <p className="mt-1 truncate text-[12px]"><span className="text-muted">Interested in: </span>{r.memberTeams.join(", ")}</p>
                )}
                {r.leadTeams.length > 0 && (
                  <p className="truncate text-[12px]"><span className="text-muted">Lead: </span>{r.leadTeams.join(", ")}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                {r.hasMember && <span className="badge badge-muted">Member</span>}
                {r.hasLead && <span className="badge badge-warn">Lead · {r.leadCount}</span>}
                <span className={`badge ${b.cls}`}>{b.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
