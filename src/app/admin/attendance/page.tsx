import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth/guard";
import { getAllUsers } from "@/lib/firebase/users";
import { getBaseUrl } from "@/lib/utils/baseUrl";
import { EVENTS, EVENT_TYPE_LABEL, SEASON } from "@/data/events";
import { UserRole } from "@/lib/models/User";
import AttendanceManager, { type AttEvent, type AttUser } from "@/components/AttendanceManager";

const TYPE_BADGE: Record<string, string> = { info_session: "badge-ok", coffee_chat: "badge-warn" };

export default async function AdminAttendance() {
  await requireAdmin();

  const [users, base] = await Promise.all([getAllUsers(), getBaseUrl()]);
  // Applicants only for the roster / requirement stats (execs don't "attend").
  const applicants = users.filter((u) => u.role !== UserRole.ADMIN);
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
            Display a QR code at each event — applicants scan, sign in with UT Google, and are checked in automatically.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[13px] text-muted">{SEASON}</p>
          <p className="text-[13px] mt-1"><span className="font-semibold text-white">{infoMet}</span> <span className="text-muted">applicants met the info-session requirement</span></p>
        </div>
      </div>

      {/* Check-in QR codes */}
      <p className="t-eyebrow mt-8">Check-in codes</p>
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
