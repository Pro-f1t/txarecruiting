import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guard";
import { getApplication } from "@/lib/firebase/applications";
import { getUser } from "@/lib/firebase/users";
import { getConversationsForApplicant } from "@/lib/firebase/conversations";
import { getRecruitingStep } from "@/lib/firebase/config";
import { UserRole } from "@/lib/models/User";
import { STEP_LABELS } from "@/lib/models/Config";
import { adminStatus, ADMIN_STATUS_LABEL, ADMIN_STATUS_BADGE } from "@/lib/utils/adminStatus";
import ApplicationAnswers from "@/components/ApplicationAnswers";
import DeleteApplicationButton from "@/components/DeleteApplicationButton";

export default async function AdminApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireStaff();
  const isAdmin = user.role === UserRole.ADMIN;
  const [app, step] = await Promise.all([getApplication(id), getRecruitingStep()]);
  if (!app) notFound();
  const applicant = await getUser(app.userId);
  const conversations = await getConversationsForApplicant(app?.userId ?? id);

  const status = adminStatus(app);
  const isDraft = app.status === "in_progress";

  return (
    <div>
      <Link href="/admin/applications" className="text-[13px] text-muted hover:text-white">← All applications</Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="t-card-title">{app.userName}</h1>
          <p className="text-[13px] text-muted">{app.userEmail}</p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          <span className={`badge ${isDraft ? "badge-warn" : ADMIN_STATUS_BADGE[status]}`}>{isDraft ? "Draft" : ADMIN_STATUS_LABEL[status]}</span>
          <span className="text-[12px] text-muted">Recruiting step: {STEP_LABELS[step]}</span>
          {isAdmin && <DeleteApplicationButton appId={app.id} name={app.userName ?? "this applicant"} />}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
        {app.memberTeams.length > 0 && <span className="badge badge-muted">Member · {app.memberTeams.join(", ")}</span>}
        {app.leadTeams.length > 0 && <span className="badge badge-warn">Lead · {app.leadTeams.join(", ")}</span>}
      </div>

      <p className="t-body mt-4 text-muted">Read-only preview. To score or decide, use Review.</p>

      <div className="mt-6">
        <ApplicationAnswers app={app} attendedEventIds={applicant?.attendedEventIds ?? []} conversations={conversations} />
      </div>
    </div>
  );
}
