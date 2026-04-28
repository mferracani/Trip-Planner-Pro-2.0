/**
 * Creates (or upserts) the households/main document with Mati's UID as owner.
 * Run once before anyone else logs in.
 *
 * Usage (from firebase/functions/ dir):
 *   GOOGLE_APPLICATION_CREDENTIALS=/tmp/firebase-adc.json \
 *   GCLOUD_PROJECT=trip-planner-pro-2 \
 *   NODE_PATH=./node_modules \
 *   npx ts-node --transpile-only --skip-project \
 *     ../../firebase/seed/setup-household.ts
 */

import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

async function main() {
  const email = "matiasferracani@gmail.com";
  const userRecord = await admin.auth().getUserByEmail(email);
  const uid = userRecord.uid;

  console.log(`Mati UID: ${uid}`);

  const ref = db.doc("households/main");
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data()!;
    console.log("households/main already exists:", data);
    if (!(data.memberUids as string[]).includes(uid)) {
      await ref.update({ memberUids: admin.firestore.FieldValue.arrayUnion(uid) });
      console.log("→ Added Mati UID to existing doc");
    } else {
      console.log("→ Mati UID already present, nothing to do");
    }
  } else {
    await ref.set({ memberUids: [uid] });
    console.log("→ Created households/main with Mati as owner");
  }

  const final = (await ref.get()).data();
  console.log("\nFinal households/main:", JSON.stringify(final, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
