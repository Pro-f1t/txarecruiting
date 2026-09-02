import { NextResponse } from "next/server";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { setConversation, removeConversation } from "@/lib/firebase/conversations";
import { getUser } from "@/lib/firebase/users";
import { recordAudit } from "@/lib/firebase/audit";

// Admins and execs mark that they talked to an applicant (+ optional note).
export async function POST(request: Request) {
  try {
    const { uid: staffUid, user: staff } = await requireStaff();

    let body: { applicantUid?: string; talked?: boolean; comment?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

    const { applicantUid, talked, comment } = body;
    if (typeof applicantUid !== "string" || !applicantUid) return NextResponse.json({ error: "Missing applicant." }, { status: 400 });
    if (typeof talked !== "boolean") return NextResponse.json({ error: "Missing talked flag." }, { status: 400 });

    const applicant = await getUser(applicantUid);
    if (!applicant) return NextResponse.json({ error: "User not found." }, { status: 404 });

    if (talked) {
      await setConversation(applicantUid, { uid: staffUid, name: staff.name }, typeof comment === "string" ? comment : undefined);
    } else {
      await removeConversation(applicantUid, staffUid);
    }
    await recordAudit({ actorUid: staffUid, actorName: staff.name, action: talked ? "conversation.mark" : "conversation.clear", target: applicantUid, detail: applicant.email });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save conversation." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
