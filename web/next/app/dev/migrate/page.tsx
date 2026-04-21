"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Timestamp, collection, addDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { CITY_COLORS } from "@/lib/types";

// ---------------------------------------------------------------------------
// TIMEZONE HELPERS
// ---------------------------------------------------------------------------

const CITY_TIMEZONES: Record<string, string> = {
  "Buenos Aires": "America/Argentina/Buenos_Aires",
  "Bariloche": "America/Argentina/Salta",
  "Santiago": "America/Santiago",
  "Viña del Mar": "America/Santiago",
  "Paris": "Europe/Paris",
  "Londres": "Europe/London",
  "Edinburgo": "Europe/London",
  "Oxford": "Europe/London",
  "Mykonos": "Europe/Athens",
  "Santorini": "Europe/Athens",
  "Niza": "Europe/Paris",
  "Buzios": "America/Sao_Paulo",
  "Rio de Janeiro": "America/Sao_Paulo",
  "São Paulo": "America/Sao_Paulo",
  "Ciudad del Cabo": "Africa/Johannesburg",
  "Johannesburgo": "Africa/Johannesburg",
  "Gansbaai": "Africa/Johannesburg",
  "Parque Kruger": "Africa/Johannesburg",
};

const AIRPORT_TIMEZONES: Record<string, string> = {
  "AEP": "America/Argentina/Buenos_Aires",
  "EZE": "America/Argentina/Buenos_Aires",
  "BRC": "America/Argentina/Salta",
  "SCL": "America/Santiago",
  "CDG": "Europe/Paris",
  "LHR": "Europe/London",
  "LCY": "Europe/London",
  "JMK": "Europe/Athens",
  "JTR": "Europe/Athens",
  "NCE": "Europe/Paris",
  "GIG": "America/Sao_Paulo",
  "GRU": "America/Sao_Paulo",
  "JNB": "Africa/Johannesburg",
  "CPT": "Africa/Johannesburg",
  "HDS": "Africa/Johannesburg",
};

// Rough historical USD rates (2017-2018) for price_usd approximation
const FX_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.12,
  ARS: 0.058,
  BRL: 0.31,
};

function toUSD(amount: number, currency: string): number {
  return Math.round((amount * (FX_TO_USD[currency] ?? 1)) * 100) / 100;
}

// Extract IATA code from strings like "Buenos Aires (AEP)" → "AEP"
function extractIATA(str: string): string | null {
  const m = str.match(/\(([A-Z]{3})\)/);
  return m ? m[1] : null;
}

// Get timezone for a city/airport string
function getTimezone(cityOrAirport: string, iata: string | null): string {
  if (iata && AIRPORT_TIMEZONES[iata]) return AIRPORT_TIMEZONES[iata];
  for (const [city, tz] of Object.entries(CITY_TIMEZONES)) {
    if (cityOrAirport.includes(city)) return tz;
  }
  return "UTC";
}

// Convert "2017-06-16" + "17:35" → "2017-06-16T17:35"
function toLocalDatetime(date: string, time: string | null): string {
  return `${date}T${time ?? "00:00"}`;
}

// Convert local datetime + IANA timezone → approximate UTC Timestamp
function localToTimestamp(localDatetime: string, timezone: string): Timestamp {
  // Use Intl to get UTC offset for this timezone at roughly this time
  const approxDate = new Date(localDatetime + "Z"); // parse as UTC first
  try {
    const utcStr = approxDate.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = approxDate.toLocaleString("en-US", { timeZone: timezone });
    const utcMs = new Date(utcStr).getTime();
    const tzMs = new Date(tzStr).getTime();
    const offsetMs = utcMs - tzMs; // positive = ahead of UTC
    const utcDate = new Date(approxDate.getTime() + offsetMs);
    return Timestamp.fromDate(utcDate);
  } catch {
    return Timestamp.fromDate(approxDate);
  }
}

function durationMinutes(
  depLocal: string, depTz: string,
  arrLocal: string, arrTz: string
): number {
  const dep = localToTimestamp(depLocal, depTz);
  const arr = localToTimestamp(arrLocal, arrTz);
  return Math.round((arr.toMillis() - dep.toMillis()) / 60000);
}

// Map color_token to hex color
function colorFromToken(token: string): string {
  if (token === "city-bue") return "#4D96FF"; // blue for Buenos Aires home
  const n = parseInt(token.replace("city-", ""), 10);
  return CITY_COLORS[(n - 1) % CITY_COLORS.length] ?? CITY_COLORS[0];
}

// Map transport mode
function mapMode(mode: string): "train" | "bus" | "ferry" | "car" | "taxi" | "subway" | "other" {
  const m: Record<string, "train" | "bus" | "ferry" | "car" | "taxi" | "subway" | "other"> = {
    train: "train", bus: "bus", ferry: "ferry",
    car_rental: "car", car: "car",
    transfer: "other", other: "other",
  };
  return m[mode] ?? "other";
}

// Generate trip_days dates (same logic as TripLog seed)
function generateTripDates(start: string, end: string): string[] {
  const startD = new Date(start + "T00:00:00Z");
  const endD = new Date(end + "T00:00:00Z");
  const dates: string[] = [];
  const cur = new Date(startD);
  while (cur <= endD) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// TRIP DATA (from trip-planner-pro-17)
// ---------------------------------------------------------------------------

interface TripDef {
  name: string;
  start: string;
  end: string;
  status: "past";
  cities: { name: string; country: string; color_token: string; lat: number; lng: number }[];
  dayMap: Record<string, string>; // date → primary city name
  dayMap2?: Record<string, string>; // date → secondary city name (transition days)
  flights: {
    airline: string;
    flight_number: string;
    depart_date: string;
    depart_time: string;
    arrive_date: string;
    arrive_time: string;
    origin_city: string;
    destination_city: string;
    cost: number;
    currency: string;
    notes?: string;
  }[];
  hotels: {
    name: string;
    city_name: string;
    check_in: string;
    check_out: string;
    nightly_rate: number;
    total_cost: number;
    currency: string;
    address?: string | null;
    booking_ref?: string | null;
    notes?: string | null;
  }[];
  transports: {
    mode: string;
    provider: string;
    origin_city: string;
    destination_city: string;
    start_date: string;
    departure_time?: string | null;
    arrival_time?: string | null;
    cost: number;
    currency: string;
    booking_ref?: string | null;
    train_number?: string | null;
    car_model?: string | null;
    seats?: string | null;
    extras?: string | null;
    travel_duration?: string | null;
  }[];
  expenses: {
    date: string;
    category: string;
    description: string;
    cost: number;
    currency: string;
  }[];
}

const TRIPS: TripDef[] = [
  {
    name: "Bariloche 2017",
    start: "2017-12-07", end: "2017-12-10", status: "past",
    cities: [
      { name: "Buenos Aires", country: "Argentina", color_token: "city-bue", lat: -34.6037, lng: -58.3816 },
      { name: "Bariloche", country: "Argentina", color_token: "city-1", lat: -41.1335, lng: -71.3103 },
    ],
    dayMap: { "2017-12-07": "Buenos Aires", "2017-12-08": "Bariloche", "2017-12-09": "Bariloche", "2017-12-10": "Bariloche" },
    flights: [
      { airline: "LATAM", flight_number: "LA7770", depart_date: "2017-12-07", depart_time: "10:40", arrive_date: "2017-12-07", arrive_time: "13:05", origin_city: "Buenos Aires (AEP)", destination_city: "Bariloche (BRC)", cost: 4039, currency: "ARS", notes: "Reserva Mati: LQHAJM, Agus: UUBYTT, Moni: DUYHID" },
      { airline: "LATAM", flight_number: "LA7767", depart_date: "2017-12-10", depart_time: "20:00", arrive_date: "2017-12-10", arrive_time: "22:06", origin_city: "Bariloche (BRC)", destination_city: "Buenos Aires (EZE)", cost: 0, currency: "ARS", notes: "Vuelta – 26.000 millas LATAM" },
    ],
    hotels: [
      { name: "Belleview", city_name: "Bariloche", check_in: "2017-12-07", check_out: "2017-12-10", nightly_rate: 100, total_cost: 300, currency: "ARS", address: "Bariloche" },
    ],
    transports: [
      { mode: "car_rental", provider: "Aka Rent A Car", origin_city: "Bariloche", destination_city: "Bariloche", start_date: "2017-12-07", cost: 2700, currency: "ARS" },
    ],
    expenses: [
      { date: "2017-12-10", category: "Transport", description: "Combustible YPF", cost: 780, currency: "ARS" },
      { date: "2017-12-10", category: "Insurance", description: "Seguro viaje", cost: 1160, currency: "ARS" },
      { date: "2017-12-08", category: "Food", description: "Weiss", cost: 434, currency: "ARS" },
      { date: "2017-12-08", category: "Food", description: "Despensa", cost: 115, currency: "ARS" },
      { date: "2017-12-08", category: "Shopping", description: "Mamushka (Chocolates)", cost: 256, currency: "ARS" },
      { date: "2017-12-09", category: "Food", description: "Viejo Fred (Villa La Angostura)", cost: 580, currency: "ARS" },
      { date: "2017-12-09", category: "Food", description: "Bahía Serena", cost: 500, currency: "ARS" },
      { date: "2017-12-09", category: "Food", description: "Cuchillo", cost: 590, currency: "ARS" },
      { date: "2017-12-10", category: "Food", description: "La Parrilla de Alberto", cost: 1000, currency: "ARS" },
      { date: "2017-12-10", category: "Shopping", description: "Rapanui", cost: 280, currency: "ARS" },
    ],
  },
  {
    name: "Chile 2017",
    start: "2017-11-24", end: "2017-11-28", status: "past",
    cities: [
      { name: "Buenos Aires", country: "Argentina", color_token: "city-bue", lat: -34.6037, lng: -58.3816 },
      { name: "Santiago", country: "Chile", color_token: "city-1", lat: -33.4489, lng: -70.6693 },
      { name: "Viña del Mar", country: "Chile", color_token: "city-2", lat: -33.0153, lng: -71.5500 },
    ],
    dayMap: { "2017-11-24": "Buenos Aires", "2017-11-25": "Santiago", "2017-11-26": "Viña del Mar", "2017-11-27": "Santiago", "2017-11-28": "Santiago" },
    flights: [
      { airline: "Aerolíneas Argentinas", flight_number: "AR1288", depart_date: "2017-11-24", depart_time: "20:05", arrive_date: "2017-11-24", arrive_time: "22:25", origin_city: "Buenos Aires (AEP)", destination_city: "Santiago (SCL)", cost: 189, currency: "USD", notes: "Reserva: NEFVFO – 28.000 millas + USD 189 impuestos (2 pax)" },
      { airline: "Aerolíneas Argentinas", flight_number: "AR1289", depart_date: "2017-11-28", depart_time: "07:15", arrive_date: "2017-11-28", arrive_time: "09:15", origin_city: "Santiago (SCL)", destination_city: "Buenos Aires (AEP)", cost: 0, currency: "USD", notes: "Vuelta – incluido en millas" },
    ],
    hotels: [
      { name: "Courtyard Santiago las Condes", city_name: "Santiago", check_in: "2017-11-24", check_out: "2017-11-28", nightly_rate: 49, total_cost: 196, currency: "USD", address: "Santiago, Las Condes", booking_ref: "96440620" },
    ],
    transports: [
      { mode: "car_rental", provider: "Hertz (vía Interturis)", origin_city: "Santiago", destination_city: "Santiago", start_date: "2017-11-24", cost: 207, currency: "USD" },
    ],
    expenses: [
      { date: "2017-11-28", category: "General", description: "Gastos varios", cost: 46, currency: "USD" },
    ],
  },
  {
    name: "Europa 2017",
    start: "2017-06-16", end: "2017-07-11", status: "past",
    cities: [
      { name: "Buenos Aires", country: "Argentina", color_token: "city-bue", lat: -34.6037, lng: -58.3816 },
      { name: "Paris", country: "France", color_token: "city-6", lat: 48.8566, lng: 2.3522 },
      { name: "Londres", country: "United Kingdom", color_token: "city-2", lat: 51.5074, lng: -0.1278 },
      { name: "Edinburgo", country: "United Kingdom", color_token: "city-3", lat: 55.9533, lng: -3.1883 },
      { name: "Mykonos", country: "Greece", color_token: "city-1", lat: 37.4467, lng: 25.3289 },
      { name: "Santorini", country: "Greece", color_token: "city-5", lat: 36.3932, lng: 25.4615 },
      { name: "Niza", country: "France", color_token: "city-7", lat: 43.7102, lng: 7.2620 },
      { name: "Oxford", country: "United Kingdom", color_token: "city-4", lat: 51.7520, lng: -1.2577 },
    ],
    dayMap: {
      "2017-06-16": "Buenos Aires", "2017-06-17": "Paris", "2017-06-18": "Paris",
      "2017-06-19": "Londres", "2017-06-20": "Londres", "2017-06-21": "Londres", "2017-06-22": "Londres",
      "2017-06-23": "Edinburgo", "2017-06-24": "Oxford", "2017-06-25": "Londres",
      "2017-06-26": "Mykonos", "2017-06-27": "Mykonos", "2017-06-28": "Mykonos",
      "2017-06-29": "Santorini", "2017-06-30": "Santorini", "2017-07-01": "Santorini", "2017-07-02": "Santorini",
      "2017-07-03": "Niza", "2017-07-04": "Niza", "2017-07-05": "Niza", "2017-07-06": "Niza",
      "2017-07-07": "Paris", "2017-07-08": "Paris", "2017-07-09": "Paris", "2017-07-10": "Paris",
      "2017-07-11": "Buenos Aires",
    },
    flights: [
      { airline: "GOL / Air France", flight_number: "JJ8005", depart_date: "2017-06-16", depart_time: "17:35", arrive_date: "2017-06-17", arrive_time: "14:55", origin_city: "Buenos Aires (AEP)", destination_city: "Paris (CDG)", cost: 0, currency: "USD", notes: "Conexión GRU – Sale 22:35 vuelo JJ8108" },
      { airline: "Eurostar", flight_number: "9063", depart_date: "2017-06-18", depart_time: "21:13", arrive_date: "2017-06-18", arrive_time: "22:39", origin_city: "Paris (Nord)", destination_city: "London (St Pancras)", cost: 191, currency: "USD", notes: "Tren Eurostar – 2:26hs" },
      { airline: "British Airways", flight_number: "BA2221", depart_date: "2017-06-26", depart_time: "10:40", arrive_date: "2017-06-26", arrive_time: "16:30", origin_city: "London (LCY)", destination_city: "Mykonos (JMK)", cost: 510, currency: "USD", notes: "3:50hs" },
      { airline: "Sea Jets", flight_number: "FD620055", depart_date: "2017-06-29", depart_time: "09:50", arrive_date: "2017-06-29", arrive_time: "11:55", origin_city: "Mykonos", destination_city: "Santorini (Thira)", cost: 160, currency: "EUR", notes: "Ferry – 2:00hs" },
      { airline: "Iberia - Vueling", flight_number: "IB5525/IB5348", depart_date: "2017-07-03", depart_time: "04:00", arrive_date: "2017-07-03", arrive_time: "08:35", origin_city: "Santorini (JTR)", destination_city: "Niza (NCE)", cost: 282.47, currency: "USD", notes: "2:40hs – Reserva Y685AS" },
      { airline: "GOL / Air France", flight_number: "JJ8101", depart_date: "2017-07-10", depart_time: "23:00", arrive_date: "2017-07-11", arrive_time: "10:20", origin_city: "Paris (CDG)", destination_city: "Buenos Aires (AEP)", cost: 0, currency: "USD", notes: "Conexión GRU – Sale 07:15 vuelo JJ8014" },
    ],
    hotels: [
      { name: "Ibis Paris Avenue d'Italie 13ème", city_name: "Paris", check_in: "2017-06-17", check_out: "2017-06-18", nightly_rate: 0, total_cost: 0, currency: "USD", address: "15 Bis avenue d'Italie", booking_ref: "132299380731" },
      { name: "Great St Helen Hotel", city_name: "Londres", check_in: "2017-06-18", check_out: "2017-06-19", nightly_rate: 0, total_cost: 0, currency: "USD", address: "36 Great st Helens", booking_ref: "1573524715" },
      { name: "Casa Sonia Souza (Airbnb)", city_name: "Londres", check_in: "2017-06-19", check_out: "2017-06-23", nightly_rate: 0, total_cost: 0, currency: "USD", address: "11 Ramillies Street Flat 2", booking_ref: "A3WTPB" },
      { name: "Ibis Edinburgh Centre South Bridge", city_name: "Edinburgo", check_in: "2017-06-23", check_out: "2017-06-25", nightly_rate: 0, total_cost: 0, currency: "EUR", address: "77 South Bridge", booking_ref: "FGRDBKFB" },
      { name: "Grange Langham Court Hotel", city_name: "Londres", check_in: "2017-06-25", check_out: "2017-06-26", nightly_rate: 0, total_cost: 0, currency: "USD", address: "31-35 Langham Street, Westminster Borough", booking_ref: "1352873017" },
      { name: "Manoula's Beach", city_name: "Mykonos", check_in: "2017-06-26", check_out: "2017-06-29", nightly_rate: 0, total_cost: 0, currency: "EUR", address: "Agios Ioannis Mykonos 846 00", booking_ref: "FD620055" },
      { name: "El Greco", city_name: "Santorini", check_in: "2017-06-29", check_out: "2017-07-01", nightly_rate: 0, total_cost: 0, currency: "EUR", address: "FIRA P.O.BOX91", booking_ref: "FD620055" },
      { name: "La Perla Villas", city_name: "Santorini", check_in: "2017-07-01", check_out: "2017-07-03", nightly_rate: 0, total_cost: 0, currency: "EUR", address: "Oya 847 02", booking_ref: "FD620055" },
      { name: "Casa JB (Airbnb)", city_name: "Niza", check_in: "2017-07-03", check_out: "2017-07-07", nightly_rate: 0, total_cost: 0, currency: "USD", address: "11 Rue Paradis, Niza 06000", booking_ref: "8BM23X" },
      { name: "Ibis Paris Avenue d'Italie 13ème (2)", city_name: "Paris", check_in: "2017-07-07", check_out: "2017-07-09", nightly_rate: 0, total_cost: 0, currency: "USD", address: "15 Bis avenue d'Italie", booking_ref: "8089505011609" },
      { name: "Ibis Paris Avenue d'Italie 13ème (3)", city_name: "Paris", check_in: "2017-07-09", check_out: "2017-07-10", nightly_rate: 0, total_cost: 0, currency: "USD", address: "15 Bis avenue d'Italie", booking_ref: "132299515161" },
    ],
    transports: [
      { mode: "train", provider: "Eurostar", origin_city: "Paris (Nord)", destination_city: "London (St Pancras)", start_date: "2017-06-18", departure_time: "21:13", arrival_time: "22:39", cost: 191, currency: "USD", booking_ref: "38385662", train_number: "9063", seats: "007/016, 007/015", extras: "Plataforma LEVEL 1", travel_duration: "2h 26m" },
      { mode: "train", provider: "Virgin Trains East Coast", origin_city: "London (Kings Cross)", destination_city: "Edinburgh (Waverley)", start_date: "2017-06-23", departure_time: "09:00", arrival_time: "13:20", cost: 303, currency: "USD", booking_ref: "FJX267WH", extras: "Vagón E, Asiento 47/48", travel_duration: "4h 20m" },
      { mode: "train", provider: "Virgin Trains East Coast", origin_city: "Edinburgh (Waverley)", destination_city: "London (Kings Cross)", start_date: "2017-06-25", departure_time: "17:30", arrival_time: "22:00", cost: 0, currency: "USD", booking_ref: "FJX267WH", extras: "Vagón C, Asiento 25/26", travel_duration: "4h 30m" },
      { mode: "transfer", provider: "I Need Tours", origin_city: "Hotel - Aeropuerto", destination_city: "London (LCY)", start_date: "2017-06-26", departure_time: "07:45", cost: 63, currency: "USD", booking_ref: "13469" },
      { mode: "transfer", provider: "Horizon", origin_city: "Santorini", destination_city: "Santorini", start_date: "2017-07-03", cost: 39, currency: "USD", booking_ref: "FD620055", extras: "Traslado privado" },
      { mode: "train", provider: "TGV", origin_city: "Nice Ville", destination_city: "Paris (Gare de Lyon)", start_date: "2017-07-07", departure_time: "10:04", arrival_time: "15:42", cost: 187, currency: "USD", booking_ref: "DRPBKHN/SVILDG", train_number: "6074", extras: "Vagón 007, Asiento 101/102", travel_duration: "5h 38m" },
      { mode: "car_rental", provider: "Hertz", origin_city: "Niza (NCE)", destination_city: "Niza Estación", start_date: "2017-07-03", departure_time: "10:00", arrival_time: "09:00", cost: 234, currency: "USD", booking_ref: "1000779877", car_model: "FIAT TIPO", extras: "ARS $3.814,20" },
    ],
    expenses: [
      { date: "2017-07-11", category: "Transport", description: "Total traslados (USD)", cost: 1575.47, currency: "USD" },
      { date: "2017-07-11", category: "Transport", description: "Total traslados (EUR)", cost: 160, currency: "EUR" },
      { date: "2017-07-11", category: "Transport", description: "Trenes (USD)", cost: 93, currency: "USD" },
    ],
  },
  {
    name: "Rio & Buzios 2017",
    start: "2017-04-21", end: "2017-04-30", status: "past",
    cities: [
      { name: "Buenos Aires", country: "Argentina", color_token: "city-bue", lat: -34.6037, lng: -58.3816 },
      { name: "Buzios", country: "Brazil", color_token: "city-1", lat: -22.7469, lng: -41.8811 },
      { name: "Rio de Janeiro", country: "Brazil", color_token: "city-2", lat: -22.9068, lng: -43.1729 },
    ],
    dayMap: {
      "2017-04-21": "Buenos Aires", "2017-04-22": "Buzios", "2017-04-23": "Buzios",
      "2017-04-24": "Buzios", "2017-04-25": "Buzios", "2017-04-26": "Buzios", "2017-04-27": "Buzios",
      "2017-04-28": "Rio de Janeiro", "2017-04-29": "Rio de Janeiro", "2017-04-30": "Buenos Aires",
    },
    flights: [
      { airline: "Aerolíneas Argentinas", flight_number: "AR1256", depart_date: "2017-04-21", depart_time: "16:55", arrive_date: "2017-04-21", arrive_time: "19:50", origin_city: "Buenos Aires (AEP)", destination_city: "Rio de Janeiro (GIG)", cost: 0, currency: "USD", notes: "Reserva: VVKWQK" },
      { airline: "Aerolíneas Argentinas", flight_number: "AR1293", depart_date: "2017-04-30", depart_time: "10:05", arrive_date: "2017-04-30", arrive_time: "13:30", origin_city: "Rio de Janeiro (GIG)", destination_city: "Buenos Aires (AEP)", cost: 0, currency: "USD", notes: "Vuelta" },
    ],
    hotels: [
      { name: "Rio Buzios Beach Hotel", city_name: "Buzios", check_in: "2017-04-21", check_out: "2017-04-27", nightly_rate: 0, total_cost: 0, currency: "BRL", address: "Buzios" },
      { name: "Copa Sul Hotel", city_name: "Rio de Janeiro", check_in: "2017-04-28", check_out: "2017-04-30", nightly_rate: 0, total_cost: 0, currency: "BRL", address: "Rio de Janeiro" },
    ],
    transports: [],
    expenses: [
      { date: "2017-04-22", category: "Activities", description: "Excursión Cabo Frio", cost: 150, currency: "BRL" },
      { date: "2017-04-23", category: "Activities", description: "Excursión Arraial do Cabo", cost: 165, currency: "BRL" },
      { date: "2017-04-24", category: "Activities", description: "Buceo", cost: 213, currency: "BRL" },
    ],
  },
  {
    name: "Sudafrica 2018",
    start: "2018-03-26", end: "2018-04-09", status: "past",
    cities: [
      { name: "Buenos Aires", country: "Argentina", color_token: "city-bue", lat: -34.6037, lng: -58.3816 },
      { name: "São Paulo", country: "Brazil", color_token: "city-8", lat: -23.5505, lng: -46.6333 },
      { name: "Ciudad del Cabo", country: "South Africa", color_token: "city-1", lat: -33.9249, lng: 18.4241 },
      { name: "Johannesburgo", country: "South Africa", color_token: "city-3", lat: -26.2041, lng: 28.0473 },
      { name: "Gansbaai", country: "South Africa", color_token: "city-5", lat: -34.5801, lng: 19.3486 },
      { name: "Parque Kruger", country: "South Africa", color_token: "city-4", lat: -24.0167, lng: 31.4833 },
    ],
    dayMap: {
      "2018-03-26": "Buenos Aires", "2018-03-27": "São Paulo", "2018-03-28": "Johannesburgo",
      "2018-03-29": "Ciudad del Cabo", "2018-03-30": "Ciudad del Cabo", "2018-03-31": "Ciudad del Cabo",
      "2018-04-01": "Ciudad del Cabo", "2018-04-02": "Gansbaai", "2018-04-03": "Ciudad del Cabo",
      "2018-04-04": "Parque Kruger", "2018-04-05": "Parque Kruger", "2018-04-06": "Parque Kruger",
      "2018-04-07": "Parque Kruger", "2018-04-08": "Parque Kruger", "2018-04-09": "Johannesburgo",
    },
    flights: [
      { airline: "Aerolíneas Argentinas", flight_number: "AR1248", depart_date: "2018-03-27", depart_time: "19:30", arrive_date: "2018-03-27", arrive_time: "22:15", origin_city: "Buenos Aires (AEP)", destination_city: "São Paulo (GRU)", cost: 0, currency: "USD", notes: "Conexión" },
      { airline: "South African Airways", flight_number: "SA223", depart_date: "2018-03-28", depart_time: "18:00", arrive_date: "2018-03-28", arrive_time: "07:25", origin_city: "São Paulo (GRU)", destination_city: "Johannesburgo (JNB)", cost: 0, currency: "USD", notes: "+1 día" },
      { airline: "South African Airways", flight_number: "SA317", depart_date: "2018-03-29", depart_time: "09:10", arrive_date: "2018-03-29", arrive_time: "11:20", origin_city: "Johannesburgo (JNB)", destination_city: "Ciudad del Cabo (CPT)", cost: 0, currency: "USD", notes: "+1 día" },
      { airline: "South African Airways", flight_number: "SA1241", depart_date: "2018-04-04", depart_time: "09:10", arrive_date: "2018-04-04", arrive_time: "12:30", origin_city: "Ciudad del Cabo (CPT)", destination_city: "Hoedspruit (HDS)", cost: 0, currency: "USD", notes: "Vuelo a Parque Kruger" },
      { airline: "South African Airways", flight_number: "SA222", depart_date: "2018-04-09", depart_time: "11:00", arrive_date: "2018-04-09", arrive_time: "16:30", origin_city: "Johannesburgo (JNB)", destination_city: "São Paulo (GRU)", cost: 0, currency: "USD", notes: "Vuelta leg 1" },
      { airline: "Aerolíneas Argentinas", flight_number: "AR1245", depart_date: "2018-04-09", depart_time: "19:00", arrive_date: "2018-04-09", arrive_time: "21:55", origin_city: "São Paulo (GRU)", destination_city: "Buenos Aires (AEP)", cost: 0, currency: "USD", notes: "Vuelta leg 2" },
    ],
    hotels: [
      { name: "Sleep Inn Guarulhos", city_name: "São Paulo", check_in: "2018-03-27", check_out: "2018-03-28", nightly_rate: 0, total_cost: 0, currency: "USD", address: "São Paulo Guarulhos Airport" },
      { name: "Protea Hotel Fire & Ice Cape Town", city_name: "Ciudad del Cabo", check_in: "2018-03-29", check_out: "2018-04-02", nightly_rate: 0, total_cost: 0, currency: "USD", address: "Cape Town" },
      { name: "Sea Star Cliff", city_name: "Gansbaai", check_in: "2018-04-02", check_out: "2018-04-03", nightly_rate: 0, total_cost: 0, currency: "USD", address: "Gansbaai" },
      { name: "Protea Hotel Cape Town Victoria Junction", city_name: "Ciudad del Cabo", check_in: "2018-04-03", check_out: "2018-04-04", nightly_rate: 0, total_cost: 0, currency: "USD", address: "Cape Town", booking_ref: "#6E3D-7959" },
      { name: "Kapama Southern Camp", city_name: "Parque Kruger", check_in: "2018-04-04", check_out: "2018-04-09", nightly_rate: 0, total_cost: 0, currency: "USD", address: "Kruger National Park area" },
    ],
    transports: [],
    expenses: [],
  },
];

// ---------------------------------------------------------------------------
// MIGRATION ENGINE
// ---------------------------------------------------------------------------

type LogEntry = { msg: string; ok: boolean };

async function migrateTripData(
  uid: string,
  trip: TripDef,
  log: (e: LogEntry) => void
): Promise<void> {
  const db = getFirebaseDb();

  // Build city days lookup: cityName → array of dates
  const cityDaysMap: Record<string, string[]> = {};
  for (const [date, cityName] of Object.entries(trip.dayMap)) {
    if (!cityDaysMap[cityName]) cityDaysMap[cityName] = [];
    cityDaysMap[cityName].push(date);
  }

  // 1. Create trip document
  const totalUsd = [
    ...trip.flights.map((f) => toUSD(f.cost, f.currency)),
    ...trip.hotels.map((h) => toUSD(h.total_cost, h.currency)),
    ...trip.transports.map((t) => toUSD(t.cost, t.currency)),
    ...trip.expenses.map((e) => toUSD(e.cost, e.currency)),
  ].reduce((a, b) => a + b, 0);

  const tripRef = await addDoc(collection(db, "users", uid, "trips"), {
    name: trip.name,
    start_date: trip.start,
    end_date: trip.end,
    total_usd: Math.round(totalUsd),
    cities_count: trip.cities.length,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  const tripId = tripRef.id;
  log({ msg: `✓ Trip "${trip.name}" → ${tripId}`, ok: true });

  // 2. Create cities
  const cityIdMap: Record<string, string> = {}; // cityName → Firestore ID
  for (let i = 0; i < trip.cities.length; i++) {
    const c = trip.cities[i];
    const tz = CITY_TIMEZONES[c.name] ?? "UTC";
    const days = cityDaysMap[c.name] ?? [];
    const cityDocRef = await addDoc(collection(db, "users", uid, "trips", tripId, "cities"), {
      trip_id: tripId,
      name: c.name,
      country: c.country,
      lat: c.lat,
      lng: c.lng,
      color: colorFromToken(c.color_token),
      timezone: tz,
      days,
    });
    cityIdMap[c.name] = cityDocRef.id;
  }
  log({ msg: `✓ ${trip.cities.length} ciudades`, ok: true });

  // 3. Create trip_days (one doc per date, ID = date string)
  const allDates = generateTripDates(trip.start, trip.end);
  for (const date of allDates) {
    const cityName = trip.dayMap[date] ?? null;
    const city_id = cityName ? (cityIdMap[cityName] ?? null) : null;
    await setDoc(doc(db, "users", uid, "trips", tripId, "trip_days", date), {
      city_id,
      notes: null,
    });
  }
  log({ msg: `✓ ${allDates.length} días del calendario`, ok: true });

  // 4. Create flights
  for (const f of trip.flights) {
    const originIata = extractIATA(f.origin_city);
    const destIata = extractIATA(f.destination_city);
    const depTz = getTimezone(f.origin_city, originIata);
    const arrTz = getTimezone(f.destination_city, destIata);
    const depLocal = toLocalDatetime(f.depart_date, f.depart_time);
    const arrLocal = toLocalDatetime(f.arrive_date, f.arrive_time);
    const depUtc = localToTimestamp(depLocal, depTz);
    const arrUtc = localToTimestamp(arrLocal, arrTz);
    const durMin = durationMinutes(depLocal, depTz, arrLocal, arrTz);

    const flightData: Record<string, unknown> = {
      trip_id: tripId,
      airline: f.airline,
      flight_number: f.flight_number,
      origin_iata: originIata ?? f.origin_city,
      destination_iata: destIata ?? f.destination_city,
      departure_local_time: depLocal,
      departure_timezone: depTz,
      departure_utc: depUtc,
      arrival_local_time: arrLocal,
      arrival_timezone: arrTz,
      arrival_utc: arrUtc,
      duration_minutes: durMin,
      price: f.cost || null,
      currency: f.currency,
      price_usd: toUSD(f.cost, f.currency),
    };
    if (f.notes) flightData.notes = f.notes;

    await addDoc(collection(db, "users", uid, "trips", tripId, "flights"), flightData);
  }
  if (trip.flights.length) log({ msg: `✓ ${trip.flights.length} vuelos`, ok: true });

  // 5. Create hotels
  for (const h of trip.hotels) {
    const city_id = cityIdMap[h.city_name] ?? null;
    const hotelData: Record<string, unknown> = {
      trip_id: tripId,
      city_id,
      name: h.name,
      check_in: h.check_in,
      check_out: h.check_out,
      currency: h.currency,
      total_price_usd: toUSD(h.total_cost, h.currency),
    };
    if (h.nightly_rate) hotelData.price_per_night = h.nightly_rate;
    if (h.address) hotelData.address = h.address;
    if (h.booking_ref) hotelData.booking_ref = h.booking_ref;

    await addDoc(collection(db, "users", uid, "trips", tripId, "hotels"), hotelData);
  }
  if (trip.hotels.length) log({ msg: `✓ ${trip.hotels.length} hoteles`, ok: true });

  // 6. Create transports
  for (const t of trip.transports) {
    const depLocal = toLocalDatetime(t.start_date, t.departure_time ?? null);
    const depTz = getTimezone(t.origin_city, extractIATA(t.origin_city));
    const depUtc = localToTimestamp(depLocal, depTz);

    const transportData: Record<string, unknown> = {
      trip_id: tripId,
      type: mapMode(t.mode),
      origin: t.origin_city,
      destination: t.destination_city,
      departure_local_time: depLocal,
      departure_timezone: depTz,
      departure_utc: depUtc,
      operator: t.provider,
      price: t.cost || null,
      currency: t.currency,
      price_usd: toUSD(t.cost, t.currency),
    };

    if (t.arrival_time) {
      const arrLocal = toLocalDatetime(t.start_date, t.arrival_time);
      const arrTz = getTimezone(t.destination_city, extractIATA(t.destination_city));
      transportData.arrival_local_time = arrLocal;
      transportData.arrival_timezone = arrTz;
      transportData.arrival_utc = localToTimestamp(arrLocal, arrTz);
    }
    if (t.booking_ref) transportData.booking_ref = t.booking_ref;

    // Store extra info in notes
    const noteParts: string[] = [];
    if (t.train_number) noteParts.push(`Tren: ${t.train_number}`);
    if (t.car_model) noteParts.push(`Auto: ${t.car_model}`);
    if (t.seats) noteParts.push(`Asientos: ${t.seats}`);
    if (t.extras) noteParts.push(t.extras);
    if (t.travel_duration) noteParts.push(`Duración: ${t.travel_duration}`);
    if (noteParts.length) transportData.notes = noteParts.join(" · ");

    await addDoc(collection(db, "users", uid, "trips", tripId, "transports"), transportData);
  }
  if (trip.transports.length) log({ msg: `✓ ${trip.transports.length} transportes`, ok: true });

  // 7. Create expenses
  for (const e of trip.expenses) {
    const catMap: Record<string, string> = {
      Transport: "transport", Food: "food", Shopping: "shopping",
      Activities: "activity", Insurance: "other", General: "other",
    };
    await addDoc(collection(db, "users", uid, "trips", tripId, "expenses"), {
      trip_id: tripId,
      title: e.description,
      amount: e.cost,
      currency: e.currency,
      amount_usd: toUSD(e.cost, e.currency),
      date: e.date,
      category: catMap[e.category] ?? "other",
    });
  }
  if (trip.expenses.length) log({ msg: `✓ ${trip.expenses.length} gastos`, ok: true });
}

// ---------------------------------------------------------------------------
// SUPABASE LIVE FETCH + AUDIT
// ---------------------------------------------------------------------------

const SUPABASE_URL = "https://qtvzakmvotmiltwkmvix.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dnpha212b3RtaWx0d2ttdml4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTE1MTgsImV4cCI6MjA4NjcyNzUxOH0._1Qi6qomwqZ8MBdxQ4_JNxKl8RAWfC2y7_qGKbJNhxg";
const SUPABASE_EMAIL = "matiasferracani@gmail.com";

// Full audit types
interface AuditLeg {
  leg_order: number;
  flight_number: string | null;
  origin: string;
  destination: string;
  depart_date: string;
  depart_time: string | null;
  arrive_date: string | null;
  arrive_time: string | null;
  seat: string | null;
  direction: string;
  depart_utc_offset: number | null;
  arrive_utc_offset: number | null;
}
interface AuditFlight {
  id: string;
  airline: string;
  flight_number: string;
  origin_city: string;
  destination_city: string;
  depart_date: string;
  depart_time: string | null;
  arrive_date: string | null;
  arrive_time: string | null;
  cost: number;
  currency: string;
  booking_ref: string | null;
  notes: string | null;
  legs: AuditLeg[];
}
interface AuditDay {
  date: string;
  city_name: string | null;
  city2_name: string | null;
  notes: string | null;
}
interface AuditCheckItem { label: string; done: boolean; order: number }
interface AuditTrip {
  id: string;
  name: string;
  start: string;
  end: string;
  cities: { name: string; country: string; color_token: string; lat: number; lng: number }[];
  days: AuditDay[];
  flights: AuditFlight[];
  hotels: { name: string; city_name: string; check_in: string; check_out: string; nightly_rate: number; total_cost: number; currency: string; address: string | null; booking_ref: string | null; notes: string | null }[];
  transports: { mode: string; provider: string; origin: string; destination: string; date: string; dep_time: string | null; arr_time: string | null; cost: number; currency: string; booking_ref: string | null; train_number: string | null; car_model: string | null; seats: string | null; extras: string | null; duration: string | null }[];
  expenses: { date: string; category: string; description: string; cost: number; currency: string }[];
  trip_note: string | null;
  checklist: AuditCheckItem[];
}

async function supabaseSignIn(password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: SUPABASE_EMAIL, password }),
  });
  if (!res.ok) throw new Error(`Auth fallida (${res.status}). Verificá tu contraseña.`);
  const data = await res.json();
  return data.access_token as string;
}

async function sbFetch<T>(token: string, table: string, qs = ""): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*${qs ? `&${qs}` : ""}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Fetch ${table} fallido (${res.status})`);
  return res.json();
}

async function fetchFullAudit(token: string): Promise<AuditTrip[]> {
  const rawTrips = await sbFetch<{ id: string; name: string; start_date: string; end_date: string }>(token, "trips", "order=start_date.asc");
  const result: AuditTrip[] = [];

  for (const t of rawTrips) {
    const [rawCities, rawFlights, rawHotels, rawTransports, rawExpenses, rawDays, rawNotes, rawChecklist] =
      await Promise.all([
        sbFetch<{ id: string; name: string; country: string; lat: number; lng: number; color_token: string }>(token, "cities", `trip_id=eq.${t.id}`),
        sbFetch<{ id: string; airline: string; flight_number: string; depart_date: string; depart_time: string | null; arrive_date: string | null; arrive_time: string | null; origin_city: string; destination_city: string; cost: number; currency: string; booking_ref: string | null; notes: string | null }>(token, "flights", `trip_id=eq.${t.id}&order=depart_date.asc`),
        sbFetch<{ city_id: string | null; name: string; check_in: string; check_out: string; nightly_rate: number; total_cost: number; currency: string; address: string | null; booking_ref: string | null; notes: string | null }>(token, "hotels", `trip_id=eq.${t.id}&order=check_in.asc`),
        sbFetch<{ mode: string; provider: string | null; origin_city: string; destination_city: string; start_date: string; departure_time: string | null; arrival_time: string | null; cost: number; currency: string; booking_ref: string | null; train_number: string | null; car_model: string | null; seats: string | null; extras: string | null; travel_duration: string | null }>(token, "transports", `trip_id=eq.${t.id}&order=start_date.asc`),
        sbFetch<{ date: string; category: string; description: string; cost: number; currency: string }>(token, "expenses", `trip_id=eq.${t.id}&order=date.asc`),
        sbFetch<{ date: string; city_id: string | null; city_id_2: string | null; notes: string | null; in_range: boolean }>(token, "trip_days", `trip_id=eq.${t.id}&order=date.asc`),
        sbFetch<{ content: string }>(token, "trip_notes", `trip_id=eq.${t.id}`),
        sbFetch<{ label: string; is_done: boolean; sort_order: number }>(token, "trip_checklist_items", `trip_id=eq.${t.id}&order=sort_order.asc`),
      ]);

    const cityIdToName: Record<string, string> = {};
    for (const c of rawCities) cityIdToName[c.id] = c.name;

    // Fetch flight legs per flight
    const flightsWithLegs: AuditFlight[] = [];
    for (const f of rawFlights) {
      const legs = await sbFetch<{ leg_order: number; flight_number: string | null; origin_city: string; destination_city: string; depart_date: string; depart_time: string | null; arrive_date: string | null; arrive_time: string | null; seat: string | null; direction: string; depart_utc_offset: number | null; arrive_utc_offset: number | null }>(token, "flight_legs", `flight_id=eq.${f.id}&order=leg_order.asc`);
      flightsWithLegs.push({
        id: f.id,
        airline: f.airline ?? "",
        flight_number: f.flight_number ?? "",
        origin_city: f.origin_city ?? "",
        destination_city: f.destination_city ?? "",
        depart_date: f.depart_date,
        depart_time: f.depart_time,
        arrive_date: f.arrive_date,
        arrive_time: f.arrive_time,
        cost: f.cost ?? 0,
        currency: f.currency ?? "USD",
        booking_ref: f.booking_ref,
        notes: f.notes,
        legs: legs.map((l) => ({
          leg_order: l.leg_order,
          flight_number: l.flight_number,
          origin: l.origin_city,
          destination: l.destination_city,
          depart_date: l.depart_date,
          depart_time: l.depart_time,
          arrive_date: l.arrive_date,
          arrive_time: l.arrive_time,
          seat: l.seat,
          direction: l.direction,
          depart_utc_offset: l.depart_utc_offset,
          arrive_utc_offset: l.arrive_utc_offset,
        })),
      });
    }

    result.push({
      id: t.id,
      name: t.name,
      start: t.start_date,
      end: t.end_date,
      cities: rawCities.map((c) => ({ name: c.name, country: c.country, lat: c.lat ?? 0, lng: c.lng ?? 0, color_token: c.color_token ?? "city-1" })),
      days: rawDays.filter((d) => d.in_range).map((d) => ({
        date: d.date,
        city_name: d.city_id ? (cityIdToName[d.city_id] ?? null) : null,
        city2_name: d.city_id_2 ? (cityIdToName[d.city_id_2] ?? null) : null,
        notes: d.notes,
      })),
      flights: flightsWithLegs,
      hotels: rawHotels.map((h) => ({
        name: h.name ?? "",
        city_name: h.city_id ? (cityIdToName[h.city_id] ?? "") : "",
        check_in: h.check_in,
        check_out: h.check_out,
        nightly_rate: h.nightly_rate ?? 0,
        total_cost: h.total_cost ?? 0,
        currency: h.currency ?? "USD",
        address: h.address,
        booking_ref: h.booking_ref,
        notes: h.notes,
      })),
      transports: rawTransports.map((tr) => ({
        mode: tr.mode ?? "other",
        provider: tr.provider ?? "",
        origin: tr.origin_city ?? "",
        destination: tr.destination_city ?? "",
        date: tr.start_date,
        dep_time: tr.departure_time,
        arr_time: tr.arrival_time,
        cost: tr.cost ?? 0,
        currency: tr.currency ?? "USD",
        booking_ref: tr.booking_ref,
        train_number: tr.train_number,
        car_model: tr.car_model,
        seats: tr.seats,
        extras: tr.extras,
        duration: tr.travel_duration,
      })),
      expenses: rawExpenses.map((e) => ({ date: e.date, category: e.category ?? "", description: e.description ?? "", cost: e.cost ?? 0, currency: e.currency ?? "USD" })),
      trip_note: rawNotes[0]?.content ?? null,
      checklist: rawChecklist.map((c) => ({ label: c.label, done: c.is_done, order: c.sort_order })),
    });
  }

  return result;
}

// Convert AuditTrip → TripDef for migration (uses legs as individual flights when available)
function auditToTripDef(a: AuditTrip): TripDef {
  const dayMap: Record<string, string> = {};
  const dayMap2: Record<string, string> = {};
  for (const d of a.days) {
    if (d.city_name) dayMap[d.date] = d.city_name;
    if (d.city2_name) dayMap2[d.date] = d.city2_name;
  }

  // Expand legs into individual flights when legs exist
  const flights: TripDef["flights"] = [];
  for (const f of a.flights) {
    if (f.legs.length > 0) {
      for (const leg of f.legs) {
        flights.push({
          airline: f.airline,
          flight_number: leg.flight_number ?? f.flight_number,
          depart_date: leg.depart_date,
          depart_time: leg.depart_time ?? "00:00",
          arrive_date: leg.arrive_date ?? leg.depart_date,
          arrive_time: leg.arrive_time ?? "00:00",
          origin_city: leg.origin,
          destination_city: leg.destination,
          cost: leg.leg_order === 1 ? f.cost : 0, // cost only on first leg
          currency: f.currency,
          notes: [
            f.booking_ref ? `Ref: ${f.booking_ref}` : null,
            leg.seat ? `Asiento: ${leg.seat}` : null,
            leg.direction === "return" ? "Vuelta" : null,
            f.notes,
          ].filter(Boolean).join(" · ") || undefined,
        });
      }
    } else {
      flights.push({
        airline: f.airline,
        flight_number: f.flight_number,
        depart_date: f.depart_date,
        depart_time: f.depart_time ?? "00:00",
        arrive_date: f.arrive_date ?? f.depart_date,
        arrive_time: f.arrive_time ?? "00:00",
        origin_city: f.origin_city,
        destination_city: f.destination_city,
        cost: f.cost,
        currency: f.currency,
        notes: [f.booking_ref ? `Ref: ${f.booking_ref}` : null, f.notes].filter(Boolean).join(" · ") || undefined,
      });
    }
  }

  return {
    name: a.name,
    start: a.start,
    end: a.end,
    status: "past",
    cities: a.cities,
    dayMap,
    dayMap2,
    flights,
    hotels: a.hotels,
    transports: a.transports.map((tr) => ({
      mode: tr.mode,
      provider: tr.provider,
      origin_city: tr.origin,
      destination_city: tr.destination,
      start_date: tr.date,
      departure_time: tr.dep_time,
      arrival_time: tr.arr_time,
      cost: tr.cost,
      currency: tr.currency,
      booking_ref: tr.booking_ref,
      train_number: tr.train_number,
      car_model: tr.car_model,
      seats: tr.seats,
      extras: tr.extras,
      travel_duration: tr.duration,
    })),
    expenses: a.expenses,
  };
}

// Migrate one AuditTrip — also saves trip_note and day notes
async function migrateAuditTrip(uid: string, audit: AuditTrip, log: (e: LogEntry) => void) {
  const def = auditToTripDef(audit);
  const db = getFirebaseDb();

  // Build total_usd
  const totalUsd = [
    ...audit.flights.map((f) => toUSD(f.cost, f.currency)),
    ...audit.hotels.map((h) => toUSD(h.total_cost, h.currency)),
    ...audit.transports.map((t) => toUSD(t.cost, t.currency)),
    ...audit.expenses.map((e) => toUSD(e.cost, e.currency)),
  ].reduce((a, b) => a + b, 0);

  const tripPayload: Record<string, unknown> = {
    name: def.name,
    start_date: def.start,
    end_date: def.end,
    total_usd: Math.round(totalUsd),
    cities_count: def.cities.length,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  if (audit.trip_note) tripPayload.notes = audit.trip_note;

  const tripRef = await addDoc(collection(db, "users", uid, "trips"), tripPayload);
  const tripId = tripRef.id;
  log({ msg: `✓ Trip "${def.name}" → ${tripId}`, ok: true });

  // Cities
  const cityIdMap: Record<string, string> = {};
  const dm2 = def.dayMap2 ?? {};
  for (const c of def.cities) {
    const tz = CITY_TIMEZONES[c.name] ?? "UTC";
    // A date belongs to a city if it's the primary city OR the secondary city (transition days)
    const primaryDays = Object.entries(def.dayMap).filter(([, name]) => name === c.name).map(([d]) => d);
    const secondaryDays = Object.entries(dm2).filter(([, name]) => name === c.name).map(([d]) => d).filter((d) => !primaryDays.includes(d));
    const days = [...primaryDays, ...secondaryDays].sort();
    const ref = await addDoc(collection(db, "users", uid, "trips", tripId, "cities"), {
      trip_id: tripId, name: c.name, country: c.country, lat: c.lat, lng: c.lng,
      color: colorFromToken(c.color_token), timezone: tz, days,
    });
    cityIdMap[c.name] = ref.id;
  }
  log({ msg: `✓ ${def.cities.length} ciudades`, ok: true });

  // Trip days (with notes)
  const allDates = generateTripDates(def.start, def.end);
  const dayNoteMap: Record<string, string | null> = {};
  for (const d of audit.days) dayNoteMap[d.date] = d.notes;

  let transitionDayCount = 0;
  for (const date of allDates) {
    const cityName = def.dayMap[date] ?? null;
    const city2Name = dm2[date] ?? null;
    if (city2Name) transitionDayCount++;
    await setDoc(doc(db, "users", uid, "trips", tripId, "trip_days", date), {
      city_id: cityName ? (cityIdMap[cityName] ?? null) : null,
      city_id_2: city2Name ? (cityIdMap[city2Name] ?? null) : null,
      notes: dayNoteMap[date] ?? null,
    });
  }
  const noteCount = Object.values(dayNoteMap).filter(Boolean).length;
  log({ msg: `✓ ${allDates.length} días${transitionDayCount ? ` (${transitionDayCount} de transición)` : ""}${noteCount ? ` (${noteCount} con notas)` : ""}`, ok: true });

  // Flights
  for (const f of def.flights) {
    const originIata = extractIATA(f.origin_city);
    const destIata = extractIATA(f.destination_city);
    const depTz = getTimezone(f.origin_city, originIata);
    const arrTz = getTimezone(f.destination_city, destIata);
    const depLocal = toLocalDatetime(f.depart_date, f.depart_time);
    const arrLocal = toLocalDatetime(f.arrive_date ?? f.depart_date, f.arrive_time);
    const fd: Record<string, unknown> = {
      trip_id: tripId, airline: f.airline, flight_number: f.flight_number,
      origin_iata: originIata ?? f.origin_city, destination_iata: destIata ?? f.destination_city,
      departure_local_time: depLocal, departure_timezone: depTz, departure_utc: localToTimestamp(depLocal, depTz),
      arrival_local_time: arrLocal, arrival_timezone: arrTz, arrival_utc: localToTimestamp(arrLocal, arrTz),
      duration_minutes: durationMinutes(depLocal, depTz, arrLocal, arrTz),
      price: f.cost || null, currency: f.currency, price_usd: toUSD(f.cost, f.currency),
    };
    if (f.notes) fd.notes = f.notes;
    await addDoc(collection(db, "users", uid, "trips", tripId, "flights"), fd);
  }
  if (def.flights.length) log({ msg: `✓ ${def.flights.length} vuelos${audit.flights.some((f) => f.legs.length) ? " (legs expandidos)" : ""}`, ok: true });

  // Hotels
  for (const h of def.hotels) {
    const hd: Record<string, unknown> = {
      trip_id: tripId, city_id: cityIdMap[h.city_name] ?? null,
      name: h.name, check_in: h.check_in, check_out: h.check_out,
      currency: h.currency, total_price_usd: toUSD(h.total_cost, h.currency),
    };
    if (h.nightly_rate) hd.price_per_night = h.nightly_rate;
    if (h.address) hd.address = h.address;
    if (h.booking_ref) hd.booking_ref = h.booking_ref;
    if (h.notes) hd.notes = h.notes;
    await addDoc(collection(db, "users", uid, "trips", tripId, "hotels"), hd);
  }
  if (def.hotels.length) log({ msg: `✓ ${def.hotels.length} hoteles`, ok: true });

  // Transports
  for (const t of def.transports) {
    const depLocal = toLocalDatetime(t.start_date, t.departure_time ?? null);
    const depTz = getTimezone(t.origin_city, extractIATA(t.origin_city));
    const td: Record<string, unknown> = {
      trip_id: tripId, type: mapMode(t.mode), origin: t.origin_city, destination: t.destination_city,
      departure_local_time: depLocal, departure_timezone: depTz, departure_utc: localToTimestamp(depLocal, depTz),
      operator: t.provider, price: t.cost || null, currency: t.currency, price_usd: toUSD(t.cost, t.currency),
    };
    if (t.arrival_time) {
      const arrLocal = toLocalDatetime(t.start_date, t.arrival_time);
      const arrTz = getTimezone(t.destination_city, extractIATA(t.destination_city));
      td.arrival_local_time = arrLocal;
      td.arrival_timezone = arrTz;
      td.arrival_utc = localToTimestamp(arrLocal, arrTz);
    }
    if (t.booking_ref) td.booking_ref = t.booking_ref;
    const noteParts = [t.train_number && `Tren: ${t.train_number}`, t.car_model && `Auto: ${t.car_model}`, t.seats && `Asientos: ${t.seats}`, t.extras, t.travel_duration && `Duración: ${t.travel_duration}`].filter(Boolean);
    if (noteParts.length) td.notes = noteParts.join(" · ");
    await addDoc(collection(db, "users", uid, "trips", tripId, "transports"), td);
  }
  if (def.transports.length) log({ msg: `✓ ${def.transports.length} transportes`, ok: true });

  // Expenses
  const catMap: Record<string, string> = { Transport: "transport", Food: "food", Shopping: "shopping", Activities: "activity", Insurance: "other", General: "other" };
  for (const e of def.expenses) {
    await addDoc(collection(db, "users", uid, "trips", tripId, "expenses"), {
      trip_id: tripId, title: e.description, amount: e.cost, currency: e.currency,
      amount_usd: toUSD(e.cost, e.currency), date: e.date, category: catMap[e.category] ?? "other",
    });
  }
  if (def.expenses.length) log({ msg: `✓ ${def.expenses.length} gastos`, ok: true });

  // Checklist items
  if (audit.checklist.length) {
    for (const item of audit.checklist) {
      await addDoc(collection(db, "users", uid, "trips", tripId, "checklist_items"), {
        label: item.label, is_done: item.done, sort_order: item.order,
      });
    }
    log({ msg: `✓ ${audit.checklist.length} checklist items`, ok: true });
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

type PageMode = "idle" | "loading" | "audit" | "migrating" | "done" | "error";

function AuditTripCard({ t }: { t: AuditTrip }) {
  const [open, setOpen] = useState(false);
  const totalLegs = t.flights.reduce((s, f) => s + f.legs.length, 0);
  const daysWithNotes = t.days.filter((d) => d.notes).length;

  return (
    <div className="rounded-[14px] overflow-hidden" style={{ border: "1px solid #262626" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1A1A1A] transition-colors"
        style={{ background: "#161616" }}
      >
        <div>
          <p className="text-white text-[14px] font-semibold">{t.name}</p>
          <p className="text-[#707070] text-[12px] mt-0.5">{t.start} – {t.end} · {t.cities.length} ciudades</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-[11px] text-[#4D4D4D] font-mono">
            <p>{t.flights.length}✈ {t.hotels.length}🏨 {t.transports.length}🚆</p>
            <p>{t.expenses.length} gastos{t.checklist.length ? ` · ${t.checklist.length} tasks` : ""}</p>
          </div>
          <span className="text-[#4D4D4D] text-[16px]">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3 font-mono text-[11px]" style={{ background: "#0D0D0D" }}>
          {/* Cities */}
          <Section label="📍 Ciudades">
            {t.cities.map((c) => <Row key={c.name} text={`${c.name}, ${c.country} [${c.color_token}]`} />)}
          </Section>

          {/* Days with notes */}
          {daysWithNotes > 0 && (
            <Section label={`📅 Días con notas (${daysWithNotes})`}>
              {t.days.filter((d) => d.notes).map((d) => (
                <Row key={d.date} text={`${d.date}: "${d.notes}"`} dim />
              ))}
            </Section>
          )}

          {/* Days with dual cities */}
          {t.days.some((d) => d.city2_name) && (
            <Section label="📅 Días con 2 ciudades">
              {t.days.filter((d) => d.city2_name).map((d) => (
                <Row key={d.date} text={`${d.date}: ${d.city_name} + ${d.city2_name}`} warn />
              ))}
            </Section>
          )}

          {/* Flights */}
          {t.flights.length > 0 && (
            <Section label={`✈️ Vuelos (${t.flights.length} bookings, ${totalLegs} legs)`}>
              {t.flights.map((f, i) => (
                <div key={i} className="mb-2">
                  <Row text={`${f.flight_number} ${f.origin_city}→${f.destination_city} · ${f.depart_date}${f.booking_ref ? ` · ref:${f.booking_ref}` : ""}${f.cost ? ` · ${f.currency} ${f.cost}` : ""}`} />
                  {f.notes && <Row text={`  nota: ${f.notes}`} dim />}
                  {f.legs.map((l) => (
                    <Row key={l.leg_order} text={`  leg${l.leg_order} [${l.direction}] ${l.flight_number ?? "?"} ${l.origin}→${l.destination} · ${l.depart_date} ${l.depart_time ?? ""}${l.seat ? ` · asiento:${l.seat}` : ""}`} ok />
                  ))}
                  {f.legs.length === 0 && <Row text="  (sin legs)" dim />}
                </div>
              ))}
            </Section>
          )}

          {/* Hotels */}
          {t.hotels.length > 0 && (
            <Section label={`🏨 Hoteles (${t.hotels.length})`}>
              {t.hotels.map((h, i) => (
                <div key={i}>
                  <Row text={`${h.name} · ${h.city_name} · ${h.check_in}→${h.check_out}${h.booking_ref ? ` · ref:${h.booking_ref}` : ""}${h.total_cost ? ` · ${h.currency} ${h.total_cost}` : ""}`} />
                  {h.address && <Row text={`  dir: ${h.address}`} dim />}
                  {h.notes && <Row text={`  nota: ${h.notes}`} dim />}
                </div>
              ))}
            </Section>
          )}

          {/* Transports */}
          {t.transports.length > 0 && (
            <Section label={`🚆 Transportes (${t.transports.length})`}>
              {t.transports.map((tr, i) => (
                <div key={i}>
                  <Row text={`[${tr.mode}] ${tr.provider} · ${tr.origin}→${tr.destination} · ${tr.date}${tr.dep_time ? ` ${tr.dep_time}` : ""}${tr.booking_ref ? ` · ref:${tr.booking_ref}` : ""}${tr.cost ? ` · ${tr.currency} ${tr.cost}` : ""}`} />
                  {[tr.train_number && `tren:${tr.train_number}`, tr.car_model && `auto:${tr.car_model}`, tr.seats && `asientos:${tr.seats}`, tr.extras, tr.duration].filter(Boolean).map((d, j) => <Row key={j} text={`  ${d}`} dim />)}
                </div>
              ))}
            </Section>
          )}

          {/* Expenses */}
          {t.expenses.length > 0 && (
            <Section label={`💰 Gastos (${t.expenses.length})`}>
              {t.expenses.map((e, i) => <Row key={i} text={`${e.date} · ${e.category} · ${e.description} · ${e.currency} ${e.cost}`} />)}
            </Section>
          )}

          {/* Trip note */}
          {t.trip_note && (
            <Section label="📝 Nota del viaje">
              <p className="text-[#707070] whitespace-pre-wrap leading-relaxed">{t.trip_note.slice(0, 400)}{t.trip_note.length > 400 ? "…" : ""}</p>
            </Section>
          )}

          {/* Checklist */}
          {t.checklist.length > 0 && (
            <Section label={`✅ Checklist (${t.checklist.filter((c) => c.done).length}/${t.checklist.length} ✓)`}>
              {t.checklist.map((c, i) => <Row key={i} text={`${c.done ? "✓" : "□"} ${c.label}`} ok={c.done} dim={!c.done} />)}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[#4D96FF] mb-1 font-semibold">{label}</p>
      <div className="pl-2 space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ text, dim, ok, warn }: { text: string; dim?: boolean; ok?: boolean; warn?: boolean }) {
  const color = warn ? "#FF9F0A" : ok ? "#30D158" : dim ? "#4D4D4D" : "#A0A0A0";
  return <p style={{ color }}>{text}</p>;
}

export default function MigratePage() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<PageMode>("idle");
  const [audit, setAudit] = useState<AuditTrip[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentTrip, setCurrentTrip] = useState<string | null>(null);

  function addLog(e: LogEntry) { setLogs((p) => [...p, e]); }

  async function runAudit() {
    if (!password.trim()) return;
    setMode("loading");
    setLogs([{ msg: "Conectando a Supabase…", ok: true }]);
    try {
      const token = await supabaseSignIn(password.trim());
      addLog({ msg: "✓ Autenticado", ok: true });
      addLog({ msg: "Descargando todos los datos (incluye legs, notas, checklists)…", ok: true });
      const data = await fetchFullAudit(token);
      const totalLegs = data.reduce((s, t) => s + t.flights.reduce((s2, f) => s2 + f.legs.length, 0), 0);
      addLog({ msg: `✓ ${data.length} viajes · ${data.reduce((s, t) => s + t.flights.length, 0)} vuelos · ${totalLegs} legs · ${data.reduce((s, t) => s + t.hotels.length, 0)} hoteles`, ok: true });
      addLog({ msg: `  ${data.reduce((s, t) => s + (t.trip_note ? 1 : 0), 0)} notas de viaje · ${data.reduce((s, t) => s + t.checklist.length, 0)} checklist items`, ok: true });
      setAudit(data);
      setMode("audit");
    } catch (err) {
      addLog({ msg: `Error: ${err instanceof Error ? err.message : String(err)}`, ok: false });
      setMode("error");
    }
  }

  async function runMigration() {
    if (!user || !audit.length) return;
    setMode("migrating");
    setLogs([]);
    try {
      for (const t of audit) {
        setCurrentTrip(t.name);
        addLog({ msg: `━━━ ${t.name} ━━━`, ok: true });
        await migrateAuditTrip(user.uid, t, addLog);
      }
      addLog({ msg: `🎉 ${audit.length} viajes migrados a Firebase`, ok: true });
      setMode("done");
    } catch (err) {
      addLog({ msg: `Error: ${err instanceof Error ? err.message : String(err)}`, ok: false });
      setMode("error");
    } finally {
      setCurrentTrip(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-6 py-12 max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-[#BF5AF2] text-[11px] font-semibold uppercase tracking-widest mb-2">Dev Tool · Temporal</p>
        <h1 className="text-[30px] font-bold text-white tracking-tight">Migrar desde TripLog</h1>
      </div>

      {/* Firebase auth */}
      <div className="rounded-[12px] px-4 py-3 mb-5 flex items-center gap-3" style={{ background: user ? "#30D15812" : "#FF453A12", border: `1px solid ${user ? "#30D15830" : "#FF453A30"}` }}>
        <span>{user ? "✓" : "✗"}</span>
        <p className="text-[13px] font-semibold" style={{ color: user ? "#30D158" : "#FF453A" }}>
          Firebase: {user ? `autenticado (${user.uid.slice(0, 8)}…)` : "no autenticado — "}
          {!user && <a href="/auth" className="text-[#0A84FF] underline ml-1">Iniciar sesión</a>}
        </p>
      </div>

      {/* Password + audit button */}
      {(mode === "idle" || mode === "error") && user && (
        <div className="space-y-3 mb-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runAudit()}
            placeholder="Contraseña de TripLog (matiasferracani@gmail.com)"
            className="w-full bg-[#161616] border border-[#333] rounded-[12px] px-4 py-3 text-white text-[14px] placeholder-[#4D4D4D] outline-none focus:border-[#BF5AF2] transition-colors"
          />
          <button onClick={runAudit} disabled={!password.trim()} className="w-full py-3 rounded-[12px] text-[14px] font-semibold text-white disabled:opacity-40" style={{ background: "linear-gradient(135deg, #0A84FF, #0A6BE0)" }}>
            Auditar datos completos →
          </button>
        </div>
      )}

      {/* Loading log */}
      {(mode === "loading" || mode === "error" || mode === "migrating") && logs.length > 0 && (
        <div className="rounded-[12px] p-4 font-mono text-[11px] space-y-1 mb-5" style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}>
          {currentTrip && <p className="text-[#BF5AF2]">⟳ Procesando {currentTrip}…</p>}
          {logs.map((l, i) => (
            <p key={i} style={{ color: l.ok ? (l.msg.startsWith("━") ? "#4D96FF" : "#A0A0A0") : "#FF453A" }}>{l.msg}</p>
          ))}
        </div>
      )}

      {/* Audit view */}
      {mode === "audit" && (
        <>
          {/* Summary log */}
          {logs.length > 0 && (
            <div className="rounded-[12px] p-3 font-mono text-[11px] space-y-0.5 mb-5" style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}>
              {logs.map((l, i) => <p key={i} className="text-[#707070]">{l.msg}</p>)}
            </div>
          )}

          {/* Per-trip cards */}
          <div className="space-y-2 mb-6">
            {audit.map((t) => <AuditTripCard key={t.id} t={t} />)}
          </div>

          {/* Transition days info */}
          {audit.some((t) => t.days.some((d) => d.city2_name)) && (
            <div className="rounded-[12px] px-4 py-3 mb-5" style={{ background: "#30D15812", border: "1px solid #30D15830" }}>
              <p className="text-[#30D158] text-[12px] font-semibold">✓ Días de transición soportados</p>
              <p className="text-[#707070] text-[11px] mt-1">Los días con 2 ciudades se migrarán con city_id y city_id_2. Ambas ciudades incluirán ese día en su array de días.</p>
            </div>
          )}

          <button onClick={runMigration} className="w-full py-4 rounded-[14px] text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)", boxShadow: "0 4px 20px rgba(191,90,242,0.3)" }}>
            Migrar {audit.length} viajes a Firebase →
          </button>
          <button onClick={() => { setMode("idle"); setAudit([]); setLogs([]); }} className="w-full mt-2 py-2.5 rounded-[12px] text-[13px] text-[#707070] hover:text-white transition-colors">
            ← Volver
          </button>
        </>
      )}

      {/* Done */}
      {mode === "done" && (
        <>
          <div className="rounded-[12px] p-4 font-mono text-[11px] space-y-0.5 mb-5" style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}>
            {logs.map((l, i) => <p key={i} style={{ color: l.ok ? (l.msg.startsWith("━") ? "#4D96FF" : "#A0A0A0") : "#FF453A" }}>{l.msg}</p>)}
          </div>
          <div className="rounded-[14px] p-5 text-center" style={{ background: "#30D15812", border: "1px solid #30D15830" }}>
            <p className="text-[28px] mb-2">🎉</p>
            <p className="text-[#30D158] text-[15px] font-semibold">Migración completa</p>
            <p className="text-[#707070] text-[12px] mt-1">{audit.length} viajes importados con todos los campos.</p>
            <a href="/" className="inline-block mt-4 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white" style={{ background: "#30D158" }}>
              Ir al Dashboard →
            </a>
          </div>
        </>
      )}
    </div>
  );
}
