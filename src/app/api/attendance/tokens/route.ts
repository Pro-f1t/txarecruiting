import { NextRequest, NextResponse } from "next/server";
import { mintTokenBatch, displayKeyOk } from "@/lib/attendance/token";
import { EVENTS } from "@/data/events";

export const dynamic = "force-dynamic";

// ~60 pre-signed tokens (5 min at 5s) in one request, plus the server clock so
// the display can correct for offset. Batching keeps the display rotating
// through a wifi dropout instead of dying on a 5s poll loop.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (!displayKeyOk(searchParams.get("k"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = searchParams.get("eventId") || "";
  if (!EVENTS.some((e) => e.id === eventId && e.type !== "deadline")) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  return NextResponse.json(mintTokenBatch(eventId, 60), { headers: { "Cache-Control": "no-store" } });
}
