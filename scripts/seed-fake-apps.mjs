// Seed a spread of fake applicants + applications across the pipeline, with
// varied attendance, for exercising the admin console locally. Idempotent:
// re-running overwrites the same fake-N docs. Emulator only.
import "dotenv/config";
import admin from "firebase-admin";

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
if (!admin.apps.length) admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-txa-recruiting" });
const db = admin.firestore();

const T = {
  BUSINESS: "Business, Finance & Consulting",
  GOVERNMENT: "Government, Law & Public Affairs",
  MARKETING: "Marketing & Communications",
  SOFTWARE: "Software, AI & Technology",
  ENGINEERING: "Engineering & Manufacturing",
  HEALTHCARE: "Healthcare & Life Sciences",
};

const fd = (over = {}) => ({
  phone: "512-555-0000",
  major: over.major ?? "Business",
  graduationYear: over.grad ?? "2028",
  whyJoin: "I want to build real consulting experience with a driven team and grow alongside people who care about the work.",
  project: "Led a semester-long case competition team to a regional finals, owning the financial model and the final pitch.",
  otherCommitments: over.commit ?? "Part-time research assistant, ~8 hrs/week.",
  questionsForUs: over.q ?? "",
  resumeUrl: "https://example.com/resume.pdf",
  ...(over.lead ? { leadAnswers: over.lead } : {}),
  ...(over.extra ?? {}),
});

// name, member teams, lead teams, review decisions, final decisions, attendance
const PEOPLE = [
  ["Liam Torres",   [T.ENGINEERING], [T.ENGINEERING], {}, {}, ["info-1"]],
  ["Grace Ali",     [T.HEALTHCARE, T.MARKETING], [T.MARKETING], {}, {}, ["info-2","coffee-1"]],
  ["Maya Kim",      [T.HEALTHCARE, T.MARKETING], [T.MARKETING], { member: "advanced", "lead:Marketing & Communications": "advanced" }, { member: "advanced" }, ["info-1","coffee-1"]],
  ["Omar Lee",      [T.BUSINESS, T.HEALTHCARE, T.GOVERNMENT], [T.BUSINESS], { member: "advanced", "lead:Business, Finance & Consulting": "advanced" }, { member: "advanced", "lead:Business, Finance & Consulting": "advanced" }, ["info-1","info-3","coffee-2"]],
  ["Ava Rodriguez", [T.SOFTWARE], [], { member: "advanced" }, { member: "advanced" }, ["info-2","coffee-2"]],
  ["Liam Brown",    [T.BUSINESS], [], { member: "advanced" }, {}, ["info-1"]],
  ["Grace Garcia",  [T.MARKETING], [], {}, {}, ["info-3"]],
  ["Noah Patel",    [T.SOFTWARE, T.ENGINEERING], [T.SOFTWARE], { member: "advanced", "lead:Software, AI & Technology": "rejected" }, {}, ["info-1","coffee-1"]],
  ["Sofia Nguyen",  [T.HEALTHCARE], [], { member: "rejected" }, {}, []],
  ["Ethan Davis",   [T.GOVERNMENT], [T.GOVERNMENT], {}, {}, ["info-2"]],
  ["Isabella Cruz", [T.BUSINESS, T.MARKETING], [], { member: "advanced" }, { member: "rejected" }, ["info-1","coffee-2"]],
  ["Mason Wright",  [T.ENGINEERING], [], {}, {}, ["info-3","coffee-1"]],
  ["Olivia Chen",   [T.SOFTWARE], [T.SOFTWARE], { member: "advanced", "lead:Software, AI & Technology": "advanced" }, { member: "advanced", "lead:Software, AI & Technology": "rejected" }, ["info-1","coffee-1"]],
  ["Lucas Moore",   [T.GOVERNMENT, T.BUSINESS], [], {}, {}, []],
  ["Emma Wilson",   [T.HEALTHCARE], [T.HEALTHCARE], { member: "advanced", "lead:Healthcare & Life Sciences": "advanced" }, {}, ["info-2","coffee-2"]],
];

const MAJORS = ["Finance", "Computer Science", "Biology", "Government", "Electrical & Computer Engineering", "Marketing", "Economics", "Public Health"];
const leadAnswers = (teams) => ({
  leadExperience: "Managed a 6-person project team end-to-end, setting milestones and running weekly syncs.",
  leadSkills: Object.fromEntries(teams.map((t) => [t, `Directly relevant experience leading work in ${t.split(",")[0]}.`])),
  workSample: "https://example.com/portfolio",
});

const now = new Date();
let i = 0;
for (const [name, member, lead, review, final, attended] of PEOPLE) {
  const id = `fake-${i}`;
  const email = `${id}@utexas.edu`;
  await db.doc(`users/${id}`).set({
    uid: id, email, name, role: "applicant", team: null, blacklisted: false,
    attendedEventIds: attended, applications: [id], createdAt: now,
  }, { merge: true });

  await db.doc(`applications/${id}`).set({
    userId: id, userName: name, userEmail: email,
    memberTeams: member, leadTeams: lead,
    status: "submitted",
    reviewDecisions: review, finalDecisions: final,
    formData: fd({ major: MAJORS[i % MAJORS.length], grad: 2027 + (i % 3), ...(lead.length ? { lead: leadAnswers(lead) } : {}) }),
    createdAt: now, updatedAt: new Date(now.getTime() - i * 60000), submittedAt: now,
  }, { merge: true });
  console.log("app", id, "-", name);
  i++;
}
console.log(`Done — ${PEOPLE.length} fake applications.`);
process.exit(0);
