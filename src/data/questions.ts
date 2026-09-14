export type QuestionType = "short" | "long";
export interface Question { id: string; label: string; type: QuestionType; placeholder?: string }

// Standard questions everyone answers. (Hardcoded for now - becomes admin-
// configurable config later, following the LHR questions CMS pattern.)
export const COMMON_QUESTIONS: Question[] = [
  { id: "major", label: "Major", type: "short", placeholder: "e.g. Finance, Computer Science" },
  { id: "graduationYear", label: "Expected graduation year", type: "short", placeholder: "e.g. 2028" },
  { id: "phone", label: "Phone number", type: "short", placeholder: "(512) 555-0100" },
  { id: "resumeUrl", label: "Resume link", type: "short", placeholder: "Google Drive / Dropbox link" },
  { id: "whyJoin", label: "Why do you want to join Texas Accelerate?", type: "long" },
  { id: "relevantExperience", label: "What relevant experience do you have?", type: "long" },
];

// Additional questions only lead applicants answer (stored in formData.leadAnswers).
export const LEAD_QUESTIONS: Question[] = [
  { id: "leadWhy", label: "Why do you want to lead this team?", type: "long" },
  { id: "leadExperience", label: "Describe your leadership experience.", type: "long" },
];

// The six COMMON ids that map to named Application.formData fields.
export const NAMED_COMMON = ["major", "graduationYear", "phone", "resumeUrl", "whyJoin", "relevantExperience"] as const;
