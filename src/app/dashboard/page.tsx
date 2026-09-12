import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { EVENTS, EVENT_TYPE_LABEL, SEASON, type RecruitingEvent } from "@/data/events";
import { getUserApplication } from "@/lib/firebase/applications";
import { getRecruitingStep, getInterviewMessage } from "@/lib/firebase/config";
import { applicationsClosed } from "@/lib/applicationsOpen";
import { buildApplicationCards } from "@/lib/utils/applicantStatus";
import ApplicationCards from "@/components/ApplicationCards";

type EventStatus = "attended" | "upcoming" | "missed";

function eventStatus(e: RecruitingEvent, attendedIds: Set<string>, now: Date): EventStatus {
  if (attendedIds.has(e.id)) return "attended";
  return new Date(e.startsAt).getTime() > now.getTime() ? "upcoming" : "missed";
}

const STATUS_BADGE: Record<EventStatus, string> = {
  attended: "badge-ok",
  upcoming: "badge-muted",
  missed: "badge-danger",
};
const TYPE_BADGE: Record<string, string> = {
  info_session: "badge-ok",
  coffee_chat: "badge-warn",
  deadline: "badge-danger",
};

export default async function DashboardPage() {
  let user;
  try {
    ({ user } = await requireUser());
  } catch {
    redirect("/auth/login");
  }

  const now = new Date();
  const attendedIds = new Set(user.attendedEventIds ?? []);

  const infoDone = EVENTS.some((e) => e.type === "info_session" && attendedIds.has(e.id));
  const coffeeDone = EVENTS.some((e) => e.type === "coffee_chat" && attendedIds.has(e.id));

  const checkins = EVENTS.filter((e) => attendedIds.has(e.id));
  const application = await getUserApplication(user.uid);
  const [step, interviewMessage, closed] = await Promise.all([getRecruitingStep(), getInterviewMessage(), applicationsClosed()]);
  const cards = application ? buildApplicationCards(application, step) : [];
  const isDraft = application?.status === "in_progress";

  // Once review begins the applications (status, interview link) are what matters — show them first.
  const attendanceSection = (
    <>
        {/* Attendance requirement */}
        <div className={`card ${closed ? "mt-12" : "mt-10"} p-7`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="t-eyebrow">Application attendance</p>
              <p className="t-body mt-2 text-muted">
                Attend at least one info session to apply. A coffee chat is highly recommended.
              </p>
            </div>
            <span className="text-[13px] text-muted">{SEASON}</span>
          </div>

          <div className="mt-6 space-y-3">
            {[
              { label: "Info Session", done: infoDone, tag: "Required" },
              { label: "Coffee Chat", done: coffeeDone, tag: "Highly recommended" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-2xl px-5 py-4" style={{ background: "var(--color-surface-2)" }}>
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                    style={r.done ? { background: "var(--color-ok)", color: "#08050f" } : { border: "2px solid rgba(255,255,255,0.2)" }}
                  >
                    {r.done ? "✓" : ""}
                  </span>
                  <span className="text-[15px] font-semibold">{r.label}</span>
                  <span className="text-[11px] uppercase tracking-wider text-muted">{r.tag}</span>
                </div>
                <span className="text-[13px]" style={{ color: r.done ? "var(--color-ok)" : "var(--color-muted)" }}>
                  {r.done ? "Attended" : "Not yet"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {/* Your events */}
          <section className="card p-7">
            <div className="flex items-center justify-between">
              <p className="t-eyebrow">Your events</p>
              <span className="text-[13px] text-muted">{SEASON}</span>
            </div>
            <div className="mt-5 space-y-3">
              {EVENTS.map((e) => {
                const st = eventStatus(e, attendedIds, now);
                return (
                  <div key={e.id} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "var(--color-surface-2)" }}>
                    <div>
                      <p className="text-[15px] font-semibold">{e.title}</p>
                      <p className="text-[12px] text-muted">{e.date}, {e.time} · {e.location} · {EVENT_TYPE_LABEL[e.type]}</p>
                    </div>
                    <span className={`badge ${STATUS_BADGE[st]}`}>{st}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent check-ins */}
          <section className="card p-7">
            <p className="t-eyebrow">Recent check-ins</p>
            {checkins.length === 0 ? (
              <p className="t-body mt-5 text-muted">No check-ins recorded yet. Scan the QR code at an event to check in.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {checkins.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "var(--color-surface-2)" }}>
                    <div>
                      <p className="text-[15px] font-semibold">{e.title}</p>
                      <p className="text-[12px] text-muted">{e.date} · {e.location}</p>
                    </div>
                    <span className={`badge ${TYPE_BADGE[e.type]}`}>{EVENT_TYPE_LABEL[e.type]}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

    </>
  );

  const applicationsSection = (
    <>
        {/* Applications — one card per application (general member + each field-team lead) */}
        <div className={`${closed ? "mt-10" : "mt-8"} flex items-center justify-between gap-4`}>
          <p className="t-eyebrow">Your applications</p>
        </div>

        {!application ? (
          <section className="card mt-4 p-7">
            <span className="badge badge-muted">Not started</span>
            <p className="t-body mt-4 text-muted">
              You haven&apos;t started your application yet. Apply to any of the six field teams — as a
              member, a lead, or both.
            </p>
            <Link href="/apply" className="pill pill-blue mt-6">Start an application</Link>
          </section>
        ) : isDraft ? (
          <section className="card mt-4 p-7">
            <span className="badge badge-warn">Draft — not submitted</span>
            <p className="t-body mt-4 text-muted">
              {closed ? "Applications closed before this draft was submitted, so it was not considered." : "Your progress is saved. Finish and submit before the deadline to be considered."}
            </p>
            <Link href="/apply" className="pill pill-blue mt-6">{closed ? "View draft" : "Continue application"}</Link>
          </section>
        ) : (
          <ApplicationCards cards={cards} formData={application.formData} interviewMessage={interviewMessage} />
        )}
    </>
  );

  return (
    <section className="shell pt-28 pb-24">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow">Applicant dashboard</p>
          <h1 className="t-card-title mt-2">Welcome, {user.name}</h1>
        </div>
        {closed ? (
          application && <Link href="/apply" className="pill pill-blue">View application</Link>
        ) : (
          <Link href="/apply" className="pill pill-blue">
            {!application ? "Start your application" : application.status === "submitted" ? "Edit application" : "Continue application"}
          </Link>
        )}
      </header>

      {closed ? (<>{applicationsSection}{attendanceSection}</>) : (<>{attendanceSection}{applicationsSection}</>)}
    </section>
  );
}
