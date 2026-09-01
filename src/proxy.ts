import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// UX-only redirects. The real security is the server-side guards in
// lib/auth/guard.ts — the user_role cookie is client-visible and not trusted.
const STAFF_ROLES = ["admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("session");
  const role = request.cookies.get("user_role")?.value;

  const isLogin = pathname === "/auth/login";
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/apply") ||
    pathname.startsWith("/admin");

  // Not signed in → send to login, preserving where they were headed (used by
  // the QR attendance flow so a scan lands on /attend/... after login).
  if (!session && isProtected) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Signed in and hitting login → go to the right dashboard.
  if (session && isLogin) {
    const target = STAFF_ROLES.includes(role || "") ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Admin area is staff-only at the UX layer (guards enforce it for real).
  if (pathname.startsWith("/admin") && (!role || !STAFF_ROLES.includes(role))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/apply/:path*", "/admin/:path*", "/auth/login"],
};
