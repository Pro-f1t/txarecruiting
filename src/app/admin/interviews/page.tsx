import { requireStaff } from "@/lib/auth/guard";
import { getAllApplications } from "@/lib/firebase/applications";
import { getScores } from "@/lib/firebase/scores";
import { ApplicationStatus } from "@/lib/models/Application";
import { TEAMS } from "@/lib/models/User";
import ReviewBoard, { type ReviewItem, type Track } from "@/components/ReviewBoard";

export default async function AdminInterviews({ searchParams }: { searchParams: Promise<{ sort?: string; track?: string }> }) {
  const { sort, track: initialTrack } = await searchParams;
  const { uid } = await requireStaff();
  const [apps, interviewScores, reviewScores] = await Promise.all([getAllApplications(), getScores("interview"), getScores("review")]);
  const submitted = apps.filter((a) => a.status === ApplicationStatus.SUBMITTED);

  const index = (list: typeof interviewScores) => {
    const m = new Map<string, { sum: number; count: number; mine: number | null }>();
    for (const s of list) {
      const k = `${s.appId}::${s.track}`;
      const cur = m.get(k) ?? { sum: 0, count: 0, mine: null };
      cur.sum += s.score; cur.count += 1;
      if (s.reviewerUid === uid) cur.mine = s.score;
      m.set(k, cur);
    }
    return m;
  };
  const iv = index(interviewScores);
  const rv = index(reviewScores);
  const avgOf = (m: Map<string, { sum: number; count: number }>, k: string) => { const a = m.get(k); return a && a.count > 0 ? a.sum / a.count : null; };

  const inOrder = (a: (typeof submitted)[number], b: (typeof submitted)[number]) => +(a.submittedAt ?? 0) - +(b.submittedAt ?? 0);
  const buildItems = (appsInTrack: typeof submitted, track: string): ReviewItem[] =>
    [...appsInTrack].sort(inOrder).map((a) => {
      const k = `${a.id}::${track}`;
      const agg = iv.get(k);
      return {
        appId: a.id, name: a.userName ?? "Unknown", email: a.userEmail ?? "", teams: a.memberTeams,
        avg: avgOf(iv, k), priorAvg: avgOf(rv, k), count: agg?.count ?? 0, myScore: agg?.mine ?? null,
        decision: a.finalDecisions?.[track],
      };
    });

  const tracks: Track[] = [];
  const itemsByTrack: Record<string, ReviewItem[]> = {};

  // Only applicants advanced from application review (reviewDecision === advanced).
  const memberInterview = submitted.filter((a) => a.memberTeams.length > 0 && a.reviewDecisions?.["member"] === "advanced");
  if (memberInterview.length > 0) {
    tracks.push({ key: "member", label: "General member pool" });
    itemsByTrack["member"] = buildItems(memberInterview, "member");
  }
  for (const team of TEAMS) {
    const leadInterview = submitted.filter((a) => a.leadTeams.includes(team) && a.reviewDecisions?.[`lead:${team}`] === "advanced");
    if (leadInterview.length > 0) {
      const key = `lead:${team}`;
      tracks.push({ key, label: `Lead — ${team}` });
      itemsByTrack[key] = buildItems(leadInterview, key);
    }
  }

  return (
    <div>
      <h1 className="t-card-title">Interview review</h1>
      <p className="t-body mt-2 max-w-[70ch] text-muted">
        Only applicants advanced from application review appear here. Score their interviews 1–10, then use the ranking to make the final accept/reject decision.
      </p>

      <div className="mt-6">
        {tracks.length === 0 ? (
          <p className="t-body text-muted">No one has been advanced to interviews yet — mark applicants &ldquo;Interview&rdquo; in Application review first.</p>
        ) : (
          <ReviewBoard tracks={tracks} itemsByTrack={itemsByTrack} decisionStage="final" detailBase="/admin/interviews" advanceLabel="Accept" dualScore initialSortByScore={sort === "score"} initialTrack={initialTrack} />
        )}
      </div>
    </div>
  );
}
