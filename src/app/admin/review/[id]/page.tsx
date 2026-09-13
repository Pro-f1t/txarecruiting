import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireApplicationReviewer, guardErrorStatus } from "@/lib/auth/guard";
import { getApplication, getTrackNeighbors } from "@/lib/firebase/applications";
import { getUser } from "@/lib/firebase/users";
import { getConversationsForApplicant } from "@/lib/firebase/conversations";
import { getScoresForAppTrack } from "@/lib/firebase/scores";
import ApplicationAnswers from "@/components/ApplicationAnswers";
import ReviewScorePanel from "@/components/ReviewScorePanel";
import ReviewNav from "@/components/ReviewNav";

export default async function ReviewDetail({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ track?: string }>;
}) {
  let uid: string;
  try {
    ({ uid } = await requireApplicationReviewer());
  } catch (e) {
    redirect(guardErrorStatus(e) === 403 ? "/admin" : "/auth/login");
  }
  const { id } = await params;
  const { track: rawTrack } = await searchParams;

  const app = await getApplication(id);
  const applicant = await getUser(app?.userId ?? id);
  const conversations = await getConversationsForApplicant(app?.userId ?? id);
  if (!app) notFound();

  const validTracks = [...(app.memberTeams.length > 0 ? ["member"] : []), ...app.leadTeams.map((t) => `lead:${t}`)];
  const track = rawTrack && validTracks.includes(rawTrack) ? rawTrack : validTracks[0];
  if (!track) notFound();

  const nav = await getTrackNeighbors(id, track, false);

  const trackLabel = track === "member" ? "General member application" : `Field team lead — ${track.slice("lead:".length)}`;

  const scores = await getScoresForAppTrack(id, track, "review");
  const mine = scores.find((s) => s.reviewerUid === uid);
  const others = scores.filter((s) => s.reviewerUid !== uid).map((s) => ({ reviewerName: s.reviewerName, score: s.score, comment: s.comment }));
  const avg = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/review" className="text-[13px] text-muted hover:text-white">← Back to review</Link>
        <ReviewNav base="/admin/review" track={track} {...nav} />
      </div>
      <div className="mt-4">
        <h1 className="t-card-title">{app.userName}</h1>
        <p className="text-[13px] text-muted">{app.userEmail}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="badge badge-muted">{trackLabel}</span>
          {track === "member" && app.memberTeams.length > 0 && (
            <span className="text-[13px] text-muted">Interested in: <span className="text-white">{app.memberTeams.join(", ")}</span></span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <ApplicationAnswers app={app} attendedEventIds={applicant?.attendedEventIds ?? []} conversations={conversations} />
        <div className="lg:sticky lg:top-24">
          <ReviewScorePanel appId={id} track={track} myScore={mine?.score ?? null} myComment={mine?.comment ?? ""} others={others} avg={avg} />
        </div>
      </div>
    </div>
  );
}
