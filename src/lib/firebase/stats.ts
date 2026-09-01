import { getAllApplications } from "./applications";
import { ApplicationStatus, Application } from "@/lib/models/Application";
import { TEAMS } from "@/lib/models/User";

export interface Named { value: string; count: number }
export interface TeamDemand { team: string; member: number; lead: number; total: number }
export interface TeamStage { team: string; total: number; advanced: number; pct: number }

export interface CohortStats {
  total: number;                 // distinct applicants in the cohort
  member: { total: number; advanced: number; pct: number };
  byTeam: TeamStage[];           // lead conversion per field team
  majors: Named[];
}

export interface TxaStats {
  overall: {
    total: number; submitted: number; drafts: number; leadApps: number; pctSubmitted: number;
    byTeam: TeamDemand[]; majors: Named[]; gradYears: Named[];
  };
  interview: CohortStats;   // advanced from review
  accepted: CohortStats;    // advanced from interview (final)
}

const topN = (map: Record<string, number>, n: number): Named[] => {
  const sorted = Object.entries(map).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, n);
  const other = sorted.slice(n).reduce((s, m) => s + m.count, 0);
  return other > 0 ? [...top, { value: `Other (${sorted.length - n})`, count: other }] : top;
};

const majorsOf = (apps: Application[]): Named[] => {
  const m: Record<string, number> = {};
  for (const a of apps) for (const x of [a.formData.major, a.formData.major2].filter(Boolean) as string[]) m[x] = (m[x] ?? 0) + 1;
  return topN(m, 10);
};

// A cohort by a decision map ("review" advanced → interview; "final" advanced → accepted).
function cohort(submitted: Application[], stage: "review" | "final"): CohortStats {
  const decMap = (a: Application) => (stage === "review" ? a.reviewDecisions : a.finalDecisions) ?? {};
  const inCohort = submitted.filter((a) => Object.values(decMap(a)).includes("advanced"));

  const memberSubmitted = submitted.filter((a) => a.memberTeams.length > 0);
  const memberAdvanced = memberSubmitted.filter((a) => decMap(a)["member"] === "advanced");

  const byTeam: TeamStage[] = TEAMS.map((team) => {
    const total = submitted.filter((a) => a.leadTeams.includes(team)).length;
    const advanced = submitted.filter((a) => a.leadTeams.includes(team) && decMap(a)[`lead:${team}`] === "advanced").length;
    return { team, total, advanced, pct: total > 0 ? Math.round((advanced / total) * 100) : 0 };
  }).filter((t) => t.total > 0).sort((a, b) => b.advanced - a.advanced);

  return {
    total: inCohort.length,
    member: { total: memberSubmitted.length, advanced: memberAdvanced.length, pct: memberSubmitted.length > 0 ? Math.round((memberAdvanced.length / memberSubmitted.length) * 100) : 0 },
    byTeam,
    majors: majorsOf(inCohort),
  };
}

export async function computeStats(): Promise<TxaStats> {
  const apps = await getAllApplications();
  const submitted = apps.filter((a) => a.status === ApplicationStatus.SUBMITTED);
  const drafts = apps.filter((a) => a.status === ApplicationStatus.IN_PROGRESS);
  const leadApps = submitted.filter((a) => a.leadTeams.length > 0);

  const byTeam: TeamDemand[] = TEAMS.map((t) => {
    const member = submitted.filter((a) => a.memberTeams.includes(t)).length;
    const lead = submitted.filter((a) => a.leadTeams.includes(t)).length;
    const total = submitted.filter((a) => a.memberTeams.includes(t) || a.leadTeams.includes(t)).length;
    return { team: t as string, member, lead, total };
  }).sort((a, b) => b.total - a.total);

  const gradMap: Record<string, number> = {};
  for (const a of submitted) { const g = a.formData.graduationYear; if (g) gradMap[g] = (gradMap[g] ?? 0) + 1; }
  const gradYears = Object.entries(gradMap).map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value));

  const started = submitted.length + drafts.length;
  const pctSubmitted = started > 0 ? Math.round((submitted.length / started) * 100) : 0;

  return {
    overall: { total: apps.length, submitted: submitted.length, drafts: drafts.length, leadApps: leadApps.length, pctSubmitted, byTeam, majors: majorsOf(submitted), gradYears },
    interview: cohort(submitted, "review"),
    accepted: cohort(submitted, "final"),
  };
}
