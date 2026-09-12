import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, guardErrorStatus } from "@/lib/auth/guard";
import { getUser, setCanReviewApplications } from "@/lib/firebase/users";
import { recordAudit } from "@/lib/firebase/audit";
import { UserRole } from "@/lib/models/User";

// Only admins grant/revoke Application review access, and only to execs
// (admins always have it; applicants can't see the console at all).
export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid: targetUid } = await params;
  try {
    const { uid: actorUid, user: actor } = await requireAdmin();

    let body: { canReviewApplications?: boolean };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }
    if (typeof body.canReviewApplications !== "boolean") return NextResponse.json({ error: "Missing flag." }, { status: 400 });

    const target = await getUser(targetUid);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (target.role !== UserRole.EXEC) return NextResponse.json({ error: "Only execs can be granted Application review." }, { status: 400 });

    await setCanReviewApplications(targetUid, body.canReviewApplications);
    await recordAudit({
      actorUid, actorName: actor.name,
      action: body.canReviewApplications ? "permission.review.grant" : "permission.review.revoke",
      target: targetUid, detail: target.email,
    });

    return NextResponse.json({ ok: true, canReviewApplications: body.canReviewApplications });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update permission." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
