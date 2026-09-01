export type EventType = "info_session" | "coffee_chat" | "deadline";

export interface RecruitingEvent {
  id: string;
  type: EventType;
  title: string;
  date: string;     // short, e.g. "Sep 1"
  day: string;      // "Tue"
  time: string;     // display time
  location: string;
  startsAt: string; // ISO, Central time — used to derive upcoming/past
}

export const SEASON = "Fall 2026";

// September 2026 — from the recruitment graphic.
export const EVENTS: RecruitingEvent[] = [
  { id: "info-1", type: "info_session", title: "Info Session #1", date: "Sep 1", day: "Tue", time: "7:00 – 8:00 PM", location: "PAI 2.48", startsAt: "2026-09-01T19:00:00-05:00" },
  { id: "coffee-1", type: "coffee_chat", title: "Coffee Chat #1", date: "Sep 2", day: "Wed", time: "5:00 – 6:30 PM", location: "Gong Cha", startsAt: "2026-09-02T17:00:00-05:00" },
  { id: "info-2", type: "info_session", title: "Info Session #2", date: "Sep 7", day: "Mon", time: "6:00 – 7:00 PM", location: "CAL 100", startsAt: "2026-09-07T18:00:00-05:00" },
  { id: "coffee-2", type: "coffee_chat", title: "Coffee Chat #2", date: "Sep 8", day: "Tue", time: "5:00 – 6:30 PM", location: "Lucky Lab", startsAt: "2026-09-08T17:00:00-05:00" },
  { id: "info-3", type: "info_session", title: "Info Session #3", date: "Sep 10", day: "Thu", time: "7:00 – 8:00 PM", location: "Virtual", startsAt: "2026-09-10T19:00:00-05:00" },
  { id: "close", type: "deadline", title: "Application Closes", date: "Sep 12", day: "Sat", time: "11:59 PM", location: "Online", startsAt: "2026-09-12T23:59:00-05:00" },
];

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  info_session: "Info Session",
  coffee_chat: "Coffee Chat",
  deadline: "Deadline",
};
