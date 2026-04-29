/**
 * Adds a second user to households/main by email.
 * Run after the new member has logged in at least once (so their Firebase Auth account exists).
 *
 * Usage (desde firebase/functions/):
 *   GOOGLE_APPLICATION_CREDENTIALS=/tmp/firebase-adc.json \
 *   GCLOUD_PROJECT=trip-planner-pro-2 \
 *   npm run add-household-member -- agustina@email.com
 */

import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: add-household-member.ts <email>");
    process.exit(1);
  }

  const userRecord = await admin.auth().getUserByEmail(email);
  const uid = userRecord.uid;
  console.log(`Member UID for ${email}: ${uid}`);

  const ref = db.doc("households/main");
  const snap = await ref.get();

  if (!snap.exists) {
    console.error("households/main does not exist. Run setup-household.ts first.");
    process.exit(1);
  }

  const existing = snap.data()!.memberUids as string[];
  if (existing.includes(uid)) {
    console.log("→ UID already in household, nothing to do");
  } else {
    await ref.update({ memberUids: admin.firestore.FieldValue.arrayUnion(uid) });
    console.log("→ Added to household");
  }

  const final = (await ref.get()).data();
  console.log("\nFinal households/main:", JSON.stringify(final, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
