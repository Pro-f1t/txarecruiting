import { NextRequest, NextResponse } from "next/server";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { canReviewApplications } from "@/lib/models/User";
import { getAllApplications, clearDecisionsForTrack } from "@/lib/firebase/applications";
import { recordAudit } from "@/lib/firebase/audit";
import { ApplicationStatus } from "@/lib/models/Application";
import { applicationReviewLocked } from "@/lib/applicationsOpen";

// Bulk-reset every decision in one track (e.g. "member", "lead:Software, AI & Technology")
// at one stage back to "pending". Same permission rules as a single decision.
export async function POST(request: NextRequest) {
  try {
    const { uid, user } = await requireStaff();

    let body: { key?: string; stage?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }
    const { key, stage } = body;
    if (stage !== "review" && stage !== "final") return NextResponse.json({ error: "Bad stage." }, { status: 400 });
    if (stage === "review" && !canReviewApplications(user)) {
      return NextResponse.json({ error: "You don't have Application review access." }, { status: 403 });
    }
    if (typeof key !== "string" || !key) return NextResponse.json({ error: "Missing key." }, { status: 400 });
    if (stage === "review" && (await applicationReviewLocked())) {
      return NextResponse.json({ error: "Application review is locked - interview invites have been released." }, { status: 409 });
    }

    const apps = await getAllApplications();
    const field = stage === "review" ? "reviewDecisions" : "finalDecisions";
    const targets = apps
      .filter((a) => a.status === ApplicationStatus.SUBMITTED)
      .filter((a) => (key === "member" ? a.memberTeams.length > 0 : (a.leadTeams as string[]).includes(key.slice("lead:".length))))
      .filter((a) => { const d = a[field]?.[key]; return d === "advanced" || d === "rejected"; })
      .map((a) => a.id);

    const cleared = await clearDecisionsForTrack(targets, key, stage);
    await recordAudit({ actorUid: uid, actorName: user.name, action: `decision.${stage}.clear-all`, target: key, detail: `${cleared} cleared` });
    return NextResponse.json({ ok: true, cleared });
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear decisions." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
