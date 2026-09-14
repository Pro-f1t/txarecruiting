import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { getUserApplication } from "@/lib/firebase/applications";
import { applicationsClosed } from "@/lib/applicationsOpen";
import { EVENTS, SEASON } from "@/data/events";
import { FIELD_TEAMS } from "@/data/fieldTeams";
import ApplyForm from "@/components/ApplyForm";

export default async function ApplyPage() {
  let uid: string, user;
  try {
    ({ uid, user } = await requireUser());
  } catch {
    redirect("/auth/login");
  }

  const attended = new Set(user.attendedEventIds ?? []);
  const infoAttended = EVENTS.some((e) => e.type === "info_session" && attended.has(e.id));

  const [closed, app] = await Promise.all([applicationsClosed(), getUserApplication(uid)]);
  const editable = !closed;
  const prefill = app
    ? { memberTeams: app.memberTeams, leadTeams: app.leadTeams, formData: app.formData as unknown as Record<string, unknown>, status: app.status }
    : null;

  if (closed && !app) {
    return (
      <section className="shell pt-28 pb-24">
        <p className="t-eyebrow">{SEASON} application</p>
        <h1 className="h-display mt-3 max-w-[20ch]">Applications are closed</h1>
        <div className="card mt-8 max-w-[60ch] p-7">
          <span className="badge badge-danger">Closed</span>
          <p className="t-body mt-4 text-muted">
            {app
              ? "The review period has begun, so applications can no longer be edited. You can track your status on your dashboard."
              : "The application window is closed and no longer accepting submissions. Thanks for your interest in Texas Accelerate."}
          </p>
          <Link href="/dashboard" className="pill pill-blue mt-6">Go to dashboard</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="shell pt-28 pb-24">
      <p className="t-eyebrow">{SEASON} application</p>
      <h1 className="h-display mt-3 max-w-[20ch]">{closed ? "Your application" : `${SEASON} Application`}</h1>
      {closed ? (
        <div className="card mt-6 max-w-[60ch] p-6">
          <span className="badge badge-danger">Closed</span>
          <p className="t-body mt-3 text-muted">
            The review period has begun, so your application is read-only. Track your status on your{" "}
            <Link href="/dashboard" className="text-accent hover:underline">dashboard</Link>.
          </p>
        </div>
      ) : (
        <p className="t-body mt-4 max-w-[60ch] text-muted">
          Pick the field team(s) you want to join - you can choose more than one - answer a few
          questions, and optionally apply to be a field team lead too. You can edit your application
          any time before the deadline.
        </p>
      )}

      <ApplyForm
        uid={uid}
        teams={FIELD_TEAMS.map((t) => ({ name: t.name, title: t.title.replace(/\n/g, " ") }))}
        infoAttended={infoAttended}
        editable={editable}
        prefill={prefill}
      />
    </section>
  );
}
