"use client";

import { useState } from "react";
import { Bars, StackedBars, StageBars } from "@/components/Bars";
import type { TxaStats, CohortStats } from "@/lib/firebase/stats";

type Tab = "all" | "interview" | "accepted";

function Tiles({ tiles }: { tiles: { k: React.ReactNode; v: string }[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-[24px] sm:grid-cols-2 lg:grid-cols-4" style={{ background: "rgba(255,255,255,0.06)" }}>
      {tiles.map((t) => (
        <div key={t.v} className="bg-surface p-6">
          <p className="text-[32px] font-bold leading-none">{t.k}</p>
          <p className="mt-2 text-[13px] text-muted">{t.v}</p>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-7">
      <p className="t-eyebrow">{title}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function CohortView({ c, verb, label }: { c: CohortStats; verb: string; label: string }) {
  return (
    <div className="space-y-8">
      <Tiles tiles={[
        { k: c.total, v: `Applicants ${verb}` },
        { k: `${c.member.pct}%`, v: `Members ${verb}` },
        { k: `${c.member.advanced}/${c.member.total}`, v: "Member pool" },
        { k: c.byTeam.reduce((s, t) => s + t.advanced, 0), v: `Lead ${label} across teams` },
      ]} />
      <Card title={`Field team distribution - ${verb}`}>
        <p className="mb-4 text-[13px] text-muted">
          General members {verb} are counted under every field team they listed, so one person can appear in more than one bar. Leads count only for the team they were {label} for.
        </p>
        {c.teams.length > 0
          ? <StackedBars data={c.teams.map((t) => ({ label: t.team, member: t.member, lead: t.lead }))} />
          : <p className="t-body text-muted">No one {verb} yet.</p>}
      </Card>
      <Card title={`${label[0].toUpperCase() + label.slice(1)} by field team (lead)`}>
        <StageBars data={c.byTeam.map((t) => ({ label: t.team, advanced: t.advanced, total: t.total, pct: t.pct }))} />
      </Card>
      <Card title={`Top majors - ${verb}`}>
        <Bars data={c.majors.map((m) => ({ label: m.value, value: m.count }))} />
      </Card>
    </div>
  );
}

export default function StatsTabs({ s }: { s: TxaStats }) {
  const [tab, setTab] = useState<Tab>("all");
  const tabs: { k: Tab; label: string }[] = [
    { k: "all", label: "All applicants" },
    { k: "interview", label: "Interview stage" },
    { k: "accepted", label: "Accepted" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className="rounded-full px-4 py-2 text-[14px] font-semibold transition-colors"
            style={tab === t.k ? { background: "var(--color-accent)", color: "var(--color-ink)" } : { background: "var(--color-surface-2)", color: "var(--color-muted)" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "all" && (
          <div className="space-y-8">
            <Tiles tiles={[
              { k: s.overall.submitted, v: "Submitted" },
              { k: s.overall.leadApps, v: "With a lead application" },
              { k: s.overall.drafts, v: "Drafts" },
              { k: `${s.overall.pctSubmitted}%`, v: "Submitted (of started)" },
            ]} />
            <div className="card p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="t-eyebrow">Applications by field team</p>
                <div className="flex items-center gap-4 text-[12px] text-muted">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--color-accent)" }} /> Member</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ background: "var(--color-warn)" }} /> Lead</span>
                </div>
              </div>
              <div className="mt-5"><StackedBars data={s.overall.byTeam.map((t) => ({ label: t.team, member: t.member, lead: t.lead }))} /></div>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <Card title="Top majors"><Bars data={s.overall.majors.map((m) => ({ label: m.value, value: m.count }))} /></Card>
              <Card title="Graduation year"><Bars data={s.overall.gradYears.map((g) => ({ label: g.value, value: g.count }))} /></Card>
            </div>
          </div>
        )}
        {tab === "interview" && <CohortView c={s.interview} verb="in the interview stage" label="advanced" />}
        {tab === "accepted" && <CohortView c={s.accepted} verb="accepted" label="accepted" />}
      </div>
    </div>
  );
}
