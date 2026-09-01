import { adminDb } from "./admin";
import { RecruitingStep } from "@/lib/models/Config";

/** The current global recruiting step (config/recruiting.currentStep). */
export async function getRecruitingStep(): Promise<RecruitingStep> {
  const doc = await adminDb.doc("config/recruiting").get();
  const step = doc.exists ? (doc.data()?.currentStep as RecruitingStep) : undefined;
  return step && Object.values(RecruitingStep).includes(step) ? step : RecruitingStep.OPEN;
}

export async function setRecruitingStep(step: RecruitingStep, by: string): Promise<void> {
  await adminDb.doc("config/recruiting").set({ currentStep: step, updatedAt: new Date(), updatedBy: by }, { merge: true });
}

/** A single general interview signup link (config/interviews.signupLink). */
export async function getInterviewSignupLink(): Promise<string | null> {
  const doc = await adminDb.doc("config/interviews").get();
  const link = doc.exists ? (doc.data()?.signupLink as string | undefined) : undefined;
  return link && link.trim() ? link.trim() : null;
}

export async function setInterviewSignupLink(link: string, by: string): Promise<void> {
  await adminDb.doc("config/interviews").set({ signupLink: link.trim(), updatedAt: new Date(), updatedBy: by }, { merge: true });
}

// Tier-2 break-glass check-in: a static QR an exec arms from their phone when the
// live display can't run. Stored as config/attendanceBackup.{eventId} = expiresAt
// (ms). Auto-expires 15 min after arming.
const BACKUP_TTL_MS = 15 * 60 * 1000;

export async function isBackupArmed(eventId: string, now = Date.now()): Promise<boolean> {
  const doc = await adminDb.doc("config/attendanceBackup").get();
  const exp = doc.exists ? (doc.data()?.[eventId] as number | undefined) : undefined;
  return typeof exp === "number" && now < exp;
}

/** Returns each event's remaining armed ms (absent = not armed). */
export async function getBackupState(now = Date.now()): Promise<Record<string, number>> {
  const doc = await adminDb.doc("config/attendanceBackup").get();
  const data = (doc.exists ? doc.data() : {}) ?? {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "number" && now < v) out[k] = v - now;
  }
  return out;
}

export async function setBackup(eventId: string, armed: boolean, now = Date.now()): Promise<void> {
  await adminDb.doc("config/attendanceBackup").set(
    { [eventId]: armed ? now + BACKUP_TTL_MS : 0 },
    { merge: true }
  );
}
