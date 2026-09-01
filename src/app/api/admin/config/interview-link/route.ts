import { NextResponse } from "next/server";
import { requireAdmin, guardErrorStatus } from "@/lib/auth/guard";
import { getInterviewSignupLink, setInterviewSignupLink } from "@/lib/firebase/config";
import { recordAudit } from "@/lib/firebase/audit";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ link: await getInterviewSignupLink() });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: guardErrorStatus(error) ?? 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { uid, user } = await requireAdmin();
    let body: { link?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }
    const link = typeof body.link === "string" ? body.link.trim() : "";
    if (link && !/^https?:\/\//i.test(link)) return NextResponse.json({ error: "Enter a full URL starting with http(s)://" }, { status: 400 });
    await setInterviewSignupLink(link, uid);
    await recordAudit({ actorUid: uid, actorName: user.name, action: "config.interview_link", detail: link || "(cleared)" });
    return NextResponse.json({ ok: true, link });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save link." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
