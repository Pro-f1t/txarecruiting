import { NextResponse } from "next/server";
import { requireUser, guardErrorStatus } from "@/lib/auth/guard";
import { upsertApplication, getUserApplication } from "@/lib/firebase/applications";
import { ApplicationFormData } from "@/lib/models/Application";
import { Team, TEAMS } from "@/lib/models/User";
import { EVENTS } from "@/data/events";

const clip = (v: unknown, n = 20000) => (typeof v === "string" ? v.slice(0, n) : "");
const NAMED = ["phone", "major", "major2", "graduationYear", "resumeUrl", "whyJoin", "project", "imageUrl", "otherCommitments", "questionsForUs"] as const;

// The application close date — after this the application is read-only.
const DEADLINE = new Date(EVENTS.find((e) => e.type === "deadline")?.startsAt ?? "2026-09-12T23:59:00-05:00");
const pastDeadline = () => Date.now() > DEADLINE.getTime();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeFormData(input: any): ApplicationFormData {
  const fd: ApplicationFormData = {};
  for (const key of NAMED) if (input?.[key] != null) (fd as Record<string, string>)[key] = clip(input[key]);
  if (input?.leadAnswers && typeof input.leadAnswers === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const la: any = {};
    if (input.leadAnswers.leadExperience != null) la.leadExperience = clip(input.leadAnswers.leadExperience);
    if (input.leadAnswers.workSample != null) la.workSample = clip(input.leadAnswers.workSample);
    if (input.leadAnswers.leadSkills && typeof input.leadAnswers.leadSkills === "object") {
      const sk: Record<string, string> = {};
      for (const [team, val] of Object.entries(input.leadAnswers.leadSkills)) {
        if (TEAMS.includes(team as Team) && val != null) sk[team] = clip(val);
      }
      if (Object.keys(sk).length) la.leadSkills = sk;
    }
    if (Object.keys(la).length) fd.leadAnswers = la;
  }
  return fd;
}

function validTeams(v: unknown): Team[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((t): t is Team => typeof t === "string" && TEAMS.includes(t as Team)))];
}

export async function GET() {
  try {
    const { uid } = await requireUser();
    return NextResponse.json({ application: await getUserApplication(uid), editable: !pastDeadline() });
  } catch (error) {
    return NextResponse.json({ error: "Unable to load application." }, { status: guardErrorStatus(error) ?? 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { uid, user } = await requireUser();

    if (pastDeadline()) {
      return NextResponse.json({ error: "Applications are closed — the deadline has passed." }, { status: 403 });
    }

    let body: { memberTeams?: unknown; leadTeams?: unknown; formData?: unknown; draft?: unknown };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

    const draft = body.draft === true;
    const memberTeams = validTeams(body.memberTeams);
    const leadTeams = validTeams(body.leadTeams);
    const formData = sanitizeFormData(body.formData);

    // Save-progress (draft) skips completeness checks; a final submit enforces them.
    if (!draft) {
      if (memberTeams.length === 0 && leadTeams.length === 0) {
        return NextResponse.json({ error: "Choose at least one field team." }, { status: 400 });
      }
      if (!formData.resumeUrl) {
        return NextResponse.json({ error: "Please upload your resume (PDF)." }, { status: 400 });
      }
      if (!formData.whyJoin || !formData.project) {
        return NextResponse.json({ error: "Please answer both required questions." }, { status: 400 });
      }
      if (!formData.imageUrl) {
        return NextResponse.json({ error: "Please upload an image that appeals to you." }, { status: 400 });
      }
      if (!formData.otherCommitments) {
        return NextResponse.json({ error: "Please list your other major commitments for the semester." }, { status: 400 });
      }
      if (leadTeams.length > 0) {
        if (!formData.leadAnswers?.leadExperience) {
          return NextResponse.json({ error: "Please answer the leadership experience question." }, { status: 400 });
        }
        const skills = formData.leadAnswers?.leadSkills ?? {};
        if (leadTeams.some((t) => !skills[t]?.trim())) {
          return NextResponse.json({ error: "Please answer the skills question for each field team you want to lead." }, { status: 400 });
        }
      }
    }

    const app = await upsertApplication(
      { userId: uid, userName: user.name, userEmail: user.email },
      { memberTeams, leadTeams, formData },
      !draft
    );
    return NextResponse.json({ status: "saved", application: app }, { status: 200 });
  } catch (error) {
    const status = guardErrorStatus(error) ?? 500;
    return NextResponse.json({ error: status === 500 ? "Something went wrong saving your application." : "Unauthorized" }, { status });
  }
}
