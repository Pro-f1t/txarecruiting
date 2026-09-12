import { adminDb } from "./admin";
import { User, UserRole } from "@/lib/models/User";

const USERS = "users";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toUser(data: any): User {
  return {
    uid: data.uid,
    email: data.email,
    name: data.name ?? "NA",
    role: (data.role as UserRole) ?? UserRole.APPLICANT,
    team: data.team,
    blacklisted: !!data.blacklisted,
    canReviewApplications: data.canReviewApplications === true,
    attendedEventIds: data.attendedEventIds ?? [],
    applications: data.applications ?? [],
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
  };
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await adminDb.collection(USERS).doc(uid).update({ role });
}

export async function setCanReviewApplications(uid: string, allowed: boolean): Promise<void> {
  await adminDb.collection(USERS).doc(uid).update({ canReviewApplications: allowed });
}

export async function getUser(uid: string): Promise<User | null> {
  const doc = await adminDb.collection(USERS).doc(uid).get();
  if (!doc.exists) return null;
  return toUser(doc.data());
}

/** All users, name-sorted (admin roster). */
export async function getAllUsers(): Promise<User[]> {
  const snap = await adminDb.collection(USERS).get();
  return snap.docs.map((d) => toUser(d.data())).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createUser(user: User): Promise<void> {
  await adminDb.collection(USERS).doc(user.uid).set(
    {
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      blacklisted: user.blacklisted,
      attendedEventIds: user.attendedEventIds ?? [],
      applications: user.applications ?? [],
      createdAt: user.createdAt ?? new Date(),
    },
    { merge: true }
  );
}
