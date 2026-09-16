import { Application } from "@/lib/models/Application";
import type { Conversation } from "@/lib/firebase/conversations";
import { EVENTS, EVENT_TYPE_LABEL } from "@/data/events";

const TYPE_BADGE: Record<string, string> = { info_session: "badge-ok", coffee_chat: "badge-warn", deadline: "badge-danger" };

const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** `max` = the form's word limit for this answer; shows "(130/150 words)", red when over. */
function QA({ label, value, max }: { label: string; value?: string; max?: number }) {
  if (!value) return null;
  const words = max ? wordCount(value) : 0;
  const over = max ? words > max : false;
  return (
    <div>
      <p className="text-[12px] uppercase tracking-wider text-muted">
        {label}
        {max && (
          <span className="ml-2 normal-case tracking-normal tabular-nums" style={{ color: over ? "var(--color-danger)" : "var(--color-muted)" }} title={over ? "Over the limit" : undefined}>
            ({words}/{max} words)
          </span>
        )}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-[14px]">{value}</p>
    </div>
  );
}
/** File extension from a Firebase download URL's object path (or plain URL path). */
function fileExt(url: string): string {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/o\/([^?]+)/);
    const objectPath = m ? decodeURIComponent(m[1]) : u.pathname;
    return (objectPath.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "").toLowerCase();
  } catch { return ""; }
}
const FILE_LABEL: Record<string, string> = { doc: "Word document (.doc)", docx: "Word document (.docx)", pages: "Pages document", txt: "Text file", rtf: "Rich text file", png: "PNG image", jpg: "JPEG image", jpeg: "JPEG image" };

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
/** A prominent, clickable file/link row: label, where it goes, and an Open button. */
function LinkRow({ label, url }: { label: string; url?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 transition-colors hover:bg-white/[0.06]"
      style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="min-w-0">
        <p className="text-[14px] font-medium group-hover:text-accent">{label}</p>
        <p className="truncate text-[12px] text-muted">{hostOf(url)} · <span className="opacity-70">{url}</span></p>
      </div>
      <span className="pill pill-blue !px-4 !py-1.5 !text-[13px] shrink-0">Open ↗</span>
    </a>
  );
}

/** Read-only view of an application's answers + an embedded resume viewer. */
export default function ApplicationAnswers({ app, attendedEventIds = [], conversations = [], showContext = true }: { app: Application; attendedEventIds?: string[]; conversations?: Conversation[]; /** Event attendance + Conversations cards (off on interview review). */ showContext?: boolean }) {
  const fd = app.formData;
  const major = [fd.major, fd.major2].filter(Boolean).join(" & ");
  const fullName = [fd.firstName, fd.lastName].filter(Boolean).join(" ");

  const attended = EVENTS.filter((e) => e.type !== "deadline" && attendedEventIds.includes(e.id));
  const infoAttended = attended.some((e) => e.type === "info_session");
  const coffeeAttended = attended.some((e) => e.type === "coffee_chat");

  return (
    <div className="space-y-8">
      {showContext && (<>
      <div className="card p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="t-eyebrow">Event attendance</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${infoAttended ? "badge-ok" : "badge-danger"}`}>{infoAttended ? "Info session met" : "No info session"}</span>
            <span className={`badge ${coffeeAttended ? "badge-warn" : "badge-muted"}`}>{coffeeAttended ? "Coffee chat ✓" : "No coffee chat"}</span>
          </div>
        </div>
        {attended.length > 0 ? (
          <div className="mt-4 space-y-2">
            {attended.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5" style={{ background: "var(--color-surface-2)" }}>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{e.title}</p>
                  <p className="truncate text-[12px] text-muted">{e.day} {e.date} · {e.time} · {e.location}</p>
                </div>
                <span className={`badge ${TYPE_BADGE[e.type]}`}>{EVENT_TYPE_LABEL[e.type]}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-body mt-4 text-muted">No events checked in yet.</p>
        )}
      </div>

      <div className="card p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="t-eyebrow">Conversations</p>
          {conversations.length > 0 && <span className="badge badge-ok">Talked to by {conversations.length}</span>}
        </div>
        {conversations.length > 0 ? (
          <div className="mt-4 space-y-2">
            {conversations.map((c) => (
              <div key={c.staffUid} className="rounded-2xl p-3.5" style={{ background: "var(--color-surface-2)" }}>
                <p className="text-[14px] font-medium">{c.staffName ?? "An exec"}</p>
                {c.comment && <p className="mt-1 whitespace-pre-wrap text-[13px] text-muted">{c.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="t-body mt-4 text-muted">No one has logged a conversation with this applicant yet.</p>
        )}
      </div>
      </>)}

      <div className="card p-7">
        <p className="t-eyebrow">Application</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <QA label="Name" value={fullName || undefined} />
          <QA label="Field team interests (member)" value={app.memberTeams.length > 0 ? app.memberTeams.join(", ") : undefined} />
          {app.leadTeams.length > 0 && <QA label="Applying to lead" value={app.leadTeams.join(", ")} />}
          <QA label="Major" value={major || undefined} />
          <QA label="Graduation year" value={fd.graduationYear} />
          <QA label="Phone" value={fd.phone} />
          <div className="sm:col-span-2"><QA label="Why Texas Accelerate?" value={fd.whyJoin} max={150} /></div>
          <div className="sm:col-span-2"><QA label="A project they've worked on" value={fd.project} max={150} /></div>
          {fd.imageUrl && (
            <div className="sm:col-span-2">
              <p className="text-[12px] uppercase tracking-wider text-muted">Uploaded image / file</p>
              <a href={fd.imageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fd.imageUrl} alt="Applicant upload" className="max-h-72 rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
              </a>
              <a href={fd.imageUrl} target="_blank" rel="noreferrer" className="mt-1 block text-[13px] text-accent hover:underline">Open ↗</a>
            </div>
          )}
          <QA label="Other commitments" value={fd.otherCommitments} />
          <div className="sm:col-span-2"><QA label="Questions for us" value={fd.questionsForUs} /></div>
        </div>

        {app.leadTeams.length > 0 && (
          <div className="mt-7 border-t border-white/10 pt-6">
            <p className="t-eyebrow">Lead application</p>
            <div className="mt-4 space-y-5">
              <QA label="Prior experience" value={fd.leadAnswers?.leadExperience} max={200} />
              {app.leadTeams.map((t) => (
                <QA key={t} label={`Skills/experience for ${t}`} value={fd.leadAnswers?.leadSkills?.[t]} max={150} />
              ))}
              <div>
                <p className="text-[12px] uppercase tracking-wider text-muted">Work sample / portfolio</p>
                {fd.leadAnswers?.workSample
                  ? <div className="mt-2"><LinkRow label="Open work sample" url={fd.leadAnswers.workSample} /></div>
                  : <p className="mt-1 text-[14px] text-muted">None submitted.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resume viewer */}
      <div className="card p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="t-eyebrow">Resume</p>
          {fd.resumeUrl && <a href={fd.resumeUrl} target="_blank" rel="noreferrer" className="text-[13px] text-accent hover:underline">Open in new tab ↗</a>}
        </div>
        {fd.resumeUrl ? (
          fileExt(fd.resumeUrl) === "pdf" || fileExt(fd.resumeUrl) === "" ? (
            <object data={fd.resumeUrl} type="application/pdf" className="mt-4 h-[600px] w-full rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="t-body mt-4 text-muted">Preview unavailable in this browser. <a href={fd.resumeUrl} target="_blank" rel="noreferrer" className="text-accent">Open the PDF ↗</a></p>
            </object>
          ) : (
            // Not a PDF: browsers can't render it inline and would auto-download it, so show a card instead.
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5" style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{FILE_LABEL[fileExt(fd.resumeUrl)] ?? `${fileExt(fd.resumeUrl).toUpperCase()} file`}</p>
                <p className="mt-0.5 text-[12px] text-muted">Can&apos;t be previewed in the browser - download it to read it. The applicant uploaded this instead of a PDF.</p>
              </div>
              <a href={fd.resumeUrl} download target="_blank" rel="noreferrer" className="pill pill-blue !px-4 !py-2 !text-[13px] shrink-0">Download ↓</a>
            </div>
          )
        ) : (
          <p className="t-body mt-4 text-muted">No resume uploaded.</p>
        )}
      </div>
    </div>
  );
}
