import { getRecruitingStep } from "@/lib/firebase/config";
import { isAtOrPast, RecruitingStep } from "@/lib/models/Config";
import { EVENTS } from "@/data/events";

// The application close date - after this the application is read-only.
const DEADLINE = new Date(EVENTS.find((e) => e.type === "deadline")?.startsAt ?? "2026-09-13T02:40:00-05:00");

export const pastDeadline = () => Date.now() > DEADLINE.getTime();

/**
 * Applications lock once staff advance the cycle to Reviewing (or beyond), or
 * after the deadline - whichever comes first. Server-only (reads config).
 */
export async function applicationsClosed(): Promise<boolean> {
  if (pastDeadline()) return true;
  return isAtOrPast(await getRecruitingStep(), RecruitingStep.REVIEWING);
}
