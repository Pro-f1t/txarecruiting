import { Team } from "./User";

// A person applies per (team, role). Applying as LEAD also spawns a MEMBER
// application for the same team (Option B — parallel, independent review).
export enum ApplicantRole {
  MEMBER = "member",
  LEAD = "lead",
}

export enum ApplicationStatus {
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  INTERVIEW = "interview",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

// Staff stamp these internally the moment they decide; revealed to the
// applicant only at the matching release step. Accept/reject only — no waitlist.
export type StageDecision = "pending" | "advanced" | "rejected";

export interface LeadAnswers {
  leadExperience?: string;                 // prior leadership — single, across all teams
  leadSkills?: Record<string, string>;     // relevant skills, one answer per team they want to lead (keyed by team name)
  workSample?: string;                     // optional link to a work sample
}

export interface ApplicationFormData {
  // Identity
  firstName?: string;
  lastName?: string;
  phone?: string;
  major?: string;
  major2?: string;       // optional second major (double majors)
  graduationYear?: string;
  resumeUrl?: string;   // uploaded resume (Storage URL)
  // Member questions
  whyJoin?: string;         // Why interested in TXA (150 words)
  project?: string;         // Explain a project (150 words)
  imageUrl?: string;        // Uploaded image that appeals to them (Storage URL)
  otherCommitments?: string;// optional
  questionsForUs?: string;  // optional
  // Lead-only answers (present on lead applications)
  leadAnswers?: LeadAnswers;
  // Admin-configured extras, keyed by question id (future config-driven questions)
  customAnswers?: Record<string, string>;
}

// One application per applicant per cycle. The team checkboxes live inside it:
// `memberTeams` = teams they want to join, `leadTeams` = teams they want to lead
// (a lead selection is reviewed independently and never affects the member side).
export interface Application {
  id: string;            // = userId (one per applicant)
  userId: string;
  userName?: string;
  userEmail?: string;

  memberTeams: Team[];
  leadTeams: Team[];

  status: ApplicationStatus;

  // Internal decisions, per (team, role). Set by staff, masked until release.
  // Keyed "member:<Team>" / "lead:<Team>". Added by the admin side.
  reviewDecisions?: Record<string, StageDecision>;
  finalDecisions?: Record<string, StageDecision>;

  formData: ApplicationFormData;

  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
}
