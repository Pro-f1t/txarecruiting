import { Application, StageDecision } from "@/lib/models/Application";
import { RecruitingStep, isAtOrPast } from "@/lib/models/Config";

export type VisibleStatus =
  | "submitted"
  | "interview"
  | "accepted"
  | "rejected_application" // not advanced past application review
  | "rejected_interview";  // advanced to interview, then not selected

export function statusFromDecisions(review: StageDecision[], final: StageDecision[], step: RecruitingStep): VisibleStatus {
  const anyReviewAdvanced = review.includes("advanced");
  const allReviewRejected = review.length > 0 && review.every((d) => d === "rejected");
  const anyFinalAdvanced = final.includes("advanced");
  const allFinalRejected = final.length > 0 && final.every((d) => d === "rejected");

  // Application-stage rejection becomes visible at interview release.
  if (isAtOrPast(step, RecruitingStep.RELEASE_INTERVIEWS) && allReviewRejected && !anyReviewAdvanced) {
    return "rejected_application";
  }
  if (isAtOrPast(step, RecruitingStep.RELEASE_DECISIONS)) {
    if (anyFinalAdvanced) return "accepted";
    if (allFinalRejected) return "rejected_interview";
  }
  if (isAtOrPast(step, RecruitingStep.RELEASE_INTERVIEWS) && anyReviewAdvanced) return "interview";
  return "submitted";
}

export type AppCard = {
  key: string;
  kind: "member" | "lead";
  title: string;
  teams: string[];
  status: VisibleStatus;
};

export function buildApplicationCards(app: Application, step: RecruitingStep): AppCard[] {
  const cards: AppCard[] = [];
  const rd = app.reviewDecisions ?? {};
  const fd = app.finalDecisions ?? {};

  // The general member application is ONE application (one decision), whatever
  // field teams were selected — those are interests, keyed under a single "member".
  if (app.memberTeams.length > 0) {
    const rev = [rd["member"]].filter(Boolean) as StageDecision[];
    const fin = [fd["member"]].filter(Boolean) as StageDecision[];
    cards.push({ key: "member", kind: "member", title: "General member application", teams: app.memberTeams, status: statusFromDecisions(rev, fin, step) });
  }
  for (const t of app.leadTeams) {
    const rev = [rd[`lead:${t}`]].filter(Boolean) as StageDecision[];
    const fin = [fd[`lead:${t}`]].filter(Boolean) as StageDecision[];
    cards.push({ key: `lead:${t}`, kind: "lead", title: `Field team lead — ${t}`, teams: [t], status: statusFromDecisions(rev, fin, step) });
  }
  return cards;
}

export const STATUS_PRESENTATION: Record<VisibleStatus, { badge: string; badgeClass: string; message: string }> = {
  submitted: { badge: "Submitted", badgeClass: "badge-ok", message: "Received and under review. Interview invites are announced here." },
  interview: { badge: "Interview", badgeClass: "badge-warn", message: "You've advanced to the interview stage 🎉 Watch your email for details." },
  accepted: { badge: "Accepted", badgeClass: "badge-ok", message: "Congratulations — you're in! 🎉 Welcome to Texas Accelerate." },
  rejected_application: { badge: "Not selected", badgeClass: "badge-danger", message: "Not selected at the application stage. Thank you for applying — we hope you apply again." },
  rejected_interview: { badge: "Not selected", badgeClass: "badge-danger", message: "Not selected after interviews. Thank you for applying — we hope you apply again." },
};

export const STAGES = ["Applied", "Interview", "Decision"] as const;
export type NodeState = "done" | "active" | "failed" | "todo";

/** State of each stepper node (Applied, Interview, Decision) for a status. */
export function nodeStates(status: VisibleStatus): NodeState[] {
  switch (status) {
    case "submitted": return ["active", "todo", "todo"];
    case "interview": return ["done", "active", "todo"];
    case "accepted": return ["done", "done", "done"];
    case "rejected_application": return ["done", "failed", "todo"];
    case "rejected_interview": return ["done", "done", "failed"];
  }
}
