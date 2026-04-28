import { useMemo } from "react";
import type { Trip, City, Flight } from "./types";

export interface TravelStats {
  countries: number;
  cities: number;
  flights: number;
  days: number;
  hotelNights: number;
  kmTraveled: number;
  countryMarkers: Array<{ location: [number, number]; size: number }>;
}

// Approximate representative coordinates for the top 50 travel countries
const COUNTRY_COORDS: Record<string, [number, number]> = {
  AR: [-34.6, -58.4],
  ES: [40.4, -3.7],
  FR: [48.8, 2.3],
  IT: [41.9, 12.5],
  US: [37.1, -95.7],
  BR: [-15.8, -47.9],
  DE: [52.5, 13.4],
  GB: [51.5, -0.1],
  JP: [35.7, 139.7],
  AU: [-35.3, 149.1],
  MX: [19.4, -99.1],
  PT: [38.7, -9.1],
  CL: [-33.4, -70.6],
  CO: [4.7, -74.1],
  PE: [-12.0, -77.0],
  UY: [-34.9, -56.2],
  CA: [45.4, -75.7],
  CN: [39.9, 116.4],
  TH: [13.8, 100.5],
  NL: [52.4, 4.9],
  GR: [37.9, 23.7],
  HR: [45.8, 16.0],
  CZ: [50.1, 14.4],
  AT: [48.2, 16.4],
  CH: [46.9, 7.4],
  BE: [50.8, 4.4],
  SE: [59.3, 18.1],
  NO: [59.9, 10.7],
  DK: [55.7, 12.6],
  PL: [52.2, 21.0],
  HU: [47.5, 19.0],
  RO: [44.4, 26.1],
  TR: [39.9, 32.9],
  EG: [30.1, 31.2],
  MA: [33.9, -6.9],
  ZA: [-25.7, 28.2],
  KE: [-1.3, 36.8],
  IN: [28.6, 77.2],
  SG: [1.4, 103.8],
  ID: [-6.2, 106.8],
  NZ: [-41.3, 174.8],
  IS: [64.1, -21.9],
  IE: [53.3, -6.3],
  FI: [60.2, 24.9],
  SK: [48.1, 17.1],
  SI: [46.1, 14.5],
  BA: [43.8, 18.4],
  RS: [44.8, 20.5],
  ME: [42.4, 19.3],
  MK: [42.0, 21.4],
  AL: [41.3, 19.8],
  CU: [23.1, -82.4],
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface AirportCoords {
  iata: string;
  lat: number;
  lng: number;
}

interface StatsInput {
  trips: Trip[];
  cities: City[];
  flights: Flight[];
  hotelNights: number;
  airportCoords?: AirportCoords[];
}

export function useStatsData({
  trips,
  cities,
  flights,
  hotelNights,
  airportCoords = [],
}: StatsInput): TravelStats {
  return useMemo(() => {
    // Countries: unique country_code across all cities
    const countryCodes = new Set<string>();
    cities.forEach((c) => {
      if (c.country_code) countryCodes.add(c.country_code.toUpperCase());
    });

    // Cities: unique names (case-insensitive)
    const cityNames = new Set(cities.map((c) => c.name.toLowerCase().trim()));

    // Days: sum of trip durations (non-draft)
    let totalDays = 0;
    for (const trip of trips) {
      if (trip.status === "draft") continue;
      if (!trip.start_date || !trip.end_date) continue;
      const start = new Date(trip.start_date + "T00:00:00");
      const end = new Date(trip.end_date + "T00:00:00");
      const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
      if (diff > 0) totalDays += diff;
    }

    // km traveled: haversine per flight leg using airport coords lookup
    const coordsMap = new Map<string, { lat: number; lng: number }>();
    airportCoords.forEach((ap) => coordsMap.set(ap.iata.toUpperCase(), { lat: ap.lat, lng: ap.lng }));

    let kmTraveled = 0;
    for (const flight of flights) {
      const origin = coordsMap.get(flight.origin_iata?.toUpperCase() ?? "");
      const dest = coordsMap.get(flight.destination_iata?.toUpperCase() ?? "");
      if (origin && dest) {
        kmTraveled += haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
      }
    }

    // Country markers for the globe
    const countryMarkers: Array<{ location: [number, number]; size: number }> = [];
    countryCodes.forEach((code) => {
      const coords = COUNTRY_COORDS[code];
      if (coords) {
        countryMarkers.push({ location: coords, size: 0.05 });
      }
    });

    return {
      countries: countryCodes.size,
      cities: cityNames.size,
      flights: flights.length,
      days: totalDays,
      hotelNights,
      kmTraveled: Math.round(kmTraveled),
      countryMarkers,
    };
  }, [trips, cities, flights, hotelNights, airportCoords]);
}
