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
