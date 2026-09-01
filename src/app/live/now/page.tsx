import { displayKeyOk } from "@/lib/attendance/token";
import { getBaseUrl } from "@/lib/utils/baseUrl";
import { currentLiveEvent, EVENTS, EVENT_TYPE_LABEL } from "@/data/events";
import LiveCheckin from "@/components/LiveCheckin";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="min-h-svh" style={{ background: "var(--color-bg)" }}>{children}</section>;
}

export default async function LiveNowPage({ searchParams }: { searchParams: Promise<{ k?: string; demo?: string }> }) {
  const { k, demo } = await searchParams;

  if (!displayKeyOk(k)) {
    return (
      <Shell>
        <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="t-card-title">Display key required</h1>
          <p className="t-body text-muted">Open this page with the check-in display link (…/live/now?k=…).</p>
        </div>
      </Shell>
    );
  }

  // Dev-only preview override (?demo=<eventId>); ignored in production so it
  // can never surface a check-in code for a session that isn't live.
  const demoEvent = process.env.NODE_ENV !== "production" && demo
    ? EVENTS.find((e) => e.id === demo && e.type !== "deadline")
    : undefined;
  const event = demoEvent ?? currentLiveEvent();
  if (!event) {
    return (
      <Shell>
        <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="t-eyebrow">Check-in</p>
          <h1 className="t-card-title">No session is live right now</h1>
          <p className="t-body text-muted">This page opens the check-in code automatically during an info session or coffee chat.</p>
        </div>
      </Shell>
    );
  }

  const base = await getBaseUrl();
  return (
    <Shell>
      <LiveCheckin
        eventId={event.id}
        eventTitle={event.title}
        eventMeta={`${EVENT_TYPE_LABEL[event.type]} · ${event.day} ${event.date} · ${event.location}`}
        displayKey={k!}
        base={base}
      />
    </Shell>
  );
}
