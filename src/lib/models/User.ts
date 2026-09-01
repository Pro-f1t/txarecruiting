// User roles. ADMIN runs the whole console. EXEC is a reduced-access reviewer:
// can grade interviews, but cannot touch the recruiting step, grade
// applications, or manage roles. APPLICANT applies. (The member/lead
// distinction lives on the APPLICATION, not here — see ApplicantRole.)
export enum UserRole {
  ADMIN = "admin",
  EXEC = "exec",
  APPLICANT = "applicant",
}

// The 6 field teams, FLAT (no sub-systems). Names copied from the marketing
// site's "Our Employer Network" cards. Card display copy lives in
// src/data/fieldTeams.ts; these enum values are what an application is keyed to.
export enum Team {
  BUSINESS = "Business, Finance & Consulting",
  GOVERNMENT = "Government, Law & Public Affairs",
  MARKETING = "Marketing & Communications",
  SOFTWARE = "Software, AI & Technology",
  ENGINEERING = "Engineering & Manufacturing",
  HEALTHCARE = "Healthcare & Life Sciences",
}

export const TEAMS: Team[] = Object.values(Team);

// "Staff" = everyone who can see the admin console: admins and execs.
export const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.EXEC];

// Display order (roster sorting) and labels.
export const ROLE_ORDER: UserRole[] = [UserRole.ADMIN, UserRole.EXEC, UserRole.APPLICANT];
export const ROLE_RANK: Record<UserRole, number> = { [UserRole.ADMIN]: 0, [UserRole.EXEC]: 1, [UserRole.APPLICANT]: 2 };
export const ROLE_LABEL: Record<UserRole, string> = { [UserRole.ADMIN]: "Admin", [UserRole.EXEC]: "Exec", [UserRole.APPLICANT]: "Applicant" };

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  // For staff scoped to a team (captain/lead/reviewer): which team.
  team?: Team;
  blacklisted: boolean;
  // Event attendance gate: check-ins that satisfy the apply requirement.
  // A user may apply once they have >=1 info_session AND >=1 coffee_chat this season.
  attendedEventIds?: string[];
  applications: string[];
  createdAt?: Date;
}
