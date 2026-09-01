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
