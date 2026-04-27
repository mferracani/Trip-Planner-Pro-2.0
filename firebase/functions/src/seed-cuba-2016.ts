/**
 * Seed: Cuba 2016 trip data
 *
 * Finds the Cuba 2016 trip under matiasferracani@gmail.com and adds:
 *  - 3 flight bookings (BUE↔HAV round-trip, HAV→CCC internal, CCC→HAV internal)
 *  - 4 hotels (Casa Melvis, Iberostar Daiquiri, Memories Flamenco, Casa Sergio/Támara)
 *  - 4 expenses (CORIS seguro, VISA cubana, Buena Vista, Taxi)
 *
 * Usage: npx ts-node seed-cuba-2016.ts
 * Prerequisites: gcloud auth application-default login
 */

import * as admin from "firebase-admin";

admin.initializeApp({ projectId: "trip-planner-pro-2" });
const db = admin.firestore();

const USER_EMAIL = "matiasferracani@gmail.com";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDatetime(date: string, time: string): string {
  return `${date}T${time}`;
}

function approxUTC(localISO: string, tzOffsetHours: number): admin.firestore.Timestamp {
  const localMs = new Date(localISO + ":00").getTime();
  const utcMs = localMs - tzOffsetHours * 60 * 60 * 1000;
  return admin.firestore.Timestamp.fromMillis(utcMs);
}

function minutesBetween(depISO: string, depTZ: number, arrISO: string, arrTZ: number): number {
  const dep = approxUTC(depISO, depTZ).toMillis();
  const arr = approxUTC(arrISO, arrTZ).toMillis();
  return Math.max(0, Math.round((arr - dep) / 60000));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Resolve uid from email
  const userRecord = await admin.auth().getUserByEmail(USER_EMAIL);
  const uid = userRecord.uid;
  console.log(`uid: ${uid}`);

  // 2. Find Cuba 2016 trip
  const tripsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("trips")
    .where("start_date", ">=", "2016-05-01")
    .where("start_date", "<=", "2016-06-30")
    .get();

  if (tripsSnap.empty) {
    throw new Error("No trip found for Cuba 2016 range. Create the trip first.");
  }

  const tripDoc = tripsSnap.docs[0];
  const tripId = tripDoc.id;
  console.log(`Trip: "${tripDoc.data().name}" — id: ${tripId}`);

  const baseRef = db.collection("users").doc(uid).collection("trips").doc(tripId);

  // ─── FLIGHTS ───────────────────────────────────────────────────────────────
  // Buenos Aires (ART-3) = UTC-3; Cuba (CDT in May-Jun) = UTC-4 (EDT-1)
  // For approximate UTC: BUE = -3, HAV = -4, CCC = -4

  const BUE_TZ = -3;
  const HAV_TZ = -4;
  const CCC_TZ = -4;

  const flights = [
    // ── 1. BUE ↔ HAV round-trip (AR1326 outbound + AA1327 inbound) ───────────
    {
      trip_id: tripId,
      airline: "Aerolíneas Argentinas",
      flight_number: "AR1326",
      origin_iata: "EZE",
      destination_iata: "HAV",
      departure_local_time: isoDatetime("2016-05-25", "04:40"),
      departure_timezone: "America/Argentina/Buenos_Aires",
      departure_utc: approxUTC(isoDatetime("2016-05-25", "04:40"), BUE_TZ),
      // HAV arrives ~same day afternoon after ~10h flight
      arrival_local_time: isoDatetime("2016-05-25", "14:30"),
      arrival_timezone: "America/Havana",
      arrival_utc: approxUTC(isoDatetime("2016-05-25", "14:30"), HAV_TZ),
      duration_minutes: minutesBetween(
        isoDatetime("2016-05-25", "04:40"), BUE_TZ,
        isoDatetime("2016-05-25", "14:30"), HAV_TZ
      ),
      price_usd: 2015.86,
      currency: "USD",
      price: 2015.86,
      paid_amount: 2015.86,
      legs: [
        {
          direction: "outbound",
          airline: "Aerolíneas Argentinas",
          flight_number: "AR1326",
          origin_iata: "EZE",
          destination_iata: "HAV",
          departure_local_time: isoDatetime("2016-05-25", "04:40"),
          departure_timezone: "America/Argentina/Buenos_Aires",
          departure_utc: approxUTC(isoDatetime("2016-05-25", "04:40"), BUE_TZ),
          arrival_local_time: isoDatetime("2016-05-25", "14:30"),
          arrival_timezone: "America/Havana",
          arrival_utc: approxUTC(isoDatetime("2016-05-25", "14:30"), HAV_TZ),
          duration_minutes: minutesBetween(
            isoDatetime("2016-05-25", "04:40"), BUE_TZ,
            isoDatetime("2016-05-25", "14:30"), HAV_TZ
          ),
        },
        {
          direction: "inbound",
          airline: "American Airlines",
          flight_number: "AA1327",
          origin_iata: "HAV",
          destination_iata: "EZE",
          departure_local_time: isoDatetime("2016-06-05", "15:50"),
          departure_timezone: "America/Havana",
          departure_utc: approxUTC(isoDatetime("2016-06-05", "15:50"), HAV_TZ),
          arrival_local_time: isoDatetime("2016-06-06", "03:00"),
          arrival_timezone: "America/Argentina/Buenos_Aires",
          arrival_utc: approxUTC(isoDatetime("2016-06-06", "03:00"), BUE_TZ),
          duration_minutes: minutesBetween(
            isoDatetime("2016-06-05", "15:50"), HAV_TZ,
            isoDatetime("2016-06-06", "03:00"), BUE_TZ
          ),
        },
      ],
    },
    // ── 2. HAV → CCC (internal, May 27) ─────────────────────────────────────
    {
      trip_id: tripId,
      airline: "Aerogaviota",
      flight_number: "GTV2648",
      origin_iata: "HAV",
      destination_iata: "CCC",
      departure_local_time: isoDatetime("2016-05-27", "07:00"),
      departure_timezone: "America/Havana",
      departure_utc: approxUTC(isoDatetime("2016-05-27", "07:00"), HAV_TZ),
      arrival_local_time: isoDatetime("2016-05-27", "08:30"),
      arrival_timezone: "America/Havana",
      arrival_utc: approxUTC(isoDatetime("2016-05-27", "08:30"), CCC_TZ),
      duration_minutes: 90,
      price_usd: 281.0,
      currency: "USD",
      price: 281.0,
      paid_amount: 281.0,
    },
    // ── 3. CCC → HAV (GTV2647, Jun 4) ────────────────────────────────────────
    {
      trip_id: tripId,
      airline: "Aerogaviota",
      flight_number: "GTV2647",
      origin_iata: "CCC",
      destination_iata: "HAV",
      departure_local_time: isoDatetime("2016-06-04", "15:10"),
      departure_timezone: "America/Havana",
      departure_utc: approxUTC(isoDatetime("2016-06-04", "15:10"), CCC_TZ),
      arrival_local_time: isoDatetime("2016-06-04", "16:40"),
      arrival_timezone: "America/Havana",
      arrival_utc: approxUTC(isoDatetime("2016-06-04", "16:40"), HAV_TZ),
      duration_minutes: 90,
      price_usd: 281.0,
      currency: "USD",
      price: 281.0,
      paid_amount: 281.0,
    },
  ];

  for (const f of flights) {
    const ref = await baseRef.collection("flights").add(f);
    console.log(`  ✈  flight ${f.flight_number} (${f.origin_iata}→${f.destination_iata}) — ${ref.id}`);
  }

  // ─── HOTELS ────────────────────────────────────────────────────────────────

  const hotels = [
    // Casa Melvis — Havana — May 25-27 (2 nights)
    {
      trip_id: tripId,
      name: "Casa Melvis",
      brand: null,
      check_in: "2016-05-25",
      check_out: "2016-05-27",
      room_type: "Apto 801",
      total_price: 40.0,
      currency: "USD",
      total_price_usd: 40.0,
      paid_amount: 40.0,
    },
    // Iberostar Daiquiri — Cayo Guillermo — May 27-31 (4 nights)
    {
      trip_id: tripId,
      name: "Iberostar Daiquiri",
      brand: "Iberostar",
      check_in: "2016-05-27",
      check_out: "2016-05-31",
      room_type: null,
      price_per_night: 189.74,
      total_price: 758.97,
      currency: "USD",
      total_price_usd: 758.97,
      paid_amount: 758.97,
    },
    // Memories Flamenco — Cayo Coco — May 31-Jun 4 (4 nights)
    {
      trip_id: tripId,
      name: "Memories Flamenco",
      brand: "Memories",
      check_in: "2016-05-31",
      check_out: "2016-06-04",
      room_type: null,
      price_per_night: 189.74,
      total_price: 758.97,
      currency: "USD",
      total_price_usd: 758.97,
      paid_amount: 758.97,
    },
    // Casa Sergio / Támara — Havana — Jun 4-5 (1 night)
    {
      trip_id: tripId,
      name: "Casa Sergio / Támara",
      brand: null,
      check_in: "2016-06-04",
      check_out: "2016-06-05",
      room_type: null,
      total_price: 75.0,
      currency: "USD",
      total_price_usd: 75.0,
      paid_amount: 75.0,
    },
  ];

  for (const h of hotels) {
    const ref = await baseRef.collection("hotels").add(h);
    console.log(`  🏨  hotel "${h.name}" (${h.check_in}→${h.check_out}) — ${ref.id}`);
  }

  // ─── EXPENSES ──────────────────────────────────────────────────────────────
  // Expenses without a specific date get the trip's start date as fallback.

  const expenses = [
    {
      trip_id: tripId,
      title: "CORIS Asistencia (seguro de viaje)",
      amount: 106.97,
      currency: "USD",
      amount_usd: 106.97,
      paid_amount: 106.97,
      date: "2016-05-25",
      category: "other",
      notes: "Seguro de viaje y asistencia al viajero",
    },
    {
      trip_id: tripId,
      title: "VISA Cubana",
      amount: 44.69,
      currency: "USD",
      amount_usd: 44.69,
      paid_amount: 44.69,
      date: "2016-05-25",
      category: "other",
      notes: "Tarjeta turística Cuba",
    },
    {
      trip_id: tripId,
      title: "Buena Vista Social Club",
      amount: 60.0,
      currency: "USD",
      amount_usd: 60.0,
      paid_amount: 60.0,
      date: "2016-05-26",
      category: "activity",
      notes: "Show musical en La Habana",
    },
    {
      trip_id: tripId,
      title: "Taxi Aeropuerto",
      amount: 25.0,
      currency: "USD",
      amount_usd: 25.0,
      paid_amount: 25.0,
      date: "2016-05-25",
      category: "taxi",
      notes: "Traslado aeropuerto José Martí — Habana",
    },
  ];

  for (const e of expenses) {
    const ref = await baseRef.collection("expenses").add(e);
    console.log(`  💰  expense "${e.title}" ($${e.amount}) — ${ref.id}`);
  }

  // ─── Recalc aggregates ─────────────────────────────────────────────────────

  const [fSnap, hSnap, tSnap, eSnap, cSnap] = await Promise.all([
    baseRef.collection("flights").get(),
    baseRef.collection("hotels").get(),
    baseRef.collection("transports").get(),
    baseRef.collection("expenses").get(),
    baseRef.collection("cities").get(),
  ]);

  const totalUSD =
    fSnap.docs.reduce((s: number, d) => s + (Number(d.data().price_usd) || 0), 0) +
    hSnap.docs.reduce((s: number, d) => s + (Number(d.data().total_price_usd) || 0), 0) +
    tSnap.docs.reduce((s: number, d) => s + (Number(d.data().price_usd) || 0), 0) +
    eSnap.docs.reduce((s: number, d) => s + (Number(d.data().amount_usd) || 0), 0);

  const paidUSD =
    fSnap.docs.reduce((s: number, d) => s + (Number(d.data().paid_amount) || 0), 0) +
    hSnap.docs.reduce((s: number, d) => s + (Number(d.data().paid_amount) || 0), 0) +
    tSnap.docs.reduce((s: number, d) => s + (Number(d.data().paid_amount) || 0), 0) +
    eSnap.docs.reduce((s: number, d) => s + (Number(d.data().paid_amount) || 0), 0);

  await baseRef.update({
    total_usd: Math.round(totalUSD),
    paid_usd: Math.round(paidUSD),
    cities_count: cSnap.size,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`\n✅  Done!`);
  console.log(`   total_usd  : $${Math.round(totalUSD)}`);
  console.log(`   paid_usd   : $${Math.round(paidUSD)}`);
  console.log(`   cities     : ${cSnap.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
