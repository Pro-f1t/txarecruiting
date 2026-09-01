import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getUserApplication } from "@/lib/firebase/applications";
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

  const deadline = new Date(EVENTS.find((e) => e.type === "deadline")?.startsAt ?? "2026-09-12T23:59:00-05:00");
  const editable = Date.now() <= deadline.getTime();

  const app = await getUserApplication(uid);
  const prefill = app
    ? { memberTeams: app.memberTeams, leadTeams: app.leadTeams, formData: app.formData as unknown as Record<string, unknown>, status: app.status }
    : null;

  return (
    <section className="shell pt-28 pb-24">
      <p className="t-eyebrow">{SEASON} application</p>
      <h1 className="h-display mt-3 max-w-[20ch]">{SEASON} Application</h1>
      <p className="t-body mt-4 max-w-[60ch] text-muted">
        Pick the field team(s) you want to join — you can choose more than one — answer a few
        questions, and optionally apply to be a field team lead too. You can edit your application
        any time before the deadline.
      </p>

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
