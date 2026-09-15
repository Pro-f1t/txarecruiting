import { adminDb } from "./admin";
import { LEGACY_STEP, RecruitingStep, STEP_ORDER } from "@/lib/models/Config";
import { recordAudit } from "./audit";

/** The current global recruiting step (config/recruiting.currentStep). */
export interface StepSchedule { at: Date; to: RecruitingStep }

function readSchedule(data: FirebaseFirestore.DocumentData | undefined): StepSchedule | null {
  const at = data?.autoAdvanceAt;
  const to = data?.autoAdvanceTo as RecruitingStep | undefined;
  if (!at || !to || !Object.values(RecruitingStep).includes(to)) return null;
  return { at: at.toDate ? at.toDate() : new Date(at), to };
}

function normalizeStep(raw: string | undefined): RecruitingStep {
  if (raw && raw in LEGACY_STEP) return LEGACY_STEP[raw];
  const step = raw as RecruitingStep | undefined;
  return step && Object.values(RecruitingStep).includes(step) ? step : RecruitingStep.OPEN;
}

/**
 * The current global recruiting step (config/recruiting.currentStep).
 * If an auto-advance is scheduled and its time has passed, the first read after
 * that moment applies it (exact to the second, no cron needed) and logs it.
 */
export async function getRecruitingStep(): Promise<RecruitingStep> {
  const doc = await adminDb.doc("config/recruiting").get();
  const data = doc.exists ? doc.data() : undefined;
  const current = normalizeStep(data?.currentStep as string | undefined);
  const schedule = readSchedule(data);
  if (schedule && Date.now() >= schedule.at.getTime()) {
    const due = STEP_ORDER.indexOf(schedule.to) > STEP_ORDER.indexOf(current);
    await adminDb.doc("config/recruiting").set(
      { ...(due ? { currentStep: schedule.to, updatedAt: new Date(), updatedBy: "scheduled" } : {}), autoAdvanceAt: null, autoAdvanceTo: null },
      { merge: true }
    );
    if (due) await recordAudit({ actorUid: "system", actorName: "Scheduled auto-advance", action: "step.set", detail: `${schedule.to} (scheduled for ${schedule.at.toISOString()})` });
    return due ? schedule.to : current;
  }
  return current;
}

/** A pending auto-advance, if any (does not apply it). */
export async function getStepSchedule(): Promise<StepSchedule | null> {
  const doc = await adminDb.doc("config/recruiting").get();
  return readSchedule(doc.exists ? doc.data() : undefined);
}

export async function setStepSchedule(schedule: StepSchedule | null, by: string): Promise<void> {
  await adminDb.doc("config/recruiting").set(
    { autoAdvanceAt: schedule?.at ?? null, autoAdvanceTo: schedule?.to ?? null, scheduleUpdatedAt: new Date(), scheduleUpdatedBy: by },
    { merge: true }
  );
}

export async function setRecruitingStep(step: RecruitingStep, by: string): Promise<void> {
  await adminDb.doc("config/recruiting").set({ currentStep: step, updatedAt: new Date(), updatedBy: by }, { merge: true });
}

/**
 * The interview scheduling message shown to every interview-stage applicant
 * (config/interviews.message). Free text - admins put the room links, times,
 * and instructions in here. Empty/missing = "not available yet" placeholder.
 */
export async function getInterviewMessage(): Promise<string | null> {
  const doc = await adminDb.doc("config/interviews").get();
  const message = doc.exists ? (doc.data()?.message as string | undefined) : undefined;
  return message && message.trim() ? message : null;
}

/** Interviewer procedure shown at the top of every interview review page (config/interviews.procedure). */
export async function getInterviewProcedure(): Promise<string | null> {
  const doc = await adminDb.doc("config/interviews").get();
  const v = doc.exists ? (doc.data()?.procedure as string | undefined) : undefined;
  return v && v.trim() ? v : null;
}

export async function setInterviewProcedure(procedure: string, by: string): Promise<void> {
  await adminDb.doc("config/interviews").set({ procedure: procedure.trim(), procedureUpdatedAt: new Date(), procedureUpdatedBy: by }, { merge: true });
}

export async function setInterviewMessage(message: string, by: string): Promise<void> {
  await adminDb.doc("config/interviews").set({ message: message.trim(), updatedAt: new Date(), updatedBy: by }, { merge: true });
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
