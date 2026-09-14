import { redirect } from "next/navigation";
import { requireApplicationReviewer, guardErrorStatus } from "@/lib/auth/guard";
import { getAllApplications } from "@/lib/firebase/applications";
import { getScores } from "@/lib/firebase/scores";
import { ApplicationStatus } from "@/lib/models/Application";
import { TEAMS } from "@/lib/models/User";
import ReviewBoard, { type ReviewItem, type Track } from "@/components/ReviewBoard";
import ScoringGuideCallout from "@/components/ScoringGuideCallout";
import { applicationReviewLocked } from "@/lib/applicationsOpen";

export default async function AdminReview({ searchParams }: { searchParams: Promise<{ sort?: string; track?: string }> }) {
  const { sort, track: initialTrack } = await searchParams;
  let uid: string;
  try {
    ({ uid } = await requireApplicationReviewer());
  } catch (e) {
    redirect(guardErrorStatus(e) === 403 ? "/admin" : "/auth/login");
  }
  const [apps, scores, locked] = await Promise.all([getAllApplications(), getScores("review"), applicationReviewLocked()]);
  const submitted = apps.filter((a) => a.status === ApplicationStatus.SUBMITTED);

  // scores indexed by `${appId}::${track}`
  const byKey = new Map<string, { sum: number; count: number; mine: number | null }>();
  for (const s of scores) {
    const k = `${s.appId}::${s.track}`;
    const cur = byKey.get(k) ?? { sum: 0, count: 0, mine: null };
    cur.sum += s.score; cur.count += 1;
    if (s.reviewerUid === uid) cur.mine = s.score;
    byKey.set(k, cur);
  }

  // Submission order (stable) - the board offers an opt-in sort by score.
  const inOrder = (a: (typeof submitted)[number], b: (typeof submitted)[number]) => +(a.submittedAt ?? 0) - +(b.submittedAt ?? 0);
  const buildItems = (appsInTrack: typeof submitted, track: string): ReviewItem[] =>
    [...appsInTrack].sort(inOrder).map((a) => {
      const agg = byKey.get(`${a.id}::${track}`);
      return {
        appId: a.id, name: a.userName ?? "Unknown", email: a.userEmail ?? "", teams: a.memberTeams,
        avg: agg && agg.count > 0 ? agg.sum / agg.count : null,
        count: agg?.count ?? 0, myScore: agg?.mine ?? null,
        decision: a.reviewDecisions?.[track],
      };
    });

  // The signed-in reviewer's own general-member review scores, bucketed 1..10, for the
  // "Your distribution" chart. Lead-track scores are excluded - the curve is for the GM pool.
  const mineList = scores.filter((s) => s.reviewerUid === uid && s.track === "member");
  const mine = {
    counts: Array.from({ length: 10 }, (_, i) => mineList.filter((s) => s.score === i + 1).length),
    total: mineList.length,
    mean: mineList.length ? mineList.reduce((sum, s) => sum + s.score, 0) / mineList.length : null,
  };

  const tracks: Track[] = [];
  const itemsByTrack: Record<string, ReviewItem[]> = {};

  const memberApps = submitted.filter((a) => a.memberTeams.length > 0);
  if (memberApps.length > 0) {
    tracks.push({ key: "member", label: "General member pool" });
    itemsByTrack["member"] = buildItems(memberApps, "member");
  }
  for (const team of TEAMS) {
    const leadApps = submitted.filter((a) => a.leadTeams.includes(team));
    if (leadApps.length > 0) {
      const key = `lead:${team}`;
      tracks.push({ key, label: `Lead - ${team}` });
      itemsByTrack[key] = buildItems(leadApps, key);
    }
  }

  return (
    <div>
      <h1 className="t-card-title">Application review</h1>
      <p className="t-body mt-2 max-w-[70ch] text-muted">
        Everyone scores applicants 1–10 (async). Members are one general pool; each field-team lead is its own track.
        Once scored, use the ranking to decide who moves to interviews - advance individually or set a cutoff with &ldquo;Advance top N.&rdquo;
      </p>
      {locked && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl p-4" style={{ background: "color-mix(in srgb, var(--color-danger) 12%, transparent)", border: "1px solid var(--color-danger)" }}>
          <span className="text-[16px]" style={{ color: "var(--color-danger)" }}>🔒</span>
          <div>
            <p className="text-[14px] font-bold" style={{ color: "var(--color-danger)" }}>Application review is locked</p>
            <p className="mt-0.5 text-[13px] text-muted">Interview invites have been released, so scores and Interview/Reject decisions are read-only - changing them now would change what applicants already see. An admin can move the recruiting step back to Reviewing from Overview to unlock.</p>
          </div>
        </div>
      )}
      <div className="mt-6"><ScoringGuideCallout mine={mine} /></div>
      <div className="mt-6">
        {tracks.length === 0 ? (
          <p className="t-body text-muted">No submitted applications to review yet.</p>
        ) : (
          <ReviewBoard tracks={tracks} itemsByTrack={itemsByTrack} initialSortByScore={sort === "score"} initialTrack={initialTrack} locked={locked} />
        )}
      </div>
    </div>
  );
}
