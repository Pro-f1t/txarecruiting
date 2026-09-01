// Only two user roles. Admins run the whole console and do all reviewing;
// applicants apply. (The member/lead distinction lives on the APPLICATION, not
// here — see ApplicantRole.)
export enum UserRole {
  ADMIN = "admin",
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

// "Staff" = everyone who can see the admin console. Only admins.
export const STAFF_ROLES: UserRole[] = [UserRole.ADMIN];

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
