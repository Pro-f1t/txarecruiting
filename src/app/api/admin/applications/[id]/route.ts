import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, guardErrorStatus } from "@/lib/auth/guard";
import { getApplication, deleteApplication } from "@/lib/firebase/applications";
import { recordAudit } from "@/lib/firebase/audit";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { uid, user } = await requireAdmin();
    const app = await getApplication(id);
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    await deleteApplication(id);
    await recordAudit({ actorUid: uid, actorName: user.name, action: "application.delete", target: id, detail: app.userEmail });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete." }, { status: guardErrorStatus(error) ?? 500 });
  }
}
