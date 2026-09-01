import { NextResponse } from "next/server";
import { requireAdmin, guardErrorStatus } from "@/lib/auth/guard";
import { getRecruitingStep, setRecruitingStep } from "@/lib/firebase/config";
import { recordAudit } from "@/lib/firebase/audit";
import { RecruitingStep } from "@/lib/models/Config";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ step: await getRecruitingStep() });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: guardErrorStatus(error) ?? 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { uid, user } = await requireAdmin();
    let body: { step?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

    if (!Object.values(RecruitingStep).includes(body.step as RecruitingStep)) {
      return NextResponse.json({ error: "Unknown step." }, { status: 400 });
    }
    await setRecruitingStep(body.step as RecruitingStep, uid);
    await recordAudit({ actorUid: uid, actorName: user.name, action: "step.set", detail: body.step });
    return NextResponse.json({ ok: true, step: body.step });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update step." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
