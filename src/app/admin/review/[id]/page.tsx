import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin, guardErrorStatus } from "@/lib/auth/guard";
import { getApplication } from "@/lib/firebase/applications";
import { getUser } from "@/lib/firebase/users";
import { getScoresForAppTrack } from "@/lib/firebase/scores";
import ApplicationAnswers from "@/components/ApplicationAnswers";
import ReviewScorePanel from "@/components/ReviewScorePanel";

export default async function ReviewDetail({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ track?: string }>;
}) {
  let uid: string;
  try {
    ({ uid } = await requireAdmin());
  } catch (e) {
    redirect(guardErrorStatus(e) === 403 ? "/admin" : "/auth/login");
  }
  const { id } = await params;
  const { track: rawTrack } = await searchParams;

  const app = await getApplication(id);
  const applicant = await getUser(app?.userId ?? id);
  if (!app) notFound();

  const validTracks = [...(app.memberTeams.length > 0 ? ["member"] : []), ...app.leadTeams.map((t) => `lead:${t}`)];
  const track = rawTrack && validTracks.includes(rawTrack) ? rawTrack : validTracks[0];
  if (!track) notFound();

  const trackLabel = track === "member" ? "General member application" : `Field team lead — ${track.slice("lead:".length)}`;

  const scores = await getScoresForAppTrack(id, track, "review");
  const mine = scores.find((s) => s.reviewerUid === uid);
  const others = scores.filter((s) => s.reviewerUid !== uid).map((s) => ({ reviewerName: s.reviewerName, score: s.score, comment: s.comment }));
  const avg = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : null;

  return (
    <div>
      <Link href="/admin/review" className="text-[13px] text-muted hover:text-white">← Back to review</Link>
      <div className="mt-4">
        <h1 className="t-card-title">{app.userName}</h1>
        <p className="text-[13px] text-muted">{app.userEmail}</p>
        <span className="badge badge-muted mt-2 inline-block">{trackLabel}</span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <ApplicationAnswers app={app} attendedEventIds={applicant?.attendedEventIds ?? []} />
        <div className="lg:sticky lg:top-24">
          <ReviewScorePanel appId={id} track={track} myScore={mine?.score ?? null} myComment={mine?.comment ?? ""} others={others} avg={avg} />
        </div>
      </div>
    </div>
  );
}
