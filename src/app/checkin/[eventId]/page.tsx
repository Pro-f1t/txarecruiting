import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { addAttendance } from "@/lib/firebase/attendance";
import { isBackupArmed } from "@/lib/firebase/config";
import { verifyPass, PASS_COOKIE } from "@/lib/attendance/token";
import { EVENTS, EVENT_TYPE_LABEL } from "@/data/events";

export const dynamic = "force-dynamic";

export default async function CheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = EVENTS.find((e) => e.id === eventId && e.type !== "deadline");

  // Presence must be proven: a fresh pass from the rotating QR, or an exec-armed
  // backup. A raw /checkin URL with neither is a stale/shared link.
  const pass = (await cookies()).get(PASS_COOKIE)?.value;
  const authorized = !!event && (verifyPass(eventId, pass) || (await isBackupArmed(eventId)));

  // Signed out but authorized → login, then return (the pass cookie survives).
  let user = null;
  if (authorized) {
    try {
      ({ user } = await requireUser());
    } catch {
      redirect(`/auth/login?next=${encodeURIComponent(`/checkin/${eventId}`)}`);
    }
  }

  const alreadyChecked = user?.attendedEventIds?.includes(eventId) ?? false;
  if (authorized && user && !alreadyChecked) await addAttendance(user.uid, eventId);

  return (
    <section className="shell flex min-h-svh items-center justify-center py-20">
      <div className="card w-full max-w-md p-8 text-center">
        {!event ? (
          <>
            <p className="t-eyebrow">Check-in</p>
            <h1 className="t-card-title mt-3">Event not found</h1>
            <p className="t-body mt-3 text-muted">This check-in link isn&apos;t valid. Ask an exec for the current QR code.</p>
          </>
        ) : !authorized ? (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[26px] font-bold" style={{ background: "var(--color-danger)", color: "#fff" }}>!</span>
            <h1 className="t-card-title mt-5">That code expired</h1>
            <p className="t-body mt-3 text-muted">
              Check-in codes rotate every few seconds. Point your camera at the code on the screen and scan the live one.
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[26px] font-bold" style={{ background: "var(--color-ok)", color: "#08050f" }}>✓</span>
            <h1 className="t-card-title mt-5">{alreadyChecked ? "Already checked in" : "You're checked in!"}</h1>
            <p className="t-body mt-2 text-muted">{event.title} · {EVENT_TYPE_LABEL[event.type]}</p>
            <p className="text-[13px] text-muted mt-1">{event.day} {event.date} · {event.location}</p>
            <p className="t-body mt-5 text-muted">Signed in as {user!.name}. This is saved to your dashboard.</p>
          </>
        )}
        <Link href="/dashboard" className="pill pill-blue mt-7 w-full justify-center">Go to dashboard</Link>
      </div>
    </section>
  );
}
