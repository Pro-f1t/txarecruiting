import { NextResponse } from "next/server";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { setBackup, getBackupState } from "@/lib/firebase/config";
import { recordAudit } from "@/lib/firebase/audit";
import { EVENTS } from "@/data/events";

export const dynamic = "force-dynamic";

const VALID = new Set(EVENTS.filter((e) => e.type !== "deadline").map((e) => e.id));

// Break-glass Tier 2: arm a static check-in QR for one event (auto-expires 15
// min). Deliberately not always-on — a permanently valid QR defeats rotation.
export async function POST(request: Request) {
  try {
    const { uid, user } = await requireStaff();

    let body: { eventId?: string; armed?: boolean };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

    const { eventId, armed } = body;
    if (typeof eventId !== "string" || !VALID.has(eventId)) return NextResponse.json({ error: "Unknown event." }, { status: 400 });
    if (typeof armed !== "boolean") return NextResponse.json({ error: "Missing armed flag." }, { status: 400 });

    await setBackup(eventId, armed);
    await recordAudit({ actorUid: uid, actorName: user.name, action: armed ? "attendance.backup.arm" : "attendance.backup.disarm", target: eventId });

    return NextResponse.json({ ok: true, state: await getBackupState() });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update backup." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
