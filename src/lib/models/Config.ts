// The global recruiting step, advanced by admins. Drives what an applicant
// sees (their decisions are masked until the matching release step).
export enum RecruitingStep {
  PRE_OPEN = "pre_open",
  OPEN = "open",
  REVIEWING = "reviewing",
  // One step: interview invites are revealed to applicants AND interview signup
  // opens. (Formerly two steps — "release_interviews" is mapped onto this on read.)
  INTERVIEWING = "interviewing",
  RELEASE_DECISIONS = "release_decisions",
}

/** Values that older config docs may still hold, mapped onto the current steps. */
export const LEGACY_STEP: Record<string, RecruitingStep> = { release_interviews: RecruitingStep.INTERVIEWING };

export const STEP_ORDER: RecruitingStep[] = [
  RecruitingStep.PRE_OPEN,
  RecruitingStep.OPEN,
  RecruitingStep.REVIEWING,
  RecruitingStep.INTERVIEWING,
  RecruitingStep.RELEASE_DECISIONS,
];

export function isAtOrPast(step: RecruitingStep | null | undefined, target: RecruitingStep): boolean {
  if (!step) return false;
  return STEP_ORDER.indexOf(step) >= STEP_ORDER.indexOf(target);
}

export const STEP_LABELS: Record<RecruitingStep, string> = {
  [RecruitingStep.PRE_OPEN]: "Pre-open",
  [RecruitingStep.OPEN]: "Applications open",
  [RecruitingStep.REVIEWING]: "Reviewing",
  [RecruitingStep.INTERVIEWING]: "Interviewing — invites released",
  [RecruitingStep.RELEASE_DECISIONS]: "Decisions released",
};
