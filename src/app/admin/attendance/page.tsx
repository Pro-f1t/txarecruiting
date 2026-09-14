import { requireStaff } from "@/lib/auth/guard";
import { getAllUsers } from "@/lib/firebase/users";
import { getBackupState } from "@/lib/firebase/config";
import { getBaseUrl } from "@/lib/utils/baseUrl";
import { EVENTS, EVENT_TYPE_LABEL, SEASON } from "@/data/events";
import { UserRole } from "@/lib/models/User";
import AttendanceManager, { type AttEvent, type AttUser } from "@/components/AttendanceManager";
import BackupCard from "@/components/BackupCard";

export const dynamic = "force-dynamic";

const TYPE_BADGE: Record<string, string> = { info_session: "badge-ok", coffee_chat: "badge-warn" };

export default async function AdminAttendance() {
  await requireStaff();

  const [users, base, backup] = await Promise.all([getAllUsers(), getBaseUrl(), getBackupState()]);
  const displayKey = process.env.DISPLAY_KEY || "";
  const liveUrl = displayKey ? `${base}/live/now?k=${encodeURIComponent(displayKey)}` : null;
  // Applicants only for the roster / requirement stats (staff don't "attend").
  const applicants = users.filter((u) => u.role === UserRole.APPLICANT);
  const events = EVENTS.filter((e) => e.type !== "deadline");

  const countFor = (id: string) => applicants.filter((u) => (u.attendedEventIds ?? []).includes(id)).length;
  const infoMet = applicants.filter((u) => events.some((e) => e.type === "info_session" && (u.attendedEventIds ?? []).includes(e.id))).length;

  const cards = events.map((e) => ({ e, url: `${base}/checkin/${e.id}` }));

  const managerEvents: AttEvent[] = events.map((e) => ({ id: e.id, title: e.title, type: e.type, date: e.date, day: e.day, location: e.location }));
  // Everyone (incl. admins/execs) so staff can check themselves in/out to test.
  const managerUsers: AttUser[] = users.map((u) => ({ uid: u.uid, name: u.name, email: u.email, role: u.role, attendedEventIds: u.attendedEventIds ?? [] }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-card-title">Attendance</h1>
          <p className="t-body mt-2 text-muted">
            Open the live display at an event - it shows a QR that rotates every few seconds so a shared screenshot can&apos;t check people in.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-muted">{SEASON}</p>
          <p className="text-[13px] mt-1"><span className="font-semibold text-white">{infoMet}</span> <span className="text-muted">applicants met the info-session requirement</span></p>
        </div>
      </div>

      {/* Live rotating display */}
      <div className="card mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="t-eyebrow">Live check-in display</p>
            <p className="t-body mt-1 text-muted">The rotating QR. Project it or prop up a phone. &quot;Live now&quot; auto-picks the current session; pick a specific event to test any time.</p>
          </div>
          {liveUrl ? (
            <a href={liveUrl} target="_blank" rel="noreferrer" className="pill pill-blue shrink-0">Open - live now ↗</a>
          ) : (
            <span className="text-[12px] text-warn">Set DISPLAY_KEY + CHECKIN_SECRET in the environment to enable.</span>
          )}
        </div>
        {liveUrl && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <span className="self-center text-[12px] text-muted">Or show a specific event:</span>
            {events.map((e) => (
              <a
                key={e.id}
                href={`${base}/live/now?k=${encodeURIComponent(displayKey)}&event=${e.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
                style={{ background: "var(--color-surface-2)", color: "var(--color-muted)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {e.title} ↗
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Backup QR codes (armed on demand) */}
      <p className="t-eyebrow mt-10">Backup codes</p>
      <p className="t-body mt-1 text-muted">If the live display can&apos;t run, arm one of these static QRs - it works for 15 minutes, then disarms itself.</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ e, url }) => (
          <BackupCard
            key={e.id}
            eventId={e.id}
            title={e.title}
            time={e.time}
            location={e.location}
            day={e.day}
            date={e.date}
            typeLabel={EVENT_TYPE_LABEL[e.type]}
            badgeClass={TYPE_BADGE[e.type]}
            url={url}
            count={countFor(e.id)}
            initialArmedMs={backup[e.id] ?? 0}
          />
        ))}
      </div>

      {/* Manual roster */}
      <p className="t-eyebrow mt-10">Manual check-in</p>
      <div className="card mt-4 p-6">
        <AttendanceManager events={managerEvents} users={managerUsers} />
      </div>
    </div>
  );
}
