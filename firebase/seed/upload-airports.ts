/**
 * Seed script: upload airports dataset to Firestore collection `airports/`.
 *
 * Usage (from repo root):
 *   npx ts-node --project firebase/functions/tsconfig.json firebase/seed/upload-airports.ts
 *
 * Or from firebase/seed/:
 *   ts-node -e "require('firebase-admin')" upload-airports.ts   # if ts-node is on PATH
 *
 * Prerequisites:
 *   - Application Default Credentials configured:
 *       gcloud auth application-default login
 *     OR set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   - To target the local emulator instead of production:
 *       export FIRESTORE_EMULATOR_HOST="localhost:8080"
 *
 * Idempotent: uses set() without merge, so re-running overwrites existing docs.
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

interface AirportRecord {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
}

admin.initializeApp();

const db = admin.firestore();

const BATCH_SIZE = 500;

async function uploadAirports(): Promise<void> {
  const filePath = path.resolve(__dirname, "airports.json");

  if (!fs.existsSync(filePath)) {
    console.error(`airports.json not found at: ${filePath}`);
    process.exit(1);
  }

  let airports: AirportRecord[];
  try {
    airports = JSON.parse(fs.readFileSync(filePath, "utf-8")) as AirportRecord[];
  } catch (err) {
    console.error("Failed to parse airports.json:", err);
    process.exit(1);
  }

  if (!Array.isArray(airports)) {
    console.error("airports.json must be a JSON array.");
    process.exit(1);
  }

  const valid = airports.filter(
    (a) => typeof a.iata === "string" && a.iata.length === 3
  );
  const skipped = airports.length - valid.length;

  if (skipped > 0) {
    console.log(`Skipping ${skipped} records with missing or invalid IATA code.`);
  }

  const totalBatches = Math.ceil(valid.length / BATCH_SIZE);
  let uploaded = 0;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`Uploading batch ${batchNum}/${totalBatches}...`);

    const batch = db.batch();
    const chunk = valid.slice(i, i + BATCH_SIZE);

    for (const airport of chunk) {
      const ref = db.collection("airports").doc(airport.iata.toUpperCase());
      const doc: AirportRecord = {
        iata: airport.iata.toUpperCase(),
        name: airport.name,
        city: airport.city,
        country: airport.country,
        lat: airport.lat,
        lng: airport.lng,
        timezone: airport.timezone,
      };
      batch.set(ref, doc);
    }

    await batch.commit();
    uploaded += chunk.length;
  }

  console.log(`Done. ${uploaded} airports uploaded.`);
}

uploadAirports().catch((err) => {
  console.error(err);
  process.exit(1);
});
