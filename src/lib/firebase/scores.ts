import { adminDb } from "./admin";

// A single reviewer's score for one application track at one stage.
// track = "member" (general pool) or `lead:${team}`. stage = "review" | "interview".
export interface Score {
  appId: string;
  track: string;
  stage: "review" | "interview";
  reviewerUid: string;
  reviewerName?: string;
  score: number;        // 1–10
  comment?: string;
  at?: Date;
}

const COL = "scores";
const sanitize = (s: string) => s.replace(/[^a-z0-9]+/gi, "-");
const docId = (stage: string, track: string, appId: string, reviewerUid: string) =>
  `${stage}__${sanitize(track)}__${appId}__${reviewerUid}`;

export async function upsertScore(s: Score): Promise<void> {
  await adminDb.collection(COL).doc(docId(s.stage, s.track, s.appId, s.reviewerUid)).set(
    { appId: s.appId, track: s.track, stage: s.stage, reviewerUid: s.reviewerUid, reviewerName: s.reviewerName ?? null, score: s.score, comment: s.comment ?? null, at: new Date() },
    { merge: true }
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toScore(d: any): Score {
  return { appId: d.appId, track: d.track, stage: d.stage, reviewerUid: d.reviewerUid, reviewerName: d.reviewerName, score: d.score, comment: d.comment, at: d.at?.toDate ? d.at.toDate() : d.at };
}

/** All scores for a stage. */
export async function getScores(stage: "review" | "interview"): Promise<Score[]> {
  const snap = await adminDb.collection(COL).where("stage", "==", stage).get();
  return snap.docs.map((doc) => toScore(doc.data()));
}

/** All scores for one application + track + stage (every reviewer). */
export async function getScoresForAppTrack(appId: string, track: string, stage: "review" | "interview"): Promise<Score[]> {
  const snap = await adminDb.collection(COL).where("appId", "==", appId).where("track", "==", track).where("stage", "==", stage).get();
  return snap.docs.map((doc) => toScore(doc.data())).sort((a, b) => (+(b.at ?? 0)) - (+(a.at ?? 0)));
}

export async function clearScore(appId: string, track: string, stage: "review" | "interview", reviewerUid: string): Promise<void> {
  await adminDb.collection(COL).doc(docId(stage, track, appId, reviewerUid)).delete();
}
