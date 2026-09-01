// Backfill formData.firstName / formData.lastName on existing applications from
// the application's stored userName. Only fills where BOTH are missing — never
// overwrites a name the applicant already typed. Idempotent.
//
// Emulator:   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/backfill-names.mjs
// Production: GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json node scripts/backfill-names.mjs
// Add DRY_RUN=1 to preview without writing.
import "dotenv/config";
import admin from "firebase-admin";

const DRY = process.env.DRY_RUN === "1";
const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

if (!admin.apps.length) {
  if (usingEmulator) {
    admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "demo-txa-recruiting" });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } else {
    console.error("Set FIRESTORE_EMULATOR_HOST (emulator) or GOOGLE_APPLICATION_CREDENTIALS (production).");
    process.exit(1);
  }
}
const db = admin.firestore();

function splitName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const snap = await db.collection("applications").get();
console.log(`${usingEmulator ? "EMULATOR" : "PRODUCTION"}${DRY ? " (dry run)" : ""} — ${snap.size} applications\n`);

let filled = 0, skipped = 0, noName = 0;
for (const doc of snap.docs) {
  const a = doc.data();
  const fd = a.formData || {};
  if (fd.firstName || fd.lastName) { skipped++; continue; } // already has a typed name
  const split = splitName(a.userName);
  if (!split) { noName++; console.log(`- ${doc.id}: no userName to split, skipped`); continue; }
  console.log(`✓ ${doc.id}  "${a.userName}"  ->  first="${split.firstName}" last="${split.lastName}"`);
  if (!DRY) {
    await db.doc(`applications/${doc.id}`).set(
      { formData: { firstName: split.firstName, lastName: split.lastName }, updatedAt: new Date() },
      { merge: true }
    );
  }
  filled++;
}

console.log(`\nDone. ${DRY ? "Would fill" : "Filled"} ${filled}, skipped ${skipped} (already named), ${noName} without a name.`);
process.exit(0);
