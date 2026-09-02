import { adminDb } from "./admin";

// A staff member (admin/exec) marking that they talked to an applicant — for
// coffee-chat / info-session networking. One doc per (applicant, staff), so
// several execs can each log a conversation with the same person.
export interface Conversation {
  applicantUid: string;
  staffUid: string;
  staffName?: string;
  comment?: string;
  at?: Date;
}

const COL = "conversations";
const docId = (applicantUid: string, staffUid: string) => `${applicantUid}__${staffUid}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toConv(d: any): Conversation {
  return {
    applicantUid: d.applicantUid,
    staffUid: d.staffUid,
    staffName: d.staffName ?? undefined,
    comment: d.comment ?? undefined,
    at: d.at?.toDate ? d.at.toDate() : d.at,
  };
}

/** Create/replace a staff member's "talked to" record (set replaces, so an
 *  empty comment clears a previous note). */
export async function setConversation(applicantUid: string, staff: { uid: string; name?: string }, comment?: string): Promise<void> {
  const payload: Record<string, unknown> = { applicantUid, staffUid: staff.uid, staffName: staff.name ?? null, at: new Date() };
  if (comment && comment.trim()) payload.comment = comment.trim().slice(0, 1000);
  await adminDb.collection(COL).doc(docId(applicantUid, staff.uid)).set(payload);
}

export async function removeConversation(applicantUid: string, staffUid: string): Promise<void> {
  await adminDb.collection(COL).doc(docId(applicantUid, staffUid)).delete();
}

/** Everyone who has logged a conversation with one applicant. */
export async function getConversationsForApplicant(applicantUid: string): Promise<Conversation[]> {
  const snap = await adminDb.collection(COL).where("applicantUid", "==", applicantUid).get();
  return snap.docs.map((d) => toConv(d.data())).sort((a, b) => (a.staffName || "").localeCompare(b.staffName || ""));
}

/** All conversations (for the admin tab). */
export async function getAllConversations(): Promise<Conversation[]> {
  const snap = await adminDb.collection(COL).get();
  return snap.docs.map((d) => toConv(d.data()));
}
