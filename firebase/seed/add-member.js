const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

async function main() {
  const email = process.argv[2];
  if (!email) { console.error("Usage: node add-member.js <email>"); process.exit(1); }

  const userRecord = await admin.auth().getUserByEmail(email);
  const uid = userRecord.uid;
  console.log(`UID for ${email}: ${uid}`);

  const ref = db.doc("households/main");
  const snap = await ref.get();
  if (!snap.exists) { console.error("households/main no existe"); process.exit(1); }

  const existing = snap.data().memberUids || [];
  if (existing.includes(uid)) {
    console.log("→ UID ya está en el household");
  } else {
    await ref.update({ memberUids: admin.firestore.FieldValue.arrayUnion(uid) });
    console.log("→ Agregado al household");
  }

  const final = (await ref.get()).data();
  console.log("\nFinal households/main:", JSON.stringify(final, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
