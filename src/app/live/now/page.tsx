import { displayKeyOk } from "@/lib/attendance/token";
import { getBaseUrl } from "@/lib/utils/baseUrl";
import { currentLiveEvent, EVENTS, EVENT_TYPE_LABEL } from "@/data/events";
import LiveCheckin from "@/components/LiveCheckin";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="min-h-svh" style={{ background: "var(--color-bg)" }}>{children}</section>;
}

export default async function LiveNowPage({ searchParams }: { searchParams: Promise<{ k?: string; event?: string }> }) {
  const { k, event: eventParam } = await searchParams;

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

  // An explicit ?event=<id> (chosen by an exec on the console) overrides the
  // auto-resolve. The display key already gates this surface, so overriding is
  // a deliberate staff action; with no param it auto-picks the live session.
  const chosen = eventParam ? EVENTS.find((e) => e.id === eventParam && e.type !== "deadline") : undefined;
  const event = chosen ?? currentLiveEvent();
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
