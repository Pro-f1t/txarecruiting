import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guard";
import { getApplication } from "@/lib/firebase/applications";
import { getUser } from "@/lib/firebase/users";
import { getConversationsForApplicant } from "@/lib/firebase/conversations";
import { getScoresForAppTrack } from "@/lib/firebase/scores";
import ApplicationAnswers from "@/components/ApplicationAnswers";
import ReviewScorePanel from "@/components/ReviewScorePanel";

export default async function InterviewDetail({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ track?: string }>;
}) {
  const { uid } = await requireStaff();
  const { id } = await params;
  const { track: rawTrack } = await searchParams;

  const app = await getApplication(id);
  const applicant = await getUser(app?.userId ?? id);
  const conversations = await getConversationsForApplicant(app?.userId ?? id);
  if (!app) notFound();

  // Only tracks the applicant was advanced to interview for.
  const interviewTracks = [
    ...(app.memberTeams.length > 0 && app.reviewDecisions?.["member"] === "advanced" ? ["member"] : []),
    ...app.leadTeams.filter((t) => app.reviewDecisions?.[`lead:${t}`] === "advanced").map((t) => `lead:${t}`),
  ];
  const track = rawTrack && interviewTracks.includes(rawTrack) ? rawTrack : interviewTracks[0];
  if (!track) notFound();

  const trackLabel = track === "member" ? "General member application" : `Field team lead — ${track.slice("lead:".length)}`;

  const [scores, reviewScores] = await Promise.all([
    getScoresForAppTrack(id, track, "interview"),
    getScoresForAppTrack(id, track, "review"),
  ]);
  const mine = scores.find((s) => s.reviewerUid === uid);
  const others = scores.filter((s) => s.reviewerUid !== uid).map((s) => ({ reviewerName: s.reviewerName, score: s.score, comment: s.comment }));
  const avg = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : null;
  const priorAvg = reviewScores.length > 0 ? reviewScores.reduce((sum, s) => sum + s.score, 0) / reviewScores.length : null;

  return (
    <div>
      <Link href="/admin/interviews" className="text-[13px] text-muted hover:text-white">← Back to interview review</Link>
      <div className="mt-4">
        <h1 className="t-card-title">{app.userName}</h1>
        <p className="text-[13px] text-muted">{app.userEmail}</p>
        <span className="badge badge-warn mt-2 inline-block">Interview · {trackLabel}</span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <ApplicationAnswers app={app} attendedEventIds={applicant?.attendedEventIds ?? []} conversations={conversations} />
        <div className="lg:sticky lg:top-24">
          <ReviewScorePanel appId={id} track={track} stage="interview" myScore={mine?.score ?? null} myComment={mine?.comment ?? ""} others={others} avg={avg} priorAvg={priorAvg} />
        </div>
      </div>
    </div>
  );
}
