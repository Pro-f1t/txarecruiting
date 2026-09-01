import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, guardErrorStatus } from "@/lib/auth/guard";
import { getUser, setUserRole } from "@/lib/firebase/users";
import { recordAudit } from "@/lib/firebase/audit";
import { UserRole } from "@/lib/models/User";

const ROLES: UserRole[] = [UserRole.ADMIN, UserRole.EXEC, UserRole.APPLICANT];

// Only admins can change roles.
export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid: targetUid } = await params;
  try {
    const { uid: actorUid, user: actor } = await requireAdmin();

    let body: { role?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }

    const role = body.role as UserRole;
    if (!ROLES.includes(role)) return NextResponse.json({ error: "Unknown role." }, { status: 400 });

    // Guard against locking yourself out of admin.
    if (targetUid === actorUid && role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "You can't remove your own admin access." }, { status: 400 });
    }

    const target = await getUser(targetUid);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

    await setUserRole(targetUid, role);
    await recordAudit({ actorUid, actorName: actor.name, action: `role.set.${role}`, target: targetUid, detail: target.email });

    return NextResponse.json({ ok: true, role });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update role." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
