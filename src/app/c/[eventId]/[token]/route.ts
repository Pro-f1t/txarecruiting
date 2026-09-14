import { NextRequest, NextResponse } from "next/server";
import { verifyToken, mintPass, PASS_COOKIE, PASS_TTL_SECONDS } from "@/lib/attendance/token";
import { EVENTS } from "@/data/events";

// Never cache - a frozen response would freeze the QR on a dead code.
export const dynamic = "force-dynamic";

// The token is spent HERE, at scan time, in the 10s freshness window. We set a
// ~10-min pass cookie and hand off to /checkin, so the Google-login detour for
// signed-out students no longer races the token clock.
export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string; token: string }> }) {
  const { eventId, token } = await params;
  const valid = EVENTS.some((e) => e.id === eventId && e.type !== "deadline");

  if (!valid || !verifyToken(eventId, token)) {
    // Stale screenshot or unknown event → checkin page shows the "expired" state.
    return NextResponse.redirect(new URL(`/checkin/${encodeURIComponent(eventId)}?e=expired`, request.url));
  }

  const res = NextResponse.redirect(new URL(`/checkin/${encodeURIComponent(eventId)}`, request.url));
  res.cookies.set({
    name: PASS_COOKIE,
    value: mintPass(eventId),
    maxAge: PASS_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
