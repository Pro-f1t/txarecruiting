"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MAJORS, GRAD_YEARS } from "@/data/majors";
import { uploadFile } from "@/lib/firebase/upload";

type TeamOpt = { name: string; title: string };
type LeadPrefill = { leadExperience?: string; leadSkills?: Record<string, string>; workSample?: string };
type Prefill = { memberTeams: string[]; leadTeams: string[]; formData: Record<string, unknown>; status?: string };

const CONTACT_EMAIL = "texas.accelerate@gmail.com";
const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

const field = "w-full rounded-2xl px-4 py-3 text-[15px] text-white outline-none";
const fieldStyle = { background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)" } as const;

export default function ApplyForm({
  uid,
  teams,
  infoAttended,
  editable,
  prefill,
}: {
  uid: string;
  teams: TeamOpt[];
  infoAttended: boolean;
  editable: boolean;
  prefill: Prefill | null;
}) {
  const router = useRouter();
  const isEditing = !!prefill;
  const la = ((prefill?.formData?.leadAnswers as LeadPrefill | undefined) ?? {});
  const prefillCommon = (() => {
    const { leadAnswers: _la, ...rest } = (prefill?.formData ?? {}) as Record<string, unknown>;
    return rest as Record<string, string>;
  })();

  const [memberTeams, setMemberTeams] = useState<string[]>(prefill?.memberTeams ?? []);
  const [applyLead, setApplyLead] = useState<boolean>((prefill?.leadTeams?.length ?? 0) > 0);
  const [leadTeams, setLeadTeams] = useState<string[]>(prefill?.leadTeams ?? []);

  const [f, setF] = useState<Record<string, string>>(prefillCommon);
  const [lead, setLead] = useState<Record<string, string>>({ leadExperience: la.leadExperience ?? "", workSample: la.workSample ?? "" });
  const [skills, setSkills] = useState<Record<string, string>>(la.leadSkills ?? {});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const setL = (k: string, v: string) => setLead((p) => ({ ...p, [k]: v }));
  const setSk = (t: string, v: string) => setSkills((p) => ({ ...p, [t]: v }));
  const teamTitle = (name: string) => teams.find((t) => t.name === name)?.title ?? name;

  const [doubleMajor, setDoubleMajor] = useState<boolean>(!!prefillCommon.major2);
  const [resumeName, setResumeName] = useState(prefill?.formData?.resumeUrl ? "Uploaded resume (PDF)" : "");
  const [imageName, setImageName] = useState(prefill?.formData?.imageUrl ? "Uploaded image" : "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSubmitted = prefill?.status === "submitted";

  const toggle = (list: string[], setList: (v: string[]) => void, name: string) =>
    setList(list.includes(name) ? list.filter((x) => x !== name) : [...list, name]);

  const whyWords = useMemo(() => wordCount(f.whyJoin ?? ""), [f.whyJoin]);
  const projWords = useMemo(() => wordCount(f.project ?? ""), [f.project]);

  const upload = async (folder: string, file: File, setName: (s: string) => void, key: string) => {
    setError(null);
    setUploading(true);
    try {
      const url = await uploadFile(folder, uid, file);
      set(key, url);
      setName(file.name);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const validate = (): string | null => {
    if (memberTeams.length === 0 && leadTeams.length === 0) return "Choose at least one field team.";
    if (!f.resumeUrl) return "Please upload your resume (PDF).";
    if (!f.whyJoin?.trim() || !f.project?.trim()) return "Please answer both required questions.";
    if (whyWords > 150 || projWords > 150) return "Keep the two main answers under 150 words.";
    if (applyLead) {
      if (leadTeams.length === 0) return "Pick at least one field team to lead.";
      if (!lead.leadExperience?.trim()) return "Please answer the leadership experience question.";
      if (leadTeams.some((t) => !skills[t]?.trim())) return "Please answer the skills question for each field team you want to lead.";
    }
    return null;
  };

  const buildBody = (draft: boolean) => ({
    memberTeams,
    leadTeams: applyLead ? leadTeams : [],
    formData: {
      ...f,
      leadAnswers: applyLead
        ? {
            leadExperience: lead.leadExperience,
            workSample: lead.workSample,
            leadSkills: Object.fromEntries(leadTeams.map((t) => [t, skills[t] ?? ""])),
          }
        : undefined,
    },
    draft,
  });

  const doSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(false)),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error || "Submission failed."); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  // Save progress — no completeness checks, no confirmation modal.
  const saveDraft = async () => {
    setError(null);
    setSavedMsg(null);
    setSavingDraft(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(true)),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error || "Couldn't save progress."); return; }
      setSavedMsg("Progress saved");
      setTimeout(() => setSavedMsg(null), 3000);
      router.refresh();
    } catch {
      setError("Couldn't save progress. Please try again.");
    } finally {
      setSavingDraft(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    if (!infoAttended) { setConfirmOpen(true); return; }
    doSubmit();
  };

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-8">
      {isEditing && (
        <div className="card flex items-center justify-between gap-4 p-6">
          <div>
            <p className="t-eyebrow">{isSubmitted ? "Application submitted" : "Draft saved"}</p>
            <p className="t-body mt-1 text-muted">
              {!editable
                ? "Applications are now closed."
                : isSubmitted
                ? "You can keep editing until the deadline."
                : "Your progress is saved. Submit before the deadline to finish."}
            </p>
          </div>
          <span className={`badge ${isSubmitted ? "badge-ok" : "badge-warn"}`}>{isSubmitted ? "Submitted" : "Draft"}</span>
        </div>
      )}

      {/* About you (identity) + lead opt-in */}
      <div className="card p-7">
        <p className="t-eyebrow">About you</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="block">
            <span className="mb-2 block text-[14px] font-medium">Major <Req /></span>
            <select value={f.major ?? ""} onChange={(e) => set("major", e.target.value)} className={field} style={fieldStyle}>
              <option value="">Select your major…</option>
              {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {!doubleMajor ? (
              <button type="button" onClick={() => setDoubleMajor(true)} className="mt-2 text-[13px] font-medium text-accent">
                + I&apos;m double majoring
              </button>
            ) : (
              <div className="mt-3">
                <span className="mb-2 block text-[13px] text-muted">Second major</span>
                <select value={f.major2 ?? ""} onChange={(e) => set("major2", e.target.value)} className={field} style={fieldStyle}>
                  <option value="">Select your second major…</option>
                  {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button type="button" onClick={() => { setDoubleMajor(false); set("major2", ""); }} className="mt-2 text-[13px] text-muted hover:text-white">
                  Remove second major
                </button>
              </div>
            )}
          </div>
          <label className="block">
            <span className="mb-2 block text-[14px] font-medium">Expected graduation year <Req /></span>
            <select value={f.graduationYear ?? ""} onChange={(e) => set("graduationYear", e.target.value)} className={field} style={fieldStyle}>
              <option value="">Select…</option>
              {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-[14px] font-medium">Phone number <Req /></span>
            <input value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="(512) 555-0100" className={field} style={fieldStyle} />
          </label>
        </div>

        <label className="mt-6 flex items-start gap-3 border-t border-white/10 pt-6">
          <input type="checkbox" checked={applyLead} onChange={(e) => setApplyLead(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-accent)]" />
          <span>
            <span className="block text-[15px] font-semibold">I also want to apply to be a Field Team Lead</span>
            <span className="mt-1 block text-[13px] text-muted">
              This is additive to your member application. You can be rejected for the lead role and still be accepted as a member — the two don&apos;t directly influence each other.
            </span>
          </span>
        </label>
      </div>

      {/* Field Team Lead questions (revealed) */}
      {applyLead && (
        <div className="card space-y-6 p-7">
          <div>
            <p className="t-eyebrow">Field team lead application</p>
            <p className="t-body mt-2 text-muted">
              Prior leadership experience is <span className="text-white">required</span> to apply for a lead role. Questions marked <Req /> must be answered.
            </p>
          </div>
          <div>
            <span className="mb-2 block text-[14px] font-medium">Which of our field teams would you be interested in leading? <Req /> <span className="text-muted">(choose one or more)</span></span>
            <div className="grid gap-3 sm:grid-cols-2">
              {teams.map((t) => (
                <Check key={t.name} label={t.title} checked={leadTeams.includes(t.name)} onClick={() => toggle(leadTeams, setLeadTeams, t.name)} />
              ))}
            </div>
          </div>
          <Long label="Describe prior experience that demonstrates project management and top-down communication skills." value={lead.leadExperience ?? ""} onChange={(v) => setL("leadExperience", v)} required max={200} count={wordCount(lead.leadExperience ?? "")} />
          {leadTeams.length === 0 ? (
            <p className="t-body text-muted">Select the field team(s) you want to lead above to answer the skills question for each.</p>
          ) : (
            leadTeams.map((t) => (
              <Long key={t} label={`Describe relevant skills/prior experience you have for ${teamTitle(t)}.`} value={skills[t] ?? ""} onChange={(v) => setSk(t, v)} required max={100} count={wordCount(skills[t] ?? "")} />
            ))
          )}
          <label className="block">
            <span className="mb-2 block text-[14px] font-medium">If applicable, show us a work sample/portfolio that demonstrates those skills. Attach a publicly accessible link (e.g. Google Drive). (optional)</span>
            <input value={lead.workSample ?? ""} onChange={(e) => setL("workSample", e.target.value)} placeholder="https://…" className={field} style={fieldStyle} />
          </label>
        </div>
      )}

      {/* Separator — the general member application begins here */}
      <div className="flex items-center gap-4 pt-2">
        <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
        <span className="t-eyebrow whitespace-nowrap">General member application</span>
        <span className="h-px flex-1" style={{ background: "rgba(255,255,255,0.12)" }} />
      </div>

      {/* Resume — its own box with preview */}
      <div className="card p-7">
        <p className="t-eyebrow">Resume <Req /></p>
        <p className="t-body mt-2 text-muted">Upload your resume as a PDF. Required.</p>
        <div className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3" style={fieldStyle}>
          <label className="cursor-pointer shrink-0">
            <span className="pill pill-ghost !px-3 !py-1.5 !text-[13px]">{f.resumeUrl ? "Replace PDF" : "Choose PDF"}</span>
            <input type="file" accept="application/pdf,.pdf" className="hidden"
              onChange={(e) => e.target.files?.[0] && upload("resumes", e.target.files[0], setResumeName, "resumeUrl")} />
          </label>
          {f.resumeUrl ? (
            <a href={f.resumeUrl} target="_blank" rel="noreferrer" className="truncate text-[13px] font-medium text-accent hover:underline">
              {resumeName || "Uploaded resume (PDF)"} · Preview ↗
            </a>
          ) : (
            <span className="truncate text-[13px] text-muted">No file selected</span>
          )}
        </div>
      </div>

      {/* Member field teams */}
      <div className="card p-7">
        <p className="t-eyebrow">Field teams</p>
        <p className="t-body mt-2 text-muted">
          Which field team(s) do you want to join? <span className="text-white">You can choose more than one.</span>
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {teams.map((t) => (
            <Check key={t.name} label={t.title} checked={memberTeams.includes(t.name)} onClick={() => toggle(memberTeams, setMemberTeams, t.name)} />
          ))}
        </div>
      </div>

      {/* Member questions */}
      <div className="card space-y-6 p-7">
        <Long label="Why are you interested in joining Texas Accelerate?" value={f.whyJoin ?? ""} onChange={(v) => set("whyJoin", v)} required max={150} count={whyWords} />
        <Long
          label="Explain a project that you've worked on. This doesn't have to be professional — tell us about something that makes you tick, from arts and crafts to public speaking to volunteering. We want to see passion, so be clear about what you actually did and what it means to you."
          value={f.project ?? ""} onChange={(v) => set("project", v)} required max={150} count={projWords}
        />
        <div className="block">
          <span className="mb-2 block text-[14px] font-medium">
            Upload something that appeals to you — share something about yourself, your interests, or what is meaningful to you. This is open-ended — have fun! <span className="text-muted">(PNG, JPEG, or PDF)</span> <Req />
          </span>
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={fieldStyle}>
            <label className="cursor-pointer shrink-0">
              <span className="pill pill-ghost !px-3 !py-1.5 !text-[13px]">{f.imageUrl ? "Replace file" : "Choose file"}</span>
              <input type="file" accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf" className="hidden"
                onChange={(e) => e.target.files?.[0] && upload("images", e.target.files[0], setImageName, "imageUrl")} />
            </label>
            {f.imageUrl ? (
              <a href={f.imageUrl} target="_blank" rel="noreferrer" className="truncate text-[13px] font-medium text-accent hover:underline">
                {imageName || "Uploaded file"} · Preview ↗
              </a>
            ) : (
              <span className="truncate text-[13px] text-muted">No file selected</span>
            )}
          </div>
        </div>
        <Long label="What are your other major commitments for the semester? (optional)" value={f.otherCommitments ?? ""} onChange={(v) => set("otherCommitments", v)} />
        <Long label="Any questions for us? (optional)" value={f.questionsForUs ?? ""} onChange={(v) => set("questionsForUs", v)} />
      </div>

      {error && <p className="text-[14px]" style={{ color: "var(--color-danger)" }}>{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={submitting || savingDraft || uploading || !editable} className="pill pill-blue disabled:opacity-50">
          {submitting ? "Submitting…" : uploading ? "Uploading…" : isSubmitted ? "Save changes" : "Submit application"}
        </button>
        <button type="button" onClick={saveDraft} disabled={submitting || savingDraft || uploading || !editable} className="pill pill-ghost disabled:opacity-50">
          {savingDraft ? "Saving…" : "Save progress"}
        </button>
        {savedMsg && <span className="text-[13px]" style={{ color: "var(--color-ok)" }}>{savedMsg} ✓</span>}
        {!editable && <span className="text-[13px] text-muted">Applications are closed — the deadline has passed.</span>}
        {editable && !infoAttended && <span className="text-[13px] text-muted">You haven&apos;t checked in at an info session yet.</span>}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="animate-fade-slide-down w-full max-w-md rounded-[28px] p-7" style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <h3 className="t-card-title">Submit without an info session?</h3>
            <p className="t-body mt-3 text-muted">
              Attending an info session is required to apply. You can still submit, but your application may not be considered. If you have questions or a problem, email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent">{CONTACT_EMAIL}</a>.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setConfirmOpen(false)} className="pill pill-ghost">Go back</button>
              <button type="button" onClick={doSubmit} disabled={submitting} className="pill pill-blue disabled:opacity-50">
                {submitting ? "Submitting…" : "Submit anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function Req() { return <span style={{ color: "var(--color-danger)" }}>*</span>; }

function Check({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] font-medium transition-colors"
      style={checked ? { background: "var(--color-accent)", color: "var(--color-ink)" } : { background: "var(--color-surface-2)", color: "#fff" }}>
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[12px] font-bold"
        style={checked ? { background: "var(--color-ink)", color: "var(--color-accent)" } : { border: "2px solid rgba(255,255,255,0.25)" }}>
        {checked ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

function Long({ label, value, onChange, required, max, count }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; max?: number; count?: number }) {
  const over = max != null && count != null && count > max;
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium">{label} {required && <Req />}</span>
      <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className={field} style={fieldStyle} />
      {max != null && (
        <span className="mt-1 block text-right text-[12px]" style={{ color: over ? "var(--color-danger)" : "var(--color-muted)" }}>
          {count} / {max} words
        </span>
      )}
    </label>
  );
}
