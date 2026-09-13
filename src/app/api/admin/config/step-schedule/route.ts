import { NextResponse } from "next/server";
import { requireAdmin, guardErrorStatus } from "@/lib/auth/guard";
import { getRecruitingStep, getStepSchedule, setStepSchedule } from "@/lib/firebase/config";
import { recordAudit } from "@/lib/firebase/audit";
import { RecruitingStep, STEP_ORDER } from "@/lib/models/Config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const s = await getStepSchedule();
    return NextResponse.json({ schedule: s ? { at: s.at.toISOString(), to: s.to } : null });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: guardErrorStatus(error) ?? 500 });
  }
}

// Schedule (or cancel with at:null) an automatic step change. Admin only.
export async function POST(request: Request) {
  try {
    const { uid, user } = await requireAdmin();
    let body: { at?: string | null; to?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

    if (body.at == null) {
      await setStepSchedule(null, uid);
      await recordAudit({ actorUid: uid, actorName: user.name, action: "step.schedule.cancel" });
      return NextResponse.json({ ok: true, schedule: null });
    }

    const at = new Date(body.at);
    if (Number.isNaN(at.getTime())) return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    if (at.getTime() <= Date.now()) return NextResponse.json({ error: "Pick a time in the future." }, { status: 400 });
    const to = (body.to ?? RecruitingStep.REVIEWING) as RecruitingStep;
    if (!Object.values(RecruitingStep).includes(to)) return NextResponse.json({ error: "Unknown step." }, { status: 400 });
    const current = await getRecruitingStep();
    if (STEP_ORDER.indexOf(to) <= STEP_ORDER.indexOf(current)) return NextResponse.json({ error: "The cycle is already at or past that step." }, { status: 400 });

    await setStepSchedule({ at, to }, uid);
    await recordAudit({ actorUid: uid, actorName: user.name, action: "step.schedule", detail: `${to} at ${at.toISOString()}` });
    return NextResponse.json({ ok: true, schedule: { at: at.toISOString(), to } });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save schedule." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
