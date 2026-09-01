import { Application, StageDecision } from "@/lib/models/Application";

export type AdminStatus = "awaiting_review" | "awaiting_interview" | "accepted" | "rejected";

function sub(review?: StageDecision, final?: StageDecision): AdminStatus {
  if (final === "advanced") return "accepted";
  if (final === "rejected") return "rejected";       // was at interview, then cut
  if (review === "advanced") return "awaiting_interview";
  if (review === "rejected") return "rejected";      // cut at application review
  return "awaiting_review";
}

const RANK: Record<AdminStatus, number> = { accepted: 3, awaiting_interview: 2, awaiting_review: 1, rejected: 0 };

/** Aggregate admin status across the member + each lead sub-application (best outcome wins). */
export function adminStatus(app: Application): AdminStatus {
  const subs: AdminStatus[] = [];
  if (app.memberTeams.length > 0) subs.push(sub(app.reviewDecisions?.["member"], app.finalDecisions?.["member"]));
  for (const t of app.leadTeams) subs.push(sub(app.reviewDecisions?.[`lead:${t}`], app.finalDecisions?.[`lead:${t}`]));
  if (subs.length === 0) return "awaiting_review";
  return subs.reduce((best, s) => (RANK[s] > RANK[best] ? s : best), subs[0]);
}

export const ADMIN_STATUS_LABEL: Record<AdminStatus, string> = {
  awaiting_review: "Awaiting review",
  awaiting_interview: "Awaiting interview",
  accepted: "Accepted",
  rejected: "Rejected",
};

export const ADMIN_STATUS_BADGE: Record<AdminStatus, string> = {
  awaiting_review: "badge-muted",
  awaiting_interview: "badge-warn",
  accepted: "badge-ok",
  rejected: "badge-danger",
};
