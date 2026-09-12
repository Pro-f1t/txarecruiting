"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/conversations", label: "Conversations" },
  { href: "/admin/review", label: "Application review", reviewerOnly: true },
  { href: "/admin/interviews", label: "Interview review" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/stats", label: "Stats" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/activity", label: "Activity" },
];

// `canReview` = admin, or an exec an admin has granted Application review.
export default function AdminNav({ isAdmin, canReview }: { isAdmin: boolean; canReview: boolean }) {
  const pathname = usePathname();
  const isActive = (l: { href: string; exact?: boolean }) => (l.exact ? pathname === l.href : pathname.startsWith(l.href));
  const links = LINKS.filter((l: { adminOnly?: boolean; reviewerOnly?: boolean }) => (isAdmin || !l.adminOnly) && (canReview || !l.reviewerOnly));
  return (
    <nav className="flex flex-wrap gap-1 border-b border-white/10 pb-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-lg px-4 py-2 text-[14px] font-semibold transition-colors"
          style={isActive(l) ? { color: "#fff", background: "var(--color-surface-2)" } : { color: "var(--color-muted)" }}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
