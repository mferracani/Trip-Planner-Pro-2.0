import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import type { Trip, City, Flight, Hotel, Transport, Expense } from "./types";

// Base path helpers
const tripsRef = (uid: string) => collection(getFirebaseDb(), "users", uid, "trips");
const tripRef = (uid: string, tripId: string) => doc(getFirebaseDb(), "users", uid, "trips", tripId);
const citiesRef = (uid: string, tripId: string) => collection(getFirebaseDb(), "users", uid, "trips", tripId, "cities");
const cityRef = (uid: string, tripId: string, id: string) => doc(getFirebaseDb(), "users", uid, "trips", tripId, "cities", id);
const flightsRef = (uid: string, tripId: string) => collection(getFirebaseDb(), "users", uid, "trips", tripId, "flights");
const flightRef = (uid: string, tripId: string, id: string) => doc(getFirebaseDb(), "users", uid, "trips", tripId, "flights", id);
const hotelsRef = (uid: string, tripId: string) => collection(getFirebaseDb(), "users", uid, "trips", tripId, "hotels");
const hotelRef = (uid: string, tripId: string, id: string) => doc(getFirebaseDb(), "users", uid, "trips", tripId, "hotels", id);
const transportsRef = (uid: string, tripId: string) => collection(getFirebaseDb(), "users", uid, "trips", tripId, "transports");
const transportRef = (uid: string, tripId: string, id: string) => doc(getFirebaseDb(), "users", uid, "trips", tripId, "transports", id);
const expensesRef = (uid: string, tripId: string) => collection(getFirebaseDb(), "users", uid, "trips", tripId, "expenses");
const expenseRef = (uid: string, tripId: string, id: string) => doc(getFirebaseDb(), "users", uid, "trips", tripId, "expenses", id);

// Firestore rejects undefined values; strip them before writing.
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

// Trips
export async function getTrips(uid: string): Promise<Trip[]> {
  const q = query(tripsRef(uid), orderBy("start_date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trip));
}

export async function getTrip(uid: string, tripId: string): Promise<Trip | null> {
  const snap = await getDoc(tripRef(uid, tripId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Trip;
}

export async function createTrip(uid: string, data: Omit<Trip, "id" | "created_at" | "updated_at">) {
  const ref = await addDoc(tripsRef(uid), {
    ...stripUndefined(data),
    total_usd: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTrip(uid: string, tripId: string, data: Partial<Trip>) {
  await updateDoc(tripRef(uid, tripId), { ...stripUndefined(data), updated_at: serverTimestamp() });
}

export async function deleteTrip(uid: string, tripId: string) {
  await deleteDoc(tripRef(uid, tripId));
}

// Cities
export async function getCities(uid: string, tripId: string): Promise<City[]> {
  const snap = await getDocs(citiesRef(uid, tripId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as City));
}

export async function createCity(uid: string, tripId: string, data: Omit<City, "id">) {
  const ref = await addDoc(citiesRef(uid, tripId), stripUndefined(data));
  return ref.id;
}

export async function updateCity(uid: string, tripId: string, id: string, data: Partial<Omit<City, "id">>) {
  await updateDoc(cityRef(uid, tripId, id), stripUndefined(data));
}

export async function deleteCity(uid: string, tripId: string, id: string) {
  await deleteDoc(cityRef(uid, tripId, id));
}

// Flights
export async function getFlights(uid: string, tripId: string): Promise<Flight[]> {
  const q = query(flightsRef(uid, tripId), orderBy("departure_utc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Flight));
}

export async function createFlight(uid: string, tripId: string, data: Omit<Flight, "id">) {
  const ref = await addDoc(flightsRef(uid, tripId), stripUndefined(data));
  return ref.id;
}

export async function updateFlight(uid: string, tripId: string, id: string, data: Partial<Omit<Flight, "id">>) {
  await updateDoc(flightRef(uid, tripId, id), stripUndefined(data));
}

export async function deleteFlight(uid: string, tripId: string, id: string) {
  await deleteDoc(flightRef(uid, tripId, id));
}

// Hotels
export async function getHotels(uid: string, tripId: string): Promise<Hotel[]> {
  const q = query(hotelsRef(uid, tripId), orderBy("check_in"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Hotel));
}

export async function createHotel(uid: string, tripId: string, data: Omit<Hotel, "id">) {
  const ref = await addDoc(hotelsRef(uid, tripId), stripUndefined(data));
  return ref.id;
}

export async function updateHotel(uid: string, tripId: string, id: string, data: Partial<Omit<Hotel, "id">>) {
  await updateDoc(hotelRef(uid, tripId, id), stripUndefined(data));
}

export async function deleteHotel(uid: string, tripId: string, id: string) {
  await deleteDoc(hotelRef(uid, tripId, id));
}

// Transports
export async function getTransports(uid: string, tripId: string): Promise<Transport[]> {
  const q = query(transportsRef(uid, tripId), orderBy("departure_utc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transport));
}

export async function createTransport(uid: string, tripId: string, data: Omit<Transport, "id">) {
  const ref = await addDoc(transportsRef(uid, tripId), stripUndefined(data));
  return ref.id;
}

export async function updateTransport(uid: string, tripId: string, id: string, data: Partial<Omit<Transport, "id">>) {
  await updateDoc(transportRef(uid, tripId, id), stripUndefined(data));
}

export async function deleteTransport(uid: string, tripId: string, id: string) {
  await deleteDoc(transportRef(uid, tripId, id));
}

// Fetches today's FX rates. Returns { EUR: 0.92, ARS: 1050, ... } (1 USD = N currency).
// Falls back to yesterday if today's doc doesn't exist yet.
export async function getFxRates(): Promise<Record<string, number>> {
  const db = getFirebaseDb();
  const today = new Date().toISOString().split("T")[0];
  const snap = await getDoc(doc(db, "fx_rates", today));
  if (snap.exists()) return (snap.data().rates as Record<string, number>) ?? {};
  // fallback: try yesterday
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const snap2 = await getDoc(doc(db, "fx_rates", yesterday));
  return snap2.exists() ? ((snap2.data().rates as Record<string, number>) ?? {}) : {};
}

// Recalculates trip total_usd from all items + expenses, and cities_count.
// Call this after any create/update/delete of items or cities.
export async function recalcTripAggregates(uid: string, tripId: string) {
  const [flights, hotels, transports, expenses, cities] = await Promise.all([
    getFlights(uid, tripId),
    getHotels(uid, tripId),
    getTransports(uid, tripId),
    getExpenses(uid, tripId),
    getCities(uid, tripId),
  ]);
  const total =
    flights.reduce((s, f) => s + (f.price_usd ?? 0), 0) +
    hotels.reduce((s, h) => s + (h.total_price_usd ?? 0), 0) +
    transports.reduce((s, t) => s + (t.price_usd ?? 0), 0) +
    expenses.reduce((s, e) => s + (e.amount_usd ?? 0), 0);
  await updateTrip(uid, tripId, {
    total_usd: Math.round(total),
    cities_count: cities.length,
  } as Partial<Trip>);
}

// Expenses
export async function getExpenses(uid: string, tripId: string): Promise<Expense[]> {
  const q = query(expensesRef(uid, tripId), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
}

export async function createExpense(uid: string, tripId: string, data: Omit<Expense, "id">) {
  const ref = await addDoc(expensesRef(uid, tripId), stripUndefined(data));
  return ref.id;
}

export async function updateExpense(uid: string, tripId: string, id: string, data: Partial<Omit<Expense, "id">>) {
  await updateDoc(expenseRef(uid, tripId, id), stripUndefined(data));
}

export async function deleteExpense(uid: string, tripId: string, id: string) {
  await deleteDoc(expenseRef(uid, tripId, id));
}
