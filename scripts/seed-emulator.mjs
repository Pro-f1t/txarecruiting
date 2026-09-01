/**
 * Seed the local emulator with enough to click through the app: one admin, one
 * reviewer (staff), one applicant. Emulator only.
 */
import * as dotenv from "dotenv";
import admin from "firebase-admin";
dotenv.config();

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error("Refusing to run: emulator env vars must be set.");
  process.exit(1);
}

admin.initializeApp({ projectId: "demo-txa-recruiting" });
const db = admin.firestore();
const auth = admin.auth();

const USERS = [
  { uid: "seed-admin", email: "admin@utexas.edu", name: "Seed Admin", role: "admin" },
  { uid: "seed-applicant", email: "applicant@utexas.edu", name: "Seed Applicant", role: "applicant" },
];

for (const u of USERS) {
  await auth.importUsers([{
    uid: u.uid, email: u.email, emailVerified: true, displayName: u.name,
    providerData: [{ uid: u.email, email: u.email, displayName: u.name, providerId: "google.com" }],
  }]).catch(() => {});
  await db.doc(`users/${u.uid}`).set({
    uid: u.uid, email: u.email, name: u.name, role: u.role,
    team: u.team ?? null, blacklisted: false, attendedEventIds: [], applications: [],
    createdAt: new Date(),
  }, { merge: true });
  console.log(`user  ${u.email.padEnd(24)} ${u.role}`);
}

await db.doc("config/recruiting").set({ currentStep: "open", updatedAt: new Date(), updatedBy: "seed" }, { merge: true });
console.log("config/recruiting -> open");
console.log("\nDone. Sign in at /auth/login and pick a seeded @utexas.edu email in the emulator popup.");
process.exit(0);
