"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { UserIcon, ChevronDown } from "./Icons";
import { signOutClient } from "@/lib/firebase/auth";

const EASE = "700ms cubic-bezier(0.4, 0, 0.2, 1)";
// Keep in sync with STAFF_ROLES in lib/models/User.ts.
const STAFF_ROLES = ["admin", "exec"];

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/timeline", label: "Timeline" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

function readRoleCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)user_role=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

type Me = { name?: string; email?: string; role?: string };

/**
 * The marketing site's morphing nav bar DESIGN (transparent → glassy pill on
 * scroll), with the LHR recruiting site's CONTENT on the right: when signed in,
 * a name button that opens a Dashboard / Console / Sign out menu.
 */
export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const r = readRoleCookie();
    setRole(r);
    if (r) {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => {
          const u = d?.user ?? null;
          setMe(u);
          // The cookie role is stamped at sign-in and can be stale (e.g. promoted
          // to admin mid-session). Trust the live role from the server.
          if (u?.role) setRole(String(u.role).toLowerCase());
        })
        .catch(() => {});
    } else {
      setMe(null);
    }
    // Once per load - role/name are stable within a session (sign-in/out and
    // promotion both cause a full reload), so don't re-fetch on every nav.
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // The live check-in display is a full-screen projected surface - no nav.
  if (pathname.startsWith("/live")) return null;

  const signedIn = !!role;
  const isStaff = STAFF_ROLES.includes(role || "");
  const logoHref = isStaff ? "/admin" : "/";
  const displayName = me?.name && me.name !== "NA" ? me.name : "Account";

  const handleSignOut = async () => {
    try { await signOutClient(); } catch {}
    await fetch("/api/auth/logout", { method: "POST" });
    setMenuOpen(false);
    setRole(null);
    setMe(null);
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center">
      <div
        className={scrolled ? "w-full" : "shell-x w-full"}
        style={{
          maxWidth: scrolled ? 1100 : "100%",
          marginTop: scrolled ? 12 : 0,
          paddingInline: scrolled ? 24 : undefined,
          paddingBlock: scrolled ? 6 : 15,
          transition: `all ${EASE}`,
          ...(scrolled
            ? {
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 999,
                boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.1)",
              }
            : {
                background: "transparent",
                border: "1px solid transparent",
                borderRadius: 999,
                boxShadow: "none",
              }),
        }}
      >
        <div className="flex items-center justify-between gap-6">
          <Link href={logoHref} aria-label="Texas Accelerate home" className="shrink-0">
            <Logo priority height={scrolled ? 28 : 36} style={{ transition: `all ${EASE}` }} />
          </Link>

          <nav className="hidden items-center md:flex" style={{ gap: scrolled ? 4 : 8, transition: `all ${EASE}` }} aria-label="Main">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className="rounded-full px-4 py-2 text-[15px] font-medium text-white transition-colors hover:bg-white/15"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {signedIn ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 whitespace-nowrap text-[15px] font-semibold text-white"
                  style={{ paddingInline: 16, paddingBlock: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", transition: `all ${EASE}` }}
                >
                  <UserIcon className="h-4 w-4 text-accent" />
                  <span className="hidden max-w-[140px] truncate sm:inline">{displayName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted" />
                </button>

                {menuOpen && (
                  <div
                    className="animate-fade-slide-down absolute right-0 z-50 mt-3 w-60 overflow-hidden rounded-2xl py-2"
                    style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
                  >
                    <div className="mb-1 px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <p className="truncate text-[13px] font-semibold text-white">{displayName}</p>
                      {me?.email && <p className="truncate text-[11px] text-muted">{me.email}</p>}
                    </div>
                    <Link href={isStaff ? "/admin" : "/dashboard"} onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-white/5 hover:text-white">
                      {isStaff ? "Console" : "Dashboard"}
                    </Link>
                    {isStaff && (
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-white/5 hover:text-white">
                        Applicant view
                      </Link>
                    )}
                    <button onClick={handleSignOut}
                      className="block w-full px-4 py-2 text-left text-[13px] font-medium text-muted transition-colors hover:bg-white/5 hover:text-white">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="whitespace-nowrap text-[15px] font-semibold text-white"
                style={{ paddingInline: 20, paddingBlock: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", transition: `all ${EASE}` }}
              >
                Sign in
              </Link>
            )}

            <Link
              href="/apply"
              className="hidden whitespace-nowrap text-[15px] font-semibold sm:inline-flex"
              style={{ paddingInline: 20, paddingBlock: 10, borderRadius: 999, background: "#60a5fa", color: "#08050f", transition: `all ${EASE}` }}
            >
              Apply
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
