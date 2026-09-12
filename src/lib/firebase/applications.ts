import { adminDb } from "./admin";
import { Application, ApplicationStatus, ApplicationFormData, StageDecision } from "@/lib/models/Application";
import { Team } from "@/lib/models/User";
import { FieldValue, FieldPath } from "firebase-admin/firestore";

const COL = "applications";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pruneUndefined<T extends Record<string, any>>(obj: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) ? pruneUndefined(v) : v;
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toApp(id: string, d: any): Application {
  return {
    id,
    userId: d.userId,
    userName: d.userName,
    userEmail: d.userEmail,
    memberTeams: d.memberTeams ?? [],
    leadTeams: d.leadTeams ?? [],
    status: d.status ?? ApplicationStatus.SUBMITTED,
    reviewDecisions: d.reviewDecisions ?? {},
    finalDecisions: d.finalDecisions ?? {},
    formData: d.formData ?? {},
    createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
    updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : new Date(),
    submittedAt: d.submittedAt?.toDate ? d.submittedAt.toDate() : undefined,
  };
}

/** The applicant's single application (doc id = userId), or null. */
export async function getUserApplication(userId: string): Promise<Application | null> {
  const doc = await adminDb.collection(COL).doc(userId).get();
  return doc.exists ? toApp(doc.id, doc.data()) : null;
}

export async function getApplication(id: string): Promise<Application | null> {
  const doc = await adminDb.collection(COL).doc(id).get();
  return doc.exists ? toApp(doc.id, doc.data()) : null;
}

/** All applications (admin). Most-recently-updated first. */
export async function getAllApplications(): Promise<Application[]> {
  const snap = await adminDb.collection(COL).get();
  return snap.docs.map((d) => toApp(d.id, d.data())).sort((a, b) => +b.updatedAt - +a.updatedAt);
}

/**
 * Record a per-(team, role) decision (admin). `key` is `${role}:${team}`,
 * `stage` is "review" (interview cut) or "final" (accept/reject).
 */
/** Delete an application, its scores, and unlink it from the user (admin). */
export async function deleteApplication(id: string): Promise<void> {
  const app = await getApplication(id);
  const scoreSnap = await adminDb.collection("scores").where("appId", "==", id).get();
  const batch = adminDb.batch();
  for (const d of scoreSnap.docs) batch.delete(d.ref);
  batch.delete(adminDb.collection(COL).doc(id));
  await batch.commit();
  if (app?.userId) {
    await adminDb.collection("users").doc(app.userId).update({ applications: FieldValue.arrayRemove(id) }).catch(() => {});
  }
}

export async function setDecision(
  appId: string,
  key: string,
  stage: "review" | "final",
  decision: StageDecision
): Promise<void> {
  const field = stage === "review" ? "reviewDecisions" : "finalDecisions";
  await adminDb.collection(COL).doc(appId).update(new FieldPath(field, key), decision, "updatedAt", new Date());
}

/** Reset every decision for one track at one stage back to "pending". Returns how many changed. */
export async function clearDecisionsForTrack(appIds: string[], key: string, stage: "review" | "final"): Promise<number> {
  const field = stage === "review" ? "reviewDecisions" : "finalDecisions";
  let changed = 0;
  // Firestore batches cap at 500 writes; chunk to stay under.
  for (let i = 0; i < appIds.length; i += 400) {
    const batch = adminDb.batch();
    for (const id of appIds.slice(i, i + 400)) {
      batch.update(adminDb.collection(COL).doc(id), new FieldPath(field, key), "pending", "updatedAt", new Date());
      changed += 1;
    }
    await batch.commit();
  }
  return changed;
}

/**
 * Create or update the applicant's single application. Editable before the
 * deadline — submitting again overwrites the previous answers/selections.
 */
export async function upsertApplication(
  meta: { userId: string; userName?: string; userEmail?: string },
  data: { memberTeams: Team[]; leadTeams: Team[]; formData: ApplicationFormData },
  finalize: boolean
): Promise<Application> {
  const ref = adminDb.collection(COL).doc(meta.userId);
  const snap = await ref.get();
  const now = new Date();

  // Save-progress keeps a draft as a draft; an already-submitted application
  // stays submitted. Submitting always finalizes.
  const wasSubmitted = snap.exists && snap.data()?.status === ApplicationStatus.SUBMITTED;
  const status = finalize || wasSubmitted ? ApplicationStatus.SUBMITTED : ApplicationStatus.IN_PROGRESS;

  const payload = pruneUndefined({
    userId: meta.userId,
    userName: meta.userName ?? null,
    userEmail: meta.userEmail ?? null,
    memberTeams: data.memberTeams,
    leadTeams: data.leadTeams,
    status,
    formData: pruneUndefined(data.formData),
    updatedAt: now,
    submittedAt: status === ApplicationStatus.SUBMITTED ? (snap.data()?.submittedAt ?? now) : undefined,
    ...(snap.exists ? {} : { createdAt: now }),
  });

  await ref.set(payload, { merge: true });
  if (!snap.exists) {
    await adminDb.collection("users").doc(meta.userId).update({ applications: FieldValue.arrayUnion(meta.userId) }).catch(() => {});
  }
  return (await getApplication(meta.userId))!;
}
