import { NextResponse } from "next/server";
import { requireAdmin, guardErrorStatus } from "@/lib/auth/guard";
import { getAllApplications } from "@/lib/firebase/applications";
import { getAllUsers } from "@/lib/firebase/users";
import { ApplicationStatus } from "@/lib/models/Application";
import { adminStatus, ADMIN_STATUS_LABEL } from "@/lib/utils/adminStatus";
import { EVENTS } from "@/data/events";

const EVENT_TITLE = new Map(EVENTS.map((e) => [e.id, e.title]));

// RFC-4180 CSV cell: wrap in quotes, double internal quotes. Prefix a leading
// =/+/-/@ with an apostrophe to defuse spreadsheet formula injection.
function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

function decisions(map: Record<string, string> | undefined): string {
  if (!map) return "";
  return Object.entries(map)
    .map(([k, val]) => `${k}=${val}`)
    .join("; ");
}

const iso = (d?: Date) => (d ? new Date(d).toISOString() : "");

const COLUMNS = [
  "Application ID", "Name", "Email", "Phone", "Major", "Second major", "Graduation year",
  "Member teams", "Lead teams", "Status", "Review decisions", "Final decisions",
  "Why join", "Project", "Other commitments", "Questions for us",
  "Lead experience", "Lead skills", "Work sample", "Resume URL", "Image URL",
  "Events attended", "Created", "Updated", "Submitted",
] as const;

export async function GET() {
  try {
    await requireAdmin();

    const [apps, users] = await Promise.all([getAllApplications(), getAllUsers()]);
    const attendance = new Map(users.map((u) => [u.uid, u.attendedEventIds ?? []]));

    const lines = [COLUMNS.map(cell).join(",")];
    for (const a of apps) {
      const fd = a.formData ?? {};
      const status = a.status === ApplicationStatus.IN_PROGRESS ? "Draft" : ADMIN_STATUS_LABEL[adminStatus(a)];
      const leadSkills = fd.leadAnswers?.leadSkills
        ? Object.entries(fd.leadAnswers.leadSkills).map(([t, v]) => `${t}: ${v}`).join(" | ")
        : "";
      const events = (attendance.get(a.userId) ?? [])
        .map((id) => EVENT_TITLE.get(id) ?? id)
        .join("; ");

      lines.push([
        a.id, a.userName, a.userEmail, fd.phone, fd.major, fd.major2, fd.graduationYear,
        a.memberTeams.join("; "), a.leadTeams.join("; "), status,
        decisions(a.reviewDecisions), decisions(a.finalDecisions),
        fd.whyJoin, fd.project, fd.otherCommitments, fd.questionsForUs,
        fd.leadAnswers?.leadExperience, leadSkills, fd.leadAnswers?.workSample,
        fd.resumeUrl, fd.imageUrl, events,
        iso(a.createdAt), iso(a.updatedAt), iso(a.submittedAt),
      ].map(cell).join(","));
    }

    // Prepend a BOM so Excel reads UTF-8 correctly.
    const csv = "﻿" + lines.join("\r\n");
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="txa-applications-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to export applications." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
