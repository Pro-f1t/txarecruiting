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

/** Turn bare http(s) URLs in admin-written text into links; keep line breaks. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"')\]]+)/g);
  return (
    <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part)
          ? <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all font-medium text-accent underline underline-offset-2 hover:opacity-80">{part}</a>
          : <span key={i}>{part}</span>
      )}
    </p>
  );
}

// Interview booking deadline shown on the scheduling card. Update each cycle.
const INTERVIEW_BOOKING_DEADLINE = "11:59 PM, Monday Sep 14";

/** Shown once, above the cards, when any track is at the interview stage. */
function InterviewSchedule({ message, interviewCount }: { message: string | null; interviewCount: number }) {
  return (
    <section className="card p-7" style={{ border: "2px solid var(--color-warn)", boxShadow: "0 0 0 4px color-mix(in srgb, var(--color-warn) 18%, transparent)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[18px] font-bold" style={{ background: "var(--color-warn)", color: "#08050f" }}>!</span>
          <div>
            <p className="t-eyebrow" style={{ color: "var(--color-warn)" }}>Action required</p>
            <p className="text-[20px] font-semibold leading-tight">Schedule your interview</p>
          </div>
        </div>
        <span className="badge badge-warn !text-[12px]">Book by {INTERVIEW_BOOKING_DEADLINE}</span>
      </div>
      <p className="mt-4 text-[15px] font-semibold" style={{ color: "var(--color-warn)" }}>
        You must book your interview slot by {INTERVIEW_BOOKING_DEADLINE}.
      </p>
      {interviewCount > 1 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl p-4"
          style={{ background: "color-mix(in srgb, var(--color-danger) 15%, transparent)", border: "1px solid var(--color-danger)" }}>
          <span className="mt-0.5 shrink-0 text-[16px]" style={{ color: "var(--color-danger)" }}>⚠</span>
          <p className="text-[13px] font-bold leading-relaxed" style={{ color: "var(--color-danger)" }}>
            You&apos;re interviewing for {interviewCount} roles — please book ONLY ONE interview.
          </p>
        </div>
      )}
      {message ? (
        <div className="mt-4 rounded-2xl p-5" style={{ background: "var(--color-surface-2)" }}>
          <RichText text={message} />
        </div>
      ) : (
        <p className="t-body mt-3 text-muted">Interview scheduling details aren&apos;t available yet. Please check back soon.</p>
      )}
    </section>
  );
}

export default function ApplicationCards({ cards, formData, interviewMessage = null }: { cards: AppCard[]; formData: FormData; interviewMessage?: string | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const interviewCount = cards.filter((c) => c.status === "interview").length;

  return (
    <div className="mt-4 space-y-4">
      {interviewCount > 0 && <InterviewSchedule message={interviewMessage} interviewCount={interviewCount} />}
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
