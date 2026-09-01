import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";

const USERS = "users";

/** Record that a user attended an event (idempotent — arrayUnion). */
export async function addAttendance(uid: string, eventId: string): Promise<void> {
  await adminDb.collection(USERS).doc(uid).set(
    { attendedEventIds: FieldValue.arrayUnion(eventId) },
    { merge: true }
  );
}

/** Remove an attendance record (admin correction). */
export async function removeAttendance(uid: string, eventId: string): Promise<void> {
  await adminDb.collection(USERS).doc(uid).update({
    attendedEventIds: FieldValue.arrayRemove(eventId),
  });
}
