import { NextRequest, NextResponse } from "next/server";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { canReviewApplications } from "@/lib/models/User";
import { getApplication, setDecision } from "@/lib/firebase/applications";
import { recordAudit } from "@/lib/firebase/audit";
import { StageDecision } from "@/lib/models/Application";

const STAGES = ["review", "final"] as const;
const DECISIONS: StageDecision[] = ["advanced", "rejected", "pending"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { uid, user } = await requireStaff();

    let body: { key?: string; stage?: string; decision?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

    const { key, stage, decision } = body;
    if (!STAGES.includes(stage as (typeof STAGES)[number])) return NextResponse.json({ error: "Bad stage." }, { status: 400 });
    // Review-stage decisions need Application review access (admins, or execs an admin granted it).
    if (stage === "review" && !canReviewApplications(user)) {
      return NextResponse.json({ error: "You don't have Application review access." }, { status: 403 });
    }
    if (!DECISIONS.includes(decision as StageDecision)) return NextResponse.json({ error: "Bad decision." }, { status: 400 });
    if (typeof key !== "string" || !key) return NextResponse.json({ error: "Missing key." }, { status: 400 });

    const app = await getApplication(id);
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const validKeys = [...(app.memberTeams.length > 0 ? ["member"] : []), ...app.leadTeams.map((t) => `lead:${t}`)];
    if (!validKeys.includes(key)) return NextResponse.json({ error: "That team/role isn't on this application." }, { status: 400 });

    await setDecision(id, key, stage as "review" | "final", decision as StageDecision);
    await recordAudit({ actorUid: uid, actorName: user.name, action: `decision.${stage}.${decision}`, target: id, detail: key });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to record decision." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
