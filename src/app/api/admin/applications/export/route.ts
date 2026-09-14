import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { getAllApplications } from "@/lib/firebase/applications";
import { getAllUsers } from "@/lib/firebase/users";
import { getScores, type Score } from "@/lib/firebase/scores";
import { Application, ApplicationStatus } from "@/lib/models/Application";
import { adminStatus, ADMIN_STATUS_LABEL } from "@/lib/utils/adminStatus";
import { EVENTS } from "@/data/events";

export const dynamic = "force-dynamic";

// Row heights in points. Excel's default is 15; these give the sheets some air.
const ROW_H = 26;
const HEADER_H = 30;
const LINE_H = 16;

const EVENT_TITLE = new Map(EVENTS.map((e) => [e.id, e.title]));
const iso = (d?: Date) => (d ? new Date(d).toISOString() : "");
const round1 = (n: number | null) => (n == null ? "" : Math.round(n * 10) / 10);

const trackLabel = (key: string) => (key === "member" ? "General member" : `Lead - ${key.slice("lead:".length)}`);
const tracksOf = (a: Application) => [...(a.memberTeams.length > 0 ? ["member"] : []), ...a.leadTeams.map((t) => `lead:${t}`)];
const decisionLabel = (d?: string, stage: "review" | "final" = "review") =>
  d === "advanced" ? (stage === "review" ? "Interview" : "Accepted") : d === "rejected" ? "Rejected" : "Pending";

function decisions(map: Record<string, string> | undefined, stage: "review" | "final"): string {
  if (!map) return "";
  return Object.entries(map).map(([k, val]) => `${trackLabel(k)}: ${decisionLabel(val, stage)}`).join("; ");
}

/** scores indexed by `${appId}::${track}` */
function index(list: Score[]) {
  const m = new Map<string, Score[]>();
  for (const s of list) {
    const k = `${s.appId}::${s.track}`;
    m.set(k, [...(m.get(k) ?? []), s]);
  }
  return m;
}
const avg = (list: Score[] | undefined): number | null => (list && list.length ? list.reduce((s, x) => s + x.score, 0) / list.length : null);
const overall = (a: number | null, b: number | null) => { const v = [a, b].filter((x): x is number => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

// ── Styling ──────────────────────────────────────────────────────────────
// Brand-ish palette: ink header with white text, soft zebra rows, hairline borders,
// and tinted decision/status cells so outcomes read at a glance.
const INK = "FF16141C", ACCENT = "FF60A5FA", ZEBRA = "FFF4F6FB", LINE = "FFD9DEE8";
const TINT: Record<string, { fill: string; font: string }> = {
  Accepted:            { fill: "FFDCF5E6", font: "FF166534" },
  Interview:           { fill: "FFDCF5E6", font: "FF166534" },
  "Awaiting interview":{ fill: "FFFFF3CD", font: "FF92400E" },
  "Awaiting review":   { fill: "FFEEF0F5", font: "FF475569" },
  Pending:             { fill: "FFEEF0F5", font: "FF475569" },
  Rejected:            { fill: "FFFDE2E2", font: "FF991B1B" },
  Draft:               { fill: "FFEEF0F5", font: "FF64748B" },
};
// Columns that are short values → centered. Everything else is left-aligned prose.
const CENTER_KEYS = new Set(["first", "last", "phone", "grad", "status", "decision", "avg", "appAvg", "ivAvg", "overall", "count", "role", "score"]);
const isCenter = (key: string) => CENTER_KEYS.has(key) || /^s\d+$/.test(key);
const isBold = (key: string) => key === "name" || key === "avg" || key === "overall" || /^r\d+$/.test(key);
const thin = { style: "thin" as const, color: { argb: LINE } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

/** `freezeCols` = how many leading columns stay pinned while scrolling right. */
function addSheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width?: number }[], rows: Record<string, unknown>[], freezeCols = 0) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", xSplit: freezeCols, ySplit: 1 }], properties: { defaultRowHeight: ROW_H } });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));

  const header = ws.getRow(1);
  header.height = HEADER_H;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { ...BORDER, bottom: { style: "medium", color: { argb: ACCENT } } };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  for (const r of rows) ws.addRow(r);

  ws.eachRow((row, i) => {
    if (i === 1) return;
    // Row height: estimate lines per cell from column width (≈ chars per line), take the max.
    let lines = 1;
    columns.forEach((c, ci) => {
      const v = row.getCell(ci + 1).value;
      const text = v == null ? "" : String(v);
      if (!text) return;
      const perLine = Math.max(8, Math.floor((c.width ?? 18) * 1.1));
      const est = text.split("\n").reduce((n, para) => n + Math.max(1, Math.ceil(para.length / perLine)), 0);
      lines = Math.max(lines, est);
    });
    row.height = Math.min(Math.max(ROW_H, LINE_H * lines + 10), 409); // Excel caps row height at 409pt
    const zebra = i % 2 === 0;

    columns.forEach((c, ci) => {
      const cell = row.getCell(ci + 1);
      const text = cell.value == null ? "" : String(cell.value);
      cell.border = BORDER;
      cell.alignment = { vertical: lines > 1 ? "top" : "middle", horizontal: isCenter(c.key) ? "center" : "left", wrapText: true };
      cell.font = { size: 11, bold: isBold(c.key) };
      if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
      const tint = (c.key === "decision" || c.key === "status") ? TINT[text] : undefined;
      if (tint) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tint.fill } };
        cell.font = { size: 11, bold: true, color: { argb: tint.font } };
      }
      // Averages get one decimal so "7" and "7.0" don't mix.
      if ((c.key === "avg" || c.key === "appAvg" || c.key === "ivAvg" || c.key === "overall") && typeof cell.value === "number") cell.numFmt = "0.0";
    });
  });
  return ws;
}

export async function GET() {
  try {
    await requireStaff();

    const [apps, users, reviewScores, interviewScores] = await Promise.all([
      getAllApplications(), getAllUsers(), getScores("review"), getScores("interview"),
    ]);
    const attendance = new Map(users.map((u) => [u.uid, u.attendedEventIds ?? []]));
    const rv = index(reviewScores);
    const iv = index(interviewScores);
    const byName = (a: Application, b: Application) => (a.userName ?? "").localeCompare(b.userName ?? "");
    const sorted = [...apps].sort(byName);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Texas Accelerate Recruiting";
    wb.created = new Date();

    // ── Sheet 1: every application, every answer ──────────────────────────
    addSheet(wb, "Application responses", [
      { header: "Application ID", key: "id", width: 30 }, { header: "First name", key: "first" }, { header: "Last name", key: "last" },
      { header: "Name", key: "name", width: 24 }, { header: "Email", key: "email", width: 28 }, { header: "Phone", key: "phone" },
      { header: "Major", key: "major", width: 22 }, { header: "Second major", key: "major2", width: 22 }, { header: "Graduation year", key: "grad" },
      { header: "Member teams", key: "member", width: 40 }, { header: "Lead teams", key: "lead", width: 40 },
      { header: "Status", key: "status" }, { header: "Review decisions", key: "rdec", width: 40 }, { header: "Final decisions", key: "fdec", width: 40 },
      { header: "Why join", key: "whyJoin", width: 60 }, { header: "Project", key: "project", width: 60 },
      { header: "Other commitments", key: "commitments", width: 50 }, { header: "Questions for us", key: "questions", width: 40 },
      { header: "Lead experience", key: "leadExp", width: 60 }, { header: "Lead skills", key: "leadSkills", width: 60 }, { header: "Work sample", key: "workSample", width: 30 },
      { header: "Resume URL", key: "resume", width: 30 }, { header: "Image URL", key: "image", width: 30 },
      { header: "Events attended", key: "events", width: 40 },
      { header: "Created", key: "created", width: 22 }, { header: "Updated", key: "updated", width: 22 }, { header: "Submitted", key: "submitted", width: 22 },
    ], sorted.map((a) => {
      const fd = a.formData ?? {};
      return {
        id: a.id, first: fd.firstName ?? "", last: fd.lastName ?? "", name: a.userName ?? "", email: a.userEmail ?? "",
        phone: fd.phone ?? "", major: fd.major ?? "", major2: fd.major2 ?? "", grad: fd.graduationYear ?? "",
        member: a.memberTeams.join("; "), lead: a.leadTeams.join("; "),
        status: a.status === ApplicationStatus.IN_PROGRESS ? "Draft" : ADMIN_STATUS_LABEL[adminStatus(a)],
        rdec: decisions(a.reviewDecisions, "review"), fdec: decisions(a.finalDecisions, "final"),
        whyJoin: fd.whyJoin ?? "", project: fd.project ?? "", commitments: fd.otherCommitments ?? "", questions: fd.questionsForUs ?? "",
        leadExp: fd.leadAnswers?.leadExperience ?? "",
        leadSkills: fd.leadAnswers?.leadSkills ? Object.entries(fd.leadAnswers.leadSkills).map(([t, v]) => `${t}: ${v}`).join(" | ") : "",
        workSample: fd.leadAnswers?.workSample ?? "", resume: fd.resumeUrl ?? "", image: fd.imageUrl ?? "",
        events: (attendance.get(a.userId) ?? []).map((id) => EVENT_TITLE.get(id) ?? id).join("; "),
        created: iso(a.createdAt), updated: iso(a.updatedAt), submitted: iso(a.submittedAt),
      };
    }), 4);

    // ── Sheets 2 & 3: one row per applicant per track, reviewers spread across
    // columns (Reviewer N / Score N / Comment N). Rows grow to fit the longest comment.
    const reviewerCols = (label: string, n: number) =>
      Array.from({ length: n }, (_, i) => [
        { header: `${label} ${i + 1}`, key: `r${i}`, width: 20 },
        { header: `Score ${i + 1}`, key: `s${i}`, width: 8 },
        { header: `Comment ${i + 1}`, key: `c${i}`, width: 60 },
      ]).flat();
    const spread = (list: Score[]) => {
      const sorted = [...list].sort((x, y) => (x.reviewerName ?? "").localeCompare(y.reviewerName ?? ""));
      const cells: Record<string, unknown> = {};
      sorted.forEach((sc, i) => { cells[`r${i}`] = sc.reviewerName ?? sc.reviewerUid; cells[`s${i}`] = sc.score; cells[`c${i}`] = sc.comment ?? ""; });
      return cells;
    };
    const reviewMax = Math.max(1, ...sorted.flatMap((a) => tracksOf(a).map((t) => (rv.get(`${a.id}::${t}`) ?? []).length)));
    const reviewRows: Record<string, unknown>[] = [];
    for (const a of sorted) for (const track of tracksOf(a)) {
      const list = rv.get(`${a.id}::${track}`) ?? [];
      reviewRows.push({
        name: a.userName ?? "", email: a.userEmail ?? "", track: trackLabel(track),
        decision: decisionLabel(a.reviewDecisions?.[track], "review"), avg: round1(avg(list)), count: list.length,
        ...spread(list),
      });
    }
    addSheet(wb, "Application review", [
      { header: "Name", key: "name", width: 22 }, { header: "Email", key: "email", width: 24 }, { header: "Track", key: "track", width: 26 },
      { header: "Review decision", key: "decision", width: 14 }, { header: "Avg app score", key: "avg", width: 12 }, { header: "# scores", key: "count", width: 9 },
      ...reviewerCols("Reviewer", reviewMax),
    ], reviewRows, 5);

    const interviewTracks = sorted.flatMap((a) => tracksOf(a).filter((t) => a.reviewDecisions?.[t] === "advanced").map((t) => [a, t] as const));
    const interviewMax = Math.max(1, ...interviewTracks.map(([a, t]) => (iv.get(`${a.id}::${t}`) ?? []).length));
    const interviewRows: Record<string, unknown>[] = [];
    for (const [a, track] of interviewTracks) {
      const list = iv.get(`${a.id}::${track}`) ?? [];
      const appAvg = avg(rv.get(`${a.id}::${track}`));
      const ivAvg = avg(list);
      interviewRows.push({
        name: a.userName ?? "", email: a.userEmail ?? "", track: trackLabel(track),
        decision: decisionLabel(a.finalDecisions?.[track], "final"),
        appAvg: round1(appAvg), ivAvg: round1(ivAvg), overall: round1(overall(appAvg, ivAvg)), count: list.length,
        ...spread(list),
      });
    }
    addSheet(wb, "Interview review", [
      { header: "Name", key: "name", width: 22 }, { header: "Email", key: "email", width: 24 }, { header: "Track", key: "track", width: 26 },
      { header: "Final decision", key: "decision", width: 14 }, { header: "App review avg", key: "appAvg", width: 12 },
      { header: "Interview avg", key: "ivAvg", width: 12 }, { header: "Overall avg", key: "overall", width: 11 }, { header: "# interview scores", key: "count", width: 10 },
      ...reviewerCols("Interviewer", interviewMax),
    ], interviewRows, 7);

    // ── Sheet 4: accepted, one row per accepted track ──────────────────────
    const acceptedRows: Record<string, unknown>[] = [];
    for (const a of sorted) for (const track of tracksOf(a)) {
      if (a.finalDecisions?.[track] !== "advanced") continue;
      const appAvg = avg(rv.get(`${a.id}::${track}`));
      const ivAvg = avg(iv.get(`${a.id}::${track}`));
      acceptedRows.push({
        name: a.userName ?? "", email: a.userEmail ?? "", phone: a.formData?.phone ?? "",
        role: track === "member" ? "Member" : "Lead", team: track === "member" ? a.memberTeams.join("; ") : track.slice("lead:".length),
        major: a.formData?.major ?? "", grad: a.formData?.graduationYear ?? "",
        appAvg: round1(appAvg), ivAvg: round1(ivAvg), overall: round1(overall(appAvg, ivAvg)),
      });
    }
    addSheet(wb, "Accepted", [
      { header: "Name", key: "name", width: 24 }, { header: "Email", key: "email", width: 28 }, { header: "Phone", key: "phone", width: 16 },
      { header: "Role", key: "role", width: 10 }, { header: "Team(s)", key: "team", width: 44 },
      { header: "Major", key: "major", width: 22 }, { header: "Graduation year", key: "grad", width: 14 },
      { header: "App review avg", key: "appAvg", width: 14 }, { header: "Interview avg", key: "ivAvg", width: 14 }, { header: "Overall avg", key: "overall", width: 12 },
    ], acceptedRows, 1);

    const buffer = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="txa-recruiting-records-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to export records." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
