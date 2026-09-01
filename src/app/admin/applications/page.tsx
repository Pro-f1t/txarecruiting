import { getAllApplications } from "@/lib/firebase/applications";
import { adminStatus } from "@/lib/utils/adminStatus";
import { ApplicationStatus } from "@/lib/models/Application";
import ApplicationsTable, { type Row } from "@/components/ApplicationsTable";
import ExportApplicationsButton from "@/components/ExportApplicationsButton";

export default async function AdminApplications() {
  const apps = await getAllApplications();
  const rows: Row[] = apps.map((a) => ({
    id: a.id,
    userName: a.userName ?? "Unknown",
    userEmail: a.userEmail ?? "",
    hasMember: a.memberTeams.length > 0,
    hasLead: a.leadTeams.length > 0,
    leadCount: a.leadTeams.length,
    rowStatus: a.status === ApplicationStatus.IN_PROGRESS ? "draft" : adminStatus(a),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="t-card-title">Applications</h1>
          <p className="t-body mt-2 text-muted">Search, filter by type and status, then open one to record decisions.</p>
        </div>
        <ExportApplicationsButton />
      </div>
      <div className="mt-6">
        <ApplicationsTable rows={rows} />
      </div>
    </div>
  );
}
