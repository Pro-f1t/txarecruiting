import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getUser, createUser } from "@/lib/firebase/users";
import { User, UserRole } from "@/lib/models/User";

// Any Google account may sign in.

export async function POST(request: Request) {
  let idToken: string | undefined;
  try {
    ({ idToken } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: "ID token is required." }, { status: 400 });
  }

  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const record = await adminAuth.getUser(decoded.uid);
    const existing = await getUser(decoded.uid);

    let role = UserRole.APPLICANT;
    if (existing) {
      role = existing.role;
    } else {
      const newUser: User = {
        uid: record.uid,
        email: record.email || "NA",
        name: record.displayName || "NA",
        role: UserRole.APPLICANT,
        blacklisted: false,
        attendedEventIds: [],
        applications: [],
        createdAt: new Date(),
      };
      await createUser(newUser);
    }

    const response = NextResponse.json({ status: "success", role }, { status: 200 });
    response.cookies.set({
      name: "session",
      value: sessionCookie,
      maxAge: Math.floor(expiresIn / 1000),
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    response.cookies.set({
      name: "user_role",
      value: role.toLowerCase(),
      maxAge: Math.floor(expiresIn / 1000),
      sameSite: "lax",
      httpOnly: false, // read by middleware
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
  }
}
