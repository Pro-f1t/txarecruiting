import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { getUser } from "@/lib/firebase/users";
import { STAFF_ROLES, UserRole } from "@/lib/models/User";

/**
 * Verify the Firebase session cookie server-side and return the user.
 * Throws "Unauthorized" (→401) when there is no/expired/invalid session, and
 * "Forbidden: …" (→403) on a role mismatch.
 */
async function requireSessionUser() {
  const store = await cookies();
  const sessionCookie = store.get("session")?.value;
  if (!sessionCookie) throw new Error("Unauthorized");

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    throw new Error("Unauthorized");
  }

  const user = await getUser(uid);
  if (!user) throw new Error("Unauthorized");
  return { uid, user };
}

export async function requireUser() {
  return requireSessionUser();
}

export async function requireStaff() {
  const result = await requireSessionUser();
  if (!STAFF_ROLES.includes(result.user.role)) {
    throw new Error("Forbidden: Staff access required");
  }
  return result;
}

export async function requireAdmin() {
  const result = await requireSessionUser();
  if (result.user.role !== UserRole.ADMIN) {
    throw new Error("Forbidden: Admin access required");
  }
  return result;
}

export async function requireRoles(roles: UserRole[]) {
  const result = await requireStaff();
  if (!roles.includes(result.user.role)) {
    throw new Error("Forbidden: Insufficient role");
  }
  return result;
}

/** Map a guard error to an HTTP status; null when it's some other error. */
export function guardErrorStatus(error: unknown): 401 | 403 | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "Unauthorized") return 401;
  if (error.message.startsWith("Forbidden")) return 403;
  return null;
}
