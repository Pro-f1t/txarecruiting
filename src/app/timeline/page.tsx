import Image from "next/image";

const IG_POST = "https://www.instagram.com/p/DcY_YvLMJMP/";

type Event = {
  date: string;
  day: string;
  title: string;
  time: string;
  location: string;
  type: "info" | "coffee" | "deadline";
};

// September 2026 - from the recruitment graphic ("Updated with locations").
const EVENTS: Event[] = [
  { date: "Sep 1", day: "Tue", title: "Info Session #1", time: "7:00 – 8:00 PM", location: "PAI 2.48", type: "info" },
  { date: "Sep 2", day: "Wed", title: "Coffee Chat #1", time: "5:00 – 6:30 PM", location: "Gong Cha", type: "coffee" },
  { date: "Sep 7", day: "Mon", title: "Info Session #2", time: "6:00 – 7:00 PM", location: "CAL 100", type: "info" },
  { date: "Sep 8", day: "Tue", title: "Coffee Chat #2", time: "5:00 – 6:30 PM", location: "Lucky Lab", type: "coffee" },
  { date: "Sep 10", day: "Thu", title: "Info Session #3", time: "7:00 – 8:00 PM", location: "Virtual", type: "info" },
  { date: "Sep 13", day: "Sun", title: "Application Closes", time: "2:40 AM", location: "Online", type: "deadline" },
];

const UPCOMING = [
  { title: "Interview decisions released", d: "Shortlisted applicants are notified and can schedule an interview." },
  { title: "Interview scheduling deadline", d: "Last day to pick an interview slot via your team's signup link." },
  { title: "Interview days", d: "Interviews take place with each field team." },
  { title: "Final decisions release", d: "Everyone hears back on a single decision release date." },
];

const TYPE_LABEL: Record<Event["type"], string> = { info: "Info Session", coffee: "Coffee Chat", deadline: "Deadline" };
const TYPE_BADGE: Record<Event["type"], string> = { info: "badge-ok", coffee: "badge-warn", deadline: "badge-danger" };

export default function TimelinePage() {
  return (
    <section className="shell pt-28 pb-24">
      <p className="t-eyebrow">Recruiting timeline</p>
      <h1 className="h-display mt-3">September 2026</h1>
      <p className="t-body mt-4 max-w-[60ch] text-muted">
        Attend at least <span className="text-white">one info session</span> and{" "}
        <span className="text-white">one coffee chat</span> to submit your application, then apply before it closes.
      </p>

      {/* Graphic (left) + event list (right) */}
      <div className="mt-12 grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <a href={IG_POST} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-[32px]">
            <Image
              src="/timeline/recruitment-fall26.png"
              alt="Texas Accelerate recruitment schedule, September 2026"
              width={2160}
              height={2160}
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="block w-full transition-transform duration-500 group-hover:scale-[1.03]"
              priority
            />
          </a>
          <a
            href={IG_POST}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-accent"
          >
            View the full graphic on Instagram <span aria-hidden>↗</span>
          </a>
        </div>

        <div className="space-y-3">
          {EVENTS.map((e) => (
            <div key={e.title} className="card flex items-center gap-4 p-5">
              <div className="w-14 shrink-0 text-center">
                <p className="text-[20px] font-bold leading-none tracking-[-0.02em]">{e.date.replace("Sep ", "")}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">{e.day}</p>
              </div>
              <div className="flex-1">
                <span className={`badge ${TYPE_BADGE[e.type]}`}>{TYPE_LABEL[e.type]}</span>
                <p className="mt-1.5 text-[16px] font-semibold">{e.title}</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-medium">{e.time}</p>
                <p className="text-[13px] text-muted">{e.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interview + decisions - dates announced later */}
      <h2 className="h-display mt-16">After applications close</h2>
      <p className="t-body mt-3 max-w-[60ch] text-muted">Exact dates are announced later in the cycle.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {UPCOMING.map((u) => (
          <div key={u.title} className="card p-7">
            <span className="badge badge-muted">Date TBD</span>
            <h3 className="t-card-title mt-3">{u.title}</h3>
            <p className="t-body mt-2 text-muted">{u.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
