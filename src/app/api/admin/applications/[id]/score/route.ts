import { NextRequest, NextResponse } from "next/server";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { canReviewApplications } from "@/lib/models/User";
import { getApplication } from "@/lib/firebase/applications";
import { upsertScore, clearScore } from "@/lib/firebase/scores";
import { recordAudit } from "@/lib/firebase/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { uid, user } = await requireStaff();

    let body: { track?: string; stage?: string; score?: number; comment?: string; clear?: boolean };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

    const stage = body.stage === "interview" ? "interview" : "review";
    // Execs may grade interviews; grading applications needs the admin-granted permission.
    if (stage === "review" && !canReviewApplications(user)) {
      return NextResponse.json({ error: "You don't have Application review access." }, { status: 403 });
    }
    if (typeof body.track !== "string" || !body.track) return NextResponse.json({ error: "Missing track." }, { status: 400 });

    const app = await getApplication(id);
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    const validTracks = [...(app.memberTeams.length > 0 ? ["member"] : []), ...app.leadTeams.map((t) => `lead:${t}`)];
    if (!validTracks.includes(body.track)) return NextResponse.json({ error: "Unknown track." }, { status: 400 });

    // Clear my score for this track.
    if (body.clear === true) {
      await clearScore(id, body.track, stage, uid);
      await recordAudit({ actorUid: uid, actorName: user.name, action: `score.${stage}.clear`, target: id, detail: body.track });
      return NextResponse.json({ ok: true, cleared: true });
    }

    const score = Number(body.score);
    if (!Number.isFinite(score) || score < 1 || score > 10) {
      return NextResponse.json({ error: "Score must be 1–10." }, { status: 400 });
    }
    // Comments are required — a bare number is not useful to the other reviewers.
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    if (comment.length === 0) {
      return NextResponse.json({ error: "Add a comment explaining your score." }, { status: 400 });
    }

    await upsertScore({ appId: id, track: body.track, stage, reviewerUid: uid, reviewerName: user.name, score: Math.round(score), comment: comment.slice(0, 2000) });
    await recordAudit({ actorUid: uid, actorName: user.name, action: `score.${stage}`, target: id, detail: `${body.track} = ${Math.round(score)}` });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save score." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
