import { NextResponse } from "next/server";
import { requireAdmin, guardErrorStatus } from "@/lib/auth/guard";
import { addAttendance, removeAttendance } from "@/lib/firebase/attendance";
import { recordAudit } from "@/lib/firebase/audit";
import { EVENTS } from "@/data/events";

const VALID_EVENT_IDS = new Set(EVENTS.filter((e) => e.type !== "deadline").map((e) => e.id));

export async function POST(request: Request) {
  try {
    const { uid: actorUid, user: actor } = await requireAdmin();

    let body: { uid?: string; eventId?: string; present?: boolean };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

    const { uid, eventId, present } = body;
    if (typeof uid !== "string" || !uid) return NextResponse.json({ error: "Missing user." }, { status: 400 });
    if (typeof eventId !== "string" || !VALID_EVENT_IDS.has(eventId)) return NextResponse.json({ error: "Unknown event." }, { status: 400 });
    if (typeof present !== "boolean") return NextResponse.json({ error: "Missing present flag." }, { status: 400 });

    if (present) await addAttendance(uid, eventId);
    else await removeAttendance(uid, eventId);

    await recordAudit({
      actorUid, actorName: actor.name,
      action: present ? "attendance.add" : "attendance.remove",
      target: uid, detail: eventId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update attendance." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
