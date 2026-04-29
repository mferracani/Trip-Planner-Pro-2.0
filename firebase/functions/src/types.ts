import { Timestamp } from "firebase-admin/firestore";

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export interface User {
  display_name: string;
  email: string;
  avatar_url: string | null;
  created_at: Timestamp;
}

// ---------------------------------------------------------------------------
// Trip
// ---------------------------------------------------------------------------

export type TripStatus = "draft" | "planned" | "active" | "past";

export interface Trip {
  name: string;
  start_date: string;       // "2026-03-15"
  end_date: string;         // "2026-03-20"
  status: TripStatus | null;
  cover_url: string | null;
  fx_eur_usd_fixed_rate: number | null;
  cover_image_credit: string | null;
  updated_at: Timestamp | null;
  total_usd: number | null;
  cities_count: number | null;
  created_at: Timestamp;
}

// ---------------------------------------------------------------------------
// City (subcollection of trip)
// ---------------------------------------------------------------------------

export interface City {
  trip_id: string | null;
  name: string;
  country: string | null;
  country_code: string | null;
  color: string | null;     // hex string e.g. "#4D96FF"
  days: string[];           // "YYYY-MM-DD" dates this city occupies in the trip
  lat: number | null;
  lng: number | null;
  timezone: string | null;  // IANA tz string, e.g. "Europe/Madrid"
}

// ---------------------------------------------------------------------------
// TripDay (subcollection of trip, document ID = "2026-03-15")
// ---------------------------------------------------------------------------

export interface TripDay {
  city_id: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Flight (subcollection of trip)
// Timezone rule: each temporal point has THREE fields (local, tz, utc).
// duration_minutes is always calculated server-side with Luxon.
// ---------------------------------------------------------------------------

export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export interface Flight {
  trip_id: string | null;
  airline: string | null;
  flight_number: string | null;
  origin_iata: string | null;       // IATA code, e.g. "EZE"
  destination_iata: string | null;
  departure_local_time: string | null; // "2026-03-15T21:35" — for display
  departure_timezone: string | null;   // IANA, e.g. "America/Argentina/Buenos_Aires"
  departure_utc: Timestamp | null;     // UTC timestamp — for sorting & duration
  arrival_local_time: string | null;
  arrival_timezone: string | null;
  arrival_utc: Timestamp | null;
  duration_minutes: number | null;  // calculated at write time, never on client
  cabin_class: CabinClass | null;
  seat: string | null;
  booking_ref: string | null;
  price: number | null;
  currency: string | null;          // ISO 4217, e.g. "USD"
  price_usd: number | null;
  paid_amount: number | null;
  notes: string | null;
  parse_job_id: string | null;
  // Flight tracking fields (v1.1 — populated by trackFlights function)
  current_status: string | null;
  current_gate_departure: string | null;
  current_gate_arrival: string | null;
  current_terminal_departure: string | null;
  current_terminal_arrival: string | null;
  estimated_departure_utc: Timestamp | null;
  estimated_arrival_utc: Timestamp | null;
  last_tracking_update: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Hotel (subcollection of trip)
// ---------------------------------------------------------------------------

export interface Hotel {
  trip_id: string | null;
  name: string | null;
  brand: string | null;
  chain: string | null;
  address: string | null;
  city_id: string | null;
  check_in: string | null;          // "2026-03-15"
  check_out: string | null;         // "2026-03-20"
  room_type: string | null;
  booking_ref: string | null;
  price_per_night: number | null;
  total_price: number | null;
  currency: string | null;
  total_price_usd: number | null;
  paid_amount: number | null;
  notes: string | null;
  parse_job_id: string | null;
}

// ---------------------------------------------------------------------------
// Transport (subcollection of trip)
// Same timezone-aware pattern as flights.
// ---------------------------------------------------------------------------

export type TransportMode = "bus" | "train" | "ferry" | "car" | "taxi" | "subway" | "other";

export interface Transport {
  trip_id: string | null;
  type: TransportMode | null;
  operator: string | null;
  origin: string | null;
  destination: string | null;
  departure_local_time: string | null;
  departure_timezone: string | null;
  departure_utc: Timestamp | null;
  arrival_local_time: string | null;
  arrival_timezone: string | null;
  arrival_utc: Timestamp | null;
  duration_minutes: number | null;
  booking_ref: string | null;
  price: number | null;
  currency: string | null;
  price_usd: number | null;
  paid_amount: number | null;
  notes: string | null;
  parse_job_id: string | null;
}

// ---------------------------------------------------------------------------
// Expense (subcollection of trip)
// ---------------------------------------------------------------------------

export interface Expense {
  trip_id: string | null;
  title: string;
  amount: number;
  currency: string;           // ISO 4217
  amount_usd: number | null;
  paid_amount: number | null;
  date: string;               // "YYYY-MM-DD"
  category: string;           // "flight" | "hotel" | "transport" | "food" | "activity" | "shopping" | "other"
  notes: string | null;
  linked_item_id: string | null;
  linked_item_type: string | null; // "flight" | "hotel" | "transport"
  created_at: Timestamp;
}

// ---------------------------------------------------------------------------
// ParseJob (subcollection of trip)
// ---------------------------------------------------------------------------

export type ParseJobStatus = "pending" | "processing" | "completed" | "error";
export type ParseInputType = "text" | "attachment";
export type ParseProvider = "claude" | "gemini";

export interface ParseJob {
  provider: ParseProvider;
  input_type: ParseInputType;
  input_text: string | null;            // raw input text (if text mode)
  attachment_storage_ref: string | null; // Storage path (if attachment mode)
  status: ParseJobStatus;
  error_message: string | null;
  raw_response: string | null;          // raw JSON string from AI provider
  parsed_items: ParsedItem[] | null;
  confidence_score: number | null;      // overall job confidence 0–1
  tokens_used: number | null;
  latency_ms: number | null;
  created_at: Timestamp;
}

// ---------------------------------------------------------------------------
// Parsed items returned by parseWithAI
// ---------------------------------------------------------------------------

export interface ParsedFlight {
  type: "flight";
  confidence: number; // 0–1
  airline: string | null;
  flight_number: string | null;
  origin_iata: string | null;
  destination_iata: string | null;
  departure_local_time: string | null; // "2026-03-15T21:35"
  departure_timezone: string | null;   // "America/Argentina/Buenos_Aires"
  arrival_local_time: string | null;
  arrival_timezone: string | null;
  booking_ref: string | null;
}

export interface ParsedHotel {
  type: "hotel";
  confidence: number;
  name: string | null;
  city: string | null; // free-text city name (not city_id) — for preview only
  check_in: string | null;  // "2026-03-15"
  check_out: string | null;
  booking_ref: string | null;
}

export interface ParsedTransport {
  type: "transport";
  confidence: number;
  mode: TransportMode | null;
  origin: string | null;
  destination: string | null;
  departure_local_time: string | null;
  departure_timezone: string | null;
  booking_ref: string | null;
}

export type ParsedItem = ParsedFlight | ParsedHotel | ParsedTransport;

// ---------------------------------------------------------------------------
// Global collections
// ---------------------------------------------------------------------------

export interface Airport {
  name: string;
  city: string;
  country: string;
  timezone: string; // IANA tz string
  lat: number;
  lng: number;
  icao_code: string | null;
}

export interface FxRates {
  rates: Record<string, number>; // e.g. { USD: 1, EUR: 0.92, ARS: 1050 }
  source: string;
  updated_at: Timestamp;
}

// ---------------------------------------------------------------------------
// TravelDocument (subcollection of user: users/{userId}/travel_documents/{docId})
// Files stored in Firebase Storage at users/{userId}/documents/{filename}
// ---------------------------------------------------------------------------

export type TravelDocumentType = "passport" | "visa" | "insurance" | "other";

export interface TravelDocument {
  type: TravelDocumentType;
  title: string;
  storage_ref: string;        // Storage path, e.g. "users/{uid}/documents/{filename}"
  file_name: string;
  mime_type: string;          // "application/pdf" | "image/jpeg" | etc.
  expires_at: string | null;  // "YYYY-MM-DD" — for passport/visa expiry
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Cloud Function request/response shapes
// ---------------------------------------------------------------------------

export interface ParseWithAIRequest {
  input: string;
  inputType: ParseInputType;
  attachmentRef: string | null; // Storage path for attachment mode
  provider: ParseProvider;
  tripId: string;
}

export interface ParseWithAIResponse {
  jobId: string;
  items: ParsedItem[];
}

// Trip context sent to AI providers for grounding
export interface TripContext {
  tripName: string;
  startDate: string;
  endDate: string;
  cities: Array<{ name: string; timezone: string }>;
}
