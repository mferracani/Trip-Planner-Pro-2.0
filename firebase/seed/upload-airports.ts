/**
 * Seed script: upload airports dataset to Firestore
 *
 * Usage:
 *   ts-node upload-airports.ts
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_DEFAULT_CREDENTIALS set, or run inside Firebase project
 *   - airports.json present in the same directory
 *
 * Reads airports.json (array of airport objects), writes each to
 * airports/{iataCode} in Firestore using batch writes (500 docs per batch).
 */

import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AirportRecord {
  iata: string;
  name: string;
  city: string;
  country: string;
  timezone: string; // IANA tz string
  lat: number;
  lng: number;
  icao?: string | null;
}

interface FirestoreAirport {
  name: string;
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lng: number;
  icao_code: string | null;
}

// ---------------------------------------------------------------------------
// Firebase initialization
// ---------------------------------------------------------------------------

admin.initializeApp({
  projectId: "trip-planner-pro-2",
  // Uses Application Default Credentials (ADC):
  // Run `gcloud auth application-default login` or set GOOGLE_APPLICATION_CREDENTIALS
});

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Batch write helper
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500; // Firestore batch limit

async function writeBatch(airports: AirportRecord[]): Promise<void> {
  const totalBatches = Math.ceil(airports.length / BATCH_SIZE);

  console.log(`Total airports to seed: ${airports.length}`);
  console.log(`Writing in ${totalBatches} batches of ${BATCH_SIZE}...`);

  let skippedCount = 0;
  let writtenCount = 0;

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, airports.length);
    const chunk = airports.slice(start, end);

    const batch = db.batch();

    for (const airport of chunk) {
      // Skip records without a valid IATA code
      if (!airport.iata || airport.iata.length !== 3) {
        skippedCount++;
        continue;
      }

      const docRef = db.collection("airports").doc(airport.iata.toUpperCase());

      const firestoreDoc: FirestoreAirport = {
        name: airport.name,
        city: airport.city,
        country: airport.country,
        timezone: airport.timezone,
        lat: airport.lat,
        lng: airport.lng,
        icao_code: airport.icao ?? null,
      };

      batch.set(docRef, firestoreDoc, { merge: false });
      writtenCount++;
    }

    await batch.commit();

    const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
    console.log(
      `  Batch ${batchIndex + 1}/${totalBatches} committed (${progress}%) — ` +
      `docs ${start + 1}–${end}`
    );
  }

  console.log(`\nDone. Written: ${writtenCount}, Skipped (no IATA): ${skippedCount}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const airportsJsonPath = path.resolve(__dirname, "airports.json");

  if (!fs.existsSync(airportsJsonPath)) {
    console.error(`airports.json not found at: ${airportsJsonPath}`);
    console.error("Download it from: https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat");
    console.error("Then convert to JSON with the format: [{ iata, name, city, country, timezone, lat, lng, icao? }]");
    process.exit(1);
  }

  const raw = fs.readFileSync(airportsJsonPath, "utf-8");

  let airports: AirportRecord[];
  try {
    airports = JSON.parse(raw) as AirportRecord[];
  } catch (err) {
    console.error("Failed to parse airports.json:", err);
    process.exit(1);
  }

  if (!Array.isArray(airports)) {
    console.error("airports.json must be a JSON array");
    process.exit(1);
  }

  console.log(`Loaded ${airports.length} records from airports.json`);
  console.log(`Target: Firestore project "trip-planner-pro-2", collection "airports"\n`);

  const startTime = Date.now();

  try {
    await writeBatch(airports);
  } catch (err) {
    console.error("Fatal error during batch write:", err);
    process.exit(1);
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nSeed completed in ${elapsedSec}s`);
  process.exit(0);
}

main();
