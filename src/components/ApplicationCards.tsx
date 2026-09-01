"use client";

import { useState } from "react";
import { STAGES, STATUS_PRESENTATION, nodeStates, type AppCard } from "@/lib/utils/applicantStatus";

type FormData = {
  major?: string;
  major2?: string;
  graduationYear?: string;
  phone?: string;
  resumeUrl?: string;
  imageUrl?: string;
  whyJoin?: string;
  project?: string;
  otherCommitments?: string;
  questionsForUs?: string;
  leadAnswers?: { leadExperience?: string; leadSkills?: Record<string, string>; workSample?: string };
};

const NODE_COLOR = {
  done: "var(--color-accent)",
  active: "var(--color-accent)",
  failed: "var(--color-danger)",
  todo: "transparent",
} as const;

function Stepper({ status }: { status: AppCard["status"] }) {
  const states = nodeStates(status);
  return (
    <div className="mt-5 flex items-center">
      {STAGES.map((s, i) => {
        const st = states[i];
        const filled = st === "done" || st === "active" || st === "failed";
        return (
          <div key={s} className="flex flex-1 items-center gap-2 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  lineHeight: 1,
                  fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
                  ...(filled
                    ? { background: NODE_COLOR[st], color: "#08050f" }
                    : { border: "2px solid rgba(255,255,255,0.18)", color: "var(--color-muted)" }),
                }}
              >
                <span style={{ display: "block", transform: "translateY(0.5px)" }}>
                  {st === "done" ? "✓" : st === "failed" ? "✕" : i + 1}
                </span>
              </span>
              <span className="text-[12px]" style={{ color: filled ? "#fff" : "var(--color-muted)" }}>{s}</span>
            </div>
            {i < STAGES.length - 1 && (
              <span className="h-px flex-1" style={{ background: states[i] === "done" ? "var(--color-accent)" : "rgba(255,255,255,0.12)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function QA({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[12px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-[14px] whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function FileLink({ label, url }: { label: string; url?: string }) {
  if (!url) return null;
  return (
    <div>
      <p className="text-[12px] uppercase tracking-wider text-muted">{label}</p>
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[14px] font-medium text-accent hover:underline">Open ↗</a>
    </div>
  );
}

function InterviewSchedule({ team, link, copied, onCopy }: { team: string; link: string | null; copied: boolean; onCopy: (link: string) => void }) {
  return (
    <div className="border-t border-white/10 p-7">
      <p className="t-eyebrow">Schedule your interview</p>
      {link ? (
        <>
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl p-4"
            style={{ background: "color-mix(in srgb, var(--color-warn) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--color-warn) 40%, transparent)" }}>
            <span className="mt-0.5 shrink-0" style={{ color: "var(--color-warn)" }}>⚠</span>
            <p className="text-[12.5px] font-medium leading-relaxed" style={{ color: "var(--color-warn)" }}>
              Do not distribute this link. It is for your use only — sharing it could let someone else book your interview slot.
            </p>
          </div>
          <div className="mt-3 rounded-2xl p-4" style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-[12px] text-muted">Your signup link — {team}</p>
            <p className="mt-1 break-all text-[13px]">{link}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a href={link} target="_blank" rel="noreferrer" className="pill pill-blue !px-4 !py-2 !text-[13px]">Open signup form ↗</a>
              <button type="button" onClick={() => onCopy(link)} className="pill pill-ghost !px-4 !py-2 !text-[13px]">{copied ? "Copied ✓" : "Copy link"}</button>
            </div>
          </div>
        </>
      ) : (
        <p className="t-body mt-3 text-muted">Your interview signup link isn&apos;t available yet. Please check back soon.</p>
      )}
    </div>
  );
}

export default function ApplicationCards({ cards, formData, interviewLink = null }: { cards: AppCard[]; formData: FormData; interviewLink?: string | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyLink = (key: string, link: string) => {
    try {
      navigator.clipboard?.writeText(link);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {}
  };

  return (
    <div className="mt-4 space-y-4">
      {cards.map((c) => {
        const p = STATUS_PRESENTATION[c.status];
        const expanded = open === c.key;
        const major = [formData.major, formData.major2].filter(Boolean).join(" & ");
        return (
          <section key={c.key} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : c.key)}
              aria-expanded={expanded}
              className="block w-full p-7 text-left transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-semibold">{c.title}</h3>
                  {c.kind === "member" && <p className="mt-1 text-[13px] text-muted">Field teams: {c.teams.join(", ")}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${p.badgeClass}`}>{p.badge}</span>
                  <span className="text-[13px] text-muted">{expanded ? "Hide ▲" : "View ▼"}</span>
                </div>
              </div>

              <Stepper status={c.status} />
              <p className="t-body mt-5 text-muted">{p.message}</p>
            </button>

            {c.status === "interview" && (
              <InterviewSchedule
                team={c.teams.join(", ")}
                link={interviewLink}
                copied={copiedKey === `sched:${c.key}`}
                onCopy={(link) => copyLink(`sched:${c.key}`, link)}
              />
            )}

            {expanded && (
              <div className="animate-fade-slide-down border-t border-white/10 p-7">
                <div className="grid gap-5 sm:grid-cols-2">
                  {c.kind === "member" ? (
                    <>
                      <QA label="Major" value={major || undefined} />
                      <QA label="Graduation year" value={formData.graduationYear} />
                      <QA label="Phone" value={formData.phone} />
                      <FileLink label="Resume" url={formData.resumeUrl} />
                      <div className="sm:col-span-2"><QA label="Why Texas Accelerate?" value={formData.whyJoin} /></div>
                      <div className="sm:col-span-2"><QA label="A project you've worked on" value={formData.project} /></div>
                      <FileLink label="Uploaded file" url={formData.imageUrl} />
                      <QA label="Other commitments" value={formData.otherCommitments} />
                      <div className="sm:col-span-2"><QA label="Questions for us" value={formData.questionsForUs} /></div>
                    </>
                  ) : (
                    <>
                      <div className="sm:col-span-2"><QA label="Prior experience" value={formData.leadAnswers?.leadExperience} /></div>
                      <div className="sm:col-span-2"><QA label={`Relevant skills/experience for ${c.teams[0]}`} value={formData.leadAnswers?.leadSkills?.[c.teams[0]]} /></div>
                      <FileLink label="Work sample/portfolio" url={formData.leadAnswers?.workSample} />
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
