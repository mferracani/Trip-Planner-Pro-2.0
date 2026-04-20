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
import type { Trip, City, Flight, Hotel, Transport } from "./types";

// Base path helpers
const tripsRef = (uid: string) => collection(getFirebaseDb(), "users", uid, "trips");
const tripRef = (uid: string, tripId: string) => doc(getFirebaseDb(), "users", uid, "trips", tripId);
const citiesRef = (uid: string, tripId: string) => collection(getFirebaseDb(), "users", uid, "trips", tripId, "cities");
const flightsRef = (uid: string, tripId: string) => collection(getFirebaseDb(), "users", uid, "trips", tripId, "flights");
const hotelsRef = (uid: string, tripId: string) => collection(getFirebaseDb(), "users", uid, "trips", tripId, "hotels");
const transportsRef = (uid: string, tripId: string) => collection(getFirebaseDb(), "users", uid, "trips", tripId, "transports");

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
    ...data,
    total_usd: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTrip(uid: string, tripId: string, data: Partial<Trip>) {
  await updateDoc(tripRef(uid, tripId), { ...data, updated_at: serverTimestamp() });
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
  const ref = await addDoc(citiesRef(uid, tripId), data);
  return ref.id;
}

// Flights
export async function getFlights(uid: string, tripId: string): Promise<Flight[]> {
  const q = query(flightsRef(uid, tripId), orderBy("departure_utc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Flight));
}

export async function createFlight(uid: string, tripId: string, data: Omit<Flight, "id">) {
  const ref = await addDoc(flightsRef(uid, tripId), data);
  return ref.id;
}

// Hotels
export async function getHotels(uid: string, tripId: string): Promise<Hotel[]> {
  const q = query(hotelsRef(uid, tripId), orderBy("check_in"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Hotel));
}

export async function createHotel(uid: string, tripId: string, data: Omit<Hotel, "id">) {
  const ref = await addDoc(hotelsRef(uid, tripId), data);
  return ref.id;
}

// Transports
export async function getTransports(uid: string, tripId: string): Promise<Transport[]> {
  const q = query(transportsRef(uid, tripId), orderBy("departure_utc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transport));
}

export async function createTransport(uid: string, tripId: string, data: Omit<Transport, "id">) {
  const ref = await addDoc(transportsRef(uid, tripId), data);
  return ref.id;
}
