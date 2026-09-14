import { NextRequest, NextResponse } from "next/server";
import { displayKeyOk } from "@/lib/attendance/token";
import { getAllUsers } from "@/lib/firebase/users";
import { EVENTS } from "@/data/events";

export const dynamic = "force-dynamic";

// Live check-in count for the display. Polled slowly (20–30s) - it reads the
// whole users collection, so a 5s cadence would be ~200k reads over an event.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (!displayKeyOk(searchParams.get("k"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = searchParams.get("eventId") || "";
  if (!EVENTS.some((e) => e.id === eventId && e.type !== "deadline")) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  const users = await getAllUsers();
  const count = users.filter((u) => (u.attendedEventIds ?? []).includes(eventId)).length;
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
