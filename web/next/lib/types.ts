import { Timestamp } from "firebase/firestore";

export interface Trip {
  id: string;
  name: string;
  start_date: string; // "2026-03-15"
  end_date: string;
  cover_url?: string;
  total_usd: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface City {
  id: string;
  trip_id: string;
  name: string;
  lat: number;
  lng: number;
  color: string; // hex from CITY_COLORS palette
  timezone: string; // IANA
  days: string[]; // ["2026-03-15", "2026-03-16"]
}

export interface Flight {
  id: string;
  trip_id: string;
  airline: string;
  flight_number: string;
  origin_iata: string;
  destination_iata: string;
  departure_local_time: string; // "2026-03-15T21:35"
  departure_timezone: string;
  departure_utc: Timestamp;
  arrival_local_time: string;
  arrival_timezone: string;
  arrival_utc: Timestamp;
  duration_minutes: number;
  cabin_class?: string;
  seat?: string;
  booking_ref?: string;
  price?: number;
  currency?: string;
  price_usd?: number;
}

export interface Hotel {
  id: string;
  trip_id: string;
  city_id: string;
  name: string;
  brand?: string;
  check_in: string; // "2026-03-16"
  check_out: string;
  room_type?: string;
  booking_ref?: string;
  price_per_night?: number;
  currency?: string;
  total_price_usd?: number;
}

export interface Transport {
  id: string;
  trip_id: string;
  type: "train" | "bus" | "ferry" | "car" | "taxi" | "subway" | "other";
  origin: string;
  destination: string;
  departure_local_time: string;
  departure_timezone: string;
  departure_utc: Timestamp;
  arrival_local_time?: string;
  arrival_timezone?: string;
  arrival_utc?: Timestamp;
  operator?: string;
  booking_ref?: string;
  price?: number;
  currency?: string;
  price_usd?: number;
}

export interface ParseJob {
  id: string;
  trip_id: string;
  mode: "chat" | "file";
  provider: "claude" | "gemini";
  status: "pending" | "processing" | "done" | "error";
  raw_input?: string;
  parsed_items: ParsedItem[];
  created_at: Timestamp;
}

export interface ParsedItem {
  type: "flight" | "hotel" | "transport";
  confidence: number;
  data: Partial<Flight> | Partial<Hotel> | Partial<Transport>;
}

// Design system constants
export const CITY_COLORS = [
  "#FF6B6B", // coral
  "#4ECDC4", // turquesa
  "#FFD93D", // amarillo
  "#95E1D3", // menta
  "#C77DFF", // lavanda
  "#FF8FA3", // rosa salmón
  "#6BCB77", // verde fresco
  "#4D96FF", // azul eléctrico
];
