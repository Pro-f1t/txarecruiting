import { NextResponse } from "next/server";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { getInterviewMessage, setInterviewMessage } from "@/lib/firebase/config";
import { recordAudit } from "@/lib/firebase/audit";

const MAX = 4000;

export async function GET() {
  try {
    await requireStaff();
    return NextResponse.json({ message: await getInterviewMessage() });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: guardErrorStatus(error) ?? 500 });
  }
}

// Staff-editable scheduling message shown to every interview-stage applicant.
export async function POST(request: Request) {
  try {
    const { uid, user } = await requireStaff();
    let body: { message?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (message.length > MAX) return NextResponse.json({ error: `Keep it under ${MAX} characters.` }, { status: 400 });
    await setInterviewMessage(message, uid);
    await recordAudit({ actorUid: uid, actorName: user.name, action: "config.interview_message", detail: message ? `${message.length} chars` : "(cleared)" });
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save message." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
