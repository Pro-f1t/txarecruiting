import QRCode from "qrcode";
import { requireStaff } from "@/lib/auth/guard";
import { getAllUsers } from "@/lib/firebase/users";
import { getBackupState } from "@/lib/firebase/config";
import { getBaseUrl } from "@/lib/utils/baseUrl";
import { EVENTS, EVENT_TYPE_LABEL, SEASON } from "@/data/events";
import { UserRole } from "@/lib/models/User";
import AttendanceManager, { type AttEvent, type AttUser } from "@/components/AttendanceManager";
import BackupCheckinButton from "@/components/BackupCheckinButton";

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

  // Server-render a scannable QR (dark modules on white) per event.
  const cards = await Promise.all(
    events.map(async (e) => {
      const url = `${base}/checkin/${e.id}`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#08050f", light: "#ffffff" } });
      return { e, url, svg };
    })
  );

  const managerEvents: AttEvent[] = events.map((e) => ({ id: e.id, title: e.title, type: e.type, date: e.date, day: e.day, location: e.location }));
  const managerUsers: AttUser[] = applicants.map((u) => ({ uid: u.uid, name: u.name, email: u.email, attendedEventIds: u.attendedEventIds ?? [] }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-card-title">Attendance</h1>
          <p className="t-body mt-2 text-muted">
            Open the live display at an event — it shows a QR that rotates every few seconds so a shared screenshot can&apos;t check people in.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-muted">{SEASON}</p>
          <p className="text-[13px] mt-1"><span className="font-semibold text-white">{infoMet}</span> <span className="text-muted">applicants met the info-session requirement</span></p>
        </div>
      </div>

      {/* Live rotating display */}
      <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="t-eyebrow">Live check-in display</p>
          <p className="t-body mt-1 text-muted">Opens the rotating QR for whichever session is live now. Project it or prop up a phone.</p>
        </div>
        {liveUrl ? (
          <a href={liveUrl} target="_blank" rel="noreferrer" className="pill pill-blue shrink-0">Open live display ↗</a>
        ) : (
          <span className="text-[12px] text-warn">Set DISPLAY_KEY + CHECKIN_SECRET in the environment to enable.</span>
        )}
      </div>

      {/* Backup QR codes (armed on demand) */}
      <p className="t-eyebrow mt-10">Backup codes</p>
      <p className="t-body mt-1 text-muted">If the live display can&apos;t run, arm one of these static QRs — it works for 15 minutes, then disarms itself.</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ e, url, svg }) => (
          <div key={e.id} className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <span className={`badge ${TYPE_BADGE[e.type]}`}>{EVENT_TYPE_LABEL[e.type]}</span>
              <span className="text-[12px] text-muted">{e.day} {e.date}</span>
            </div>
            <div
              className="mx-auto mt-4 w-full max-w-[220px] rounded-2xl bg-white p-3"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="mt-4 text-[15px] font-semibold">{e.title}</p>
            <p className="text-[12px] text-muted">{e.time} · {e.location}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[13px]"><span className="font-semibold text-white">{countFor(e.id)}</span> <span className="text-muted">checked in</span></span>
              <a href={url} target="_blank" rel="noreferrer" className="text-[12px] text-accent hover:underline break-all">Open link ↗</a>
            </div>
            <BackupCheckinButton eventId={e.id} initialArmedMs={backup[e.id] ?? 0} />
          </div>
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
