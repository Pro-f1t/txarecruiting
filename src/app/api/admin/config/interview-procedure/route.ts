import { NextResponse } from "next/server";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { setInterviewProcedure } from "@/lib/firebase/config";
import { recordAudit } from "@/lib/firebase/audit";

const MAX = 8000;

// Staff-editable interviewer procedure (admins and execs).
export async function POST(request: Request) {
  try {
    const { uid, user } = await requireStaff();
    let body: { procedure?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }
    const procedure = typeof body.procedure === "string" ? body.procedure.trim() : "";
    if (procedure.length > MAX) return NextResponse.json({ error: `Keep it under ${MAX} characters.` }, { status: 400 });
    await setInterviewProcedure(procedure, uid);
    await recordAudit({ actorUid: uid, actorName: user.name, action: "config.interview_procedure", detail: procedure ? `${procedure.length} chars` : "(reset to default)" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save procedure." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
