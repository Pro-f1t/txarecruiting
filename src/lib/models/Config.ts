// The global recruiting step, advanced by admins. Drives what an applicant
// sees (their decisions are masked until the matching release step).
export enum RecruitingStep {
  PRE_OPEN = "pre_open",
  OPEN = "open",
  REVIEWING = "reviewing",
  RELEASE_INTERVIEWS = "release_interviews",
  INTERVIEWING = "interviewing",
  RELEASE_DECISIONS = "release_decisions",
}

export const STEP_ORDER: RecruitingStep[] = [
  RecruitingStep.PRE_OPEN,
  RecruitingStep.OPEN,
  RecruitingStep.REVIEWING,
  RecruitingStep.RELEASE_INTERVIEWS,
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
  [RecruitingStep.RELEASE_INTERVIEWS]: "Interview invites released",
  [RecruitingStep.INTERVIEWING]: "Interviewing",
  [RecruitingStep.RELEASE_DECISIONS]: "Decisions released",
};
