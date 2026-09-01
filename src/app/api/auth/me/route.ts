import { NextResponse } from "next/server";
import { requireUser, guardErrorStatus } from "@/lib/auth/guard";

export async function GET() {
  try {
    const { user } = await requireUser();
    return NextResponse.json({ user });
  } catch (error) {
    const status = guardErrorStatus(error) ?? 500;
    return NextResponse.json({ error: "Not signed in" }, { status });
  }
}
