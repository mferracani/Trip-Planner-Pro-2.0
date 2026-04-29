"use client";

import { Timestamp } from "firebase/firestore";
import { createTrip, updateTrip, createCity, createFlight, createHotel, createTransport } from "./firestore";
import { CITY_COLORS } from "./types";

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function createDemoTrip(uid: string): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tripStart = addDays(today, 90); // ~3 months from now
  const tripEnd   = addDays(today, 105);

  const tripId = await createTrip(uid, {
    name: "Europa · Demo",
    status: "planned",
    is_tentative_dates: false,
    start_date: fmt(tripStart),
    end_date:   fmt(tripEnd),
    cover_url: "/themes/paris.svg",
    total_usd: 0,
  });

  // Cities — sequential because hotel.city_id depends on these IDs
  const madridId = await createCity(uid, tripId, {
    trip_id: tripId,
    name: "Madrid",
    lat: 40.4168,
    lng: -3.7038,
    color: CITY_COLORS[0],
    timezone: "Europe/Madrid",
    country_code: "ES",
    days: [0, 1, 2, 3, 4].map((n) => fmt(addDays(tripStart, n))),
  });

  const parisId = await createCity(uid, tripId, {
    trip_id: tripId,
    name: "París",
    lat: 48.8566,
    lng: 2.3522,
    color: CITY_COLORS[1],
    timezone: "Europe/Paris",
    country_code: "FR",
    days: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((n) => fmt(addDays(tripStart, n))),
  });

  await updateTrip(uid, tripId, { cities_count: 2 });

  // Flight EZE → MAD (night before trip start)
  const flightDepDate = addDays(tripStart, -1);
  const depUTC = new Date(flightDepDate);
  depUTC.setUTCHours(1, 35, 0, 0); // 22:35 ART (UTC-3)
  const arrUTC = new Date(tripStart);
  arrUTC.setUTCHours(14, 30, 0, 0); // 16:30 CEST (UTC+2)

  await createFlight(uid, tripId, {
    trip_id: tripId,
    airline: "Iberia",
    flight_number: "IB6843",
    origin_iata: "EZE",
    destination_iata: "MAD",
    departure_local_time: `${fmt(flightDepDate)}T22:35`,
    departure_timezone: "America/Argentina/Buenos_Aires",
    departure_utc: Timestamp.fromDate(depUTC),
    arrival_local_time: `${fmt(tripStart)}T16:30`,
    arrival_timezone: "Europe/Madrid",
    arrival_utc: Timestamp.fromDate(arrUTC),
    duration_minutes: 775,
    cabin_class: "economy",
    booking_ref: "IBDEMO1",
    price_usd: 1050,
  });

  // Hotel Madrid
  await createHotel(uid, tripId, {
    trip_id: tripId,
    city_id: madridId,
    name: "Hotel Gran Vía 44",
    check_in:  fmt(tripStart),
    check_out: fmt(addDays(tripStart, 5)),
    room_type: "Doble Superior",
    booking_ref: "HMDEMO1",
    price_per_night: 180,
    currency: "EUR",
  });

  // Train Madrid → París
  const trainDate = addDays(tripStart, 5);
  const trainDepUTC = new Date(trainDate);
  trainDepUTC.setUTCHours(7, 30, 0, 0); // 09:30 CEST

  await createTransport(uid, tripId, {
    trip_id: tripId,
    type: "train",
    origin: "Madrid Atocha",
    destination: "Paris Gare de Lyon",
    departure_local_time: `${fmt(trainDate)}T09:30`,
    departure_timezone: "Europe/Madrid",
    departure_utc: Timestamp.fromDate(trainDepUTC),
    operator: "Renfe / SNCF",
    booking_ref: "TRDEMO1",
    price_usd: 130,
  });

  // Hotel París
  await createHotel(uid, tripId, {
    trip_id: tripId,
    city_id: parisId,
    name: "Hôtel Le Marais",
    check_in:  fmt(addDays(tripStart, 5)),
    check_out: fmt(tripEnd),
    room_type: "Chambre Supérieure",
    booking_ref: "HPDEMO1",
    price_per_night: 220,
    currency: "EUR",
  });

  return tripId;
}
