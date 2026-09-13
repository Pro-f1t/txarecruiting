import { requireStaff } from "@/lib/auth/guard";
import { getAllApplications } from "@/lib/firebase/applications";
import { getRecruitingStep, getInterviewMessage, getStepSchedule } from "@/lib/firebase/config";
import { ApplicationStatus } from "@/lib/models/Application";
import { STEP_LABELS } from "@/lib/models/Config";
import { UserRole } from "@/lib/models/User";
import StepControl from "@/components/StepControl";
import InterviewMessageControl from "@/components/InterviewMessageControl";

export default async function AdminOverview() {
  const { user } = await requireStaff();
  const isAdmin = user.role === UserRole.ADMIN;
  const [apps, step, interviewMessage, schedule] = await Promise.all([getAllApplications(), getRecruitingStep(), getInterviewMessage(), getStepSchedule()]);

  const submitted = apps.filter((a) => a.status === ApplicationStatus.SUBMITTED);
  const drafts = apps.filter((a) => a.status === ApplicationStatus.IN_PROGRESS);
  const leadApps = submitted.filter((a) => a.leadTeams.length > 0);

  // Failsafe readiness for advancing the step.
  let undecidedReview = 0;
  let undecidedFinal = 0;
  for (const a of submitted) {
    const tracks = [...(a.memberTeams.length > 0 ? ["member"] : []), ...a.leadTeams.map((t) => `lead:${t}`)];
    for (const tr of tracks) {
      const rd = a.reviewDecisions?.[tr];
      if (rd !== "advanced" && rd !== "rejected") undecidedReview++;
      else if (rd === "advanced") {
        const fdd = a.finalDecisions?.[tr];
        if (fdd !== "advanced" && fdd !== "rejected") undecidedFinal++;
      }
    }
  }
  const readiness = { undecidedReview, undecidedFinal, interviewMessageSet: interviewMessage != null };

  const started = submitted.length + drafts.length;
  const pctSubmitted = started > 0 ? Math.round((submitted.length / started) * 100) : 0;

  const stats = [
    { k: submitted.length, v: "Submitted applications" },
    { k: leadApps.length, v: "With a lead application" },
    { k: drafts.length, v: "Drafts (not submitted)" },
    { k: `${pctSubmitted}%`, v: "Submitted (of started)" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-px overflow-hidden rounded-[24px] sm:grid-cols-2 lg:grid-cols-4" style={{ background: "rgba(255,255,255,0.06)" }}>
        {stats.map((s) => (
          <div key={s.v} className="bg-surface p-6">
            <p className="text-[32px] font-bold leading-none">{s.k}</p>
            <p className="mt-2 text-[13px] text-muted">{s.v}</p>
          </div>
        ))}
      </div>

      {isAdmin ? (
        <StepControl current={step} readiness={readiness} schedule={schedule ? { at: schedule.at.toISOString(), to: schedule.to } : null} />
      ) : (
        <div className="card flex items-center justify-between gap-4 p-7">
          <div>
            <p className="t-eyebrow">Recruiting step</p>
            <p className="t-body mt-1 text-muted">Only admins can change the recruiting step.</p>
          </div>
          <span className="badge badge-ok">{STEP_LABELS[step]}</span>
        </div>
      )}

      <InterviewMessageControl current={interviewMessage} />
    </div>
  );
}
