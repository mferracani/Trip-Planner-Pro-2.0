import { Timestamp } from "firebase/firestore";

export interface Trip {
  id: string;
  name: string;
  status?: "draft" | "planned" | "active" | "past"; // optional for backward compatibility
  is_tentative_dates?: boolean;
  start_date: string; // "2026-03-15"
  end_date: string;
  cover_url?: string;
  total_usd: number;
  paid_usd?: number;     // denormalized: sum of paid_amount across all items
  cities_count?: number; // denormalized from cities subcollection
  flights_count?: number; // denormalized from flights subcollection
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface City {
  id: string;
  trip_id: string;
  name: string;
  lat: number;
  lng: number;
  color: string; // hex from CITY_COLORS palette or COUNTRY_COLORS
  timezone: string; // IANA
  days: string[]; // ["2026-03-15", "2026-03-16"]
  country_code?: string; // ISO 3166-1 alpha-2, e.g. "ES", "AR"
}

export interface FlightLeg {
  direction: "outbound" | "inbound";
  airline: string;
  flight_number: string;
  origin_iata: string;
  destination_iata: string;
  departure_local_time: string;
  departure_timezone: string;
  departure_utc: Timestamp;
  arrival_local_time: string;
  arrival_timezone: string;
  arrival_utc: Timestamp;
  duration_minutes: number;
  cabin_class?: "economy" | "premium_economy" | "business" | "first";
  seat?: string;
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
  paid_amount?: number;  // paid so far in original currency
  legs?: FlightLeg[];   // undefined on legacy mono-leg docs
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
  total_price?: number;  // total in original currency
  currency?: string;
  total_price_usd?: number;
  paid_amount?: number;  // paid so far in original currency
}

export interface Transport {
  id: string;
  trip_id: string;
  type: "train" | "bus" | "ferry" | "car" | "car_rental" | "taxi" | "subway" | "other";
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
  paid_amount?: number;  // paid so far in original currency
}

export type ExpenseCategory =
  | "flight"
  | "hotel"
  | "transport"
  | "food"
  | "activity"
  | "shopping"
  | "other";

export interface Expense {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  currency: string; // ISO 4217, ej "USD", "ARS", "EUR"
  amount_usd: number;
  paid_amount?: number; // paid so far in original currency
  date: string; // "2026-03-15"
  category: ExpenseCategory;
  notes?: string;
  linked_item_id?: string;
  linked_item_type?: "flight" | "hotel" | "transport";
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

// Flat union type matching the Cloud Function parseWithAI response
export interface ParsedFlight {
  type: "flight";
  confidence: number;
  airline: string | null;
  flight_number: string | null;
  origin_iata: string | null;
  destination_iata: string | null;
  departure_local_time: string | null;
  departure_timezone: string | null;
  arrival_local_time: string | null;
  arrival_timezone: string | null;
  booking_ref: string | null;
  // enriched server-side
  departure_utc?: { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | null;
  arrival_utc?: { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | null;
  duration_minutes?: number | null;
}

export interface ParsedHotel {
  type: "hotel";
  confidence: number;
  name: string | null;
  city: string | null;
  check_in: string | null;
  check_out: string | null;
  booking_ref: string | null;
}

export interface ParsedTransport {
  type: "transport";
  confidence: number;
  mode: "train" | "bus" | "ferry" | "car" | "car_rental" | "other" | null;
  origin: string | null;
  destination: string | null;
  departure_local_time: string | null;
  departure_timezone: string | null;
  booking_ref: string | null;
  departure_utc?: { _seconds: number; _nanoseconds: number } | { seconds: number; nanoseconds: number } | null;
}

export type ParsedItem = ParsedFlight | ParsedHotel | ParsedTransport;

export interface CitySetting {
  normalized_name: string; // document ID — lowercase, no accents
  name: string;            // display name (e.g. "Madrid")
  country_code?: string;   // ISO 3166-1 alpha-2
  color?: string;          // hex override; if absent falls back to COUNTRY_COLORS or per-trip color
}

// Design system constants
// 16 colores — índices 0-7 son los originales (no cambiar order para no romper ciudades existentes)
export const CITY_COLORS = [
  // — originales (índices 0-7) —
  "#71D3A6", // menta viaje
  "#74ACDF", // cielo
  "#FFD16A", // sol
  "#F29E7D", // coral cálido
  "#A891E8", // lavanda IA
  "#E98A9A", // rosa atardecer
  "#6BCB77", // verde fresco
  "#6CAFE8", // azul costa
  // — nuevos (índices 8-15) —
  "#FF6B6B", // coral rojo
  "#4ECDC4", // teal
  "#FFB347", // naranja durazno
  "#48DBFB", // celeste eléctrico
  "#A29BFE", // lavanda brillante
  "#FD79A8", // rosa chicle
  "#55EFC4", // menta neón
  "#FDCB6E", // dorado cálido
];

// Representative color per country (ISO 3166-1 alpha-2) — drawn from flag palettes
export const COUNTRY_COLORS: Record<string, string> = {
  AR: "#74ACDF", // celeste bandera Argentina
  ES: "#C60B1E", // rojo bandera España
  IT: "#009246", // verde bandera Italia
  FR: "#0055A4", // azul bandera Francia
  DE: "#DD0000", // rojo bandera Alemania
  PT: "#006600", // verde bandera Portugal
  GB: "#C8102E", // rojo bandera Reino Unido
  US: "#B22234", // rojo bandera EEUU
  JP: "#BC002D", // rojo bandera Japón
  BR: "#009C3B", // verde bandera Brasil
  MX: "#006847", // verde bandera México
  NL: "#AE1C28", // rojo bandera Países Bajos
  BE: "#EF3340", // rojo bandera Bélgica
  AT: "#ED2939", // rojo bandera Austria
  CH: "#FF0000", // rojo bandera Suiza
  GR: "#0D5EAF", // azul bandera Grecia
  TR: "#E30A17", // rojo bandera Turquía
  TH: "#A51931", // rojo bandera Tailandia
  AU: "#00008B", // azul bandera Australia
  CA: "#FF0000", // rojo bandera Canadá
  IE: "#169B62", // verde bandera Irlanda
  NO: "#EF2B2D", // rojo bandera Noruega
  SE: "#006AA7", // azul bandera Suecia
  DK: "#C60C30", // rojo bandera Dinamarca
  FI: "#003580", // azul bandera Finlandia
  PL: "#DC143C", // rojo bandera Polonia
  CZ: "#D7141A", // rojo bandera República Checa
  HU: "#CE2939", // rojo bandera Hungría
  HR: "#171796", // azul bandera Croacia
  AE: "#00732F", // verde bandera Emiratos
  SG: "#EF3340", // rojo bandera Singapur
  KR: "#CD2E3A", // rojo bandera Corea del Sur
  IN: "#FF9933", // azul bandera India
  ZA: "#007A4D", // verde bandera Sudáfrica
  MA: "#C1272D", // rojo bandera Marruecos
  CL: "#D52B1E", // rojo bandera Chile
  CO: "#FCD116", // amarillo bandera Colombia
  UY: "#5EB6E4", // celeste bandera Uruguay
  PE: "#D91023", // rojo bandera Perú
  NZ: "#00247D", // azul bandera Nueva Zelanda
  ID: "#CE1126", // rojo bandera Indonesia
  MY: "#CC0001", // rojo bandera Malasia
  EG: "#CE1126", // rojo bandera Egipto
  IL: "#0038B8", // azul bandera Israel
  RU: "#D52B1E", // rojo bandera Rusia
  UA: "#005BBB", // azul bandera Ucrania
  CN: "#DE2910", // rojo bandera China
  CU: "#002A8F", // azul bandera Cuba
  SCO: "#005EB8", // azul Saltire escocés
};

// City name → country code autodetection (normalized: lowercase, sin tildes)
// Cada ciudad tiene su nombre en español/portugués + inglés + nombre nativo si difiere.
export const CITY_TO_COUNTRY: Record<string, string> = {
  // Argentina
  "buenos aires": "AR", "cordoba": "AR", "mendoza": "AR", "rosario": "AR",
  "bariloche": "AR", "salta": "AR", "mar del plata": "AR", "tucuman": "AR",
  "ushuaia": "AR", "neuquen": "AR",

  // España
  "mallorca": "ES", "madrid": "ES", "barcelona": "ES", "sevilla": "ES",
  "valencia": "ES", "ibiza": "ES", "granada": "ES", "bilbao": "ES",
  "malaga": "ES", "palma": "ES", "tenerife": "ES", "lanzarote": "ES",
  "fuerteventura": "ES", "menorca": "ES", "san sebastian": "ES", "donostia": "ES",
  "zaragoza": "ES", "alicante": "ES", "cadiz": "ES", "toledo": "ES",

  // Italia
  "roma": "IT", "rome": "IT",
  "milan": "IT", "milano": "IT",
  "florencia": "IT", "florence": "IT", "firenze": "IT",
  "venezia": "IT", "venice": "IT",
  "napoles": "IT", "naples": "IT", "napoli": "IT",
  "turin": "IT", "torino": "IT",
  "bologna": "IT", "sicilia": "IT", "sicily": "IT",
  "capri": "IT", "amalfi": "IT", "cinque terre": "IT",
  "lago de como": "IT", "lake como": "IT", "como": "IT",
  "verona": "IT", "palermo": "IT", "bari": "IT",

  // Francia
  "paris": "FR", "lyon": "FR",
  "niza": "FR", "nice": "FR",
  "marsella": "FR", "marseille": "FR",
  "burdeos": "FR", "bordeaux": "FR",
  "estrasburgo": "FR", "strasbourg": "FR",
  "colmar": "FR",
  "nantes": "FR", "toulouse": "FR", "mont saint michel": "FR",
  "versalles": "FR", "versailles": "FR",

  // Alemania
  "berlin": "DE",
  "munich": "DE", "munchen": "DE",
  "hamburgo": "DE", "hamburg": "DE",
  "frankfurt": "DE",
  "colonia": "DE", "cologne": "DE", "koln": "DE",
  "dusseldorf": "DE",
  "friburgo": "DE", "freiburg": "DE",
  "stuttgart": "DE", "heidelberg": "DE", "nuremberg": "DE", "nuremberga": "DE",

  // Portugal
  "lisboa": "PT", "lisbon": "PT",
  "oporto": "PT", "porto": "PT",
  "faro": "PT", "braga": "PT", "sintra": "PT", "algarve": "PT",
  "funchal": "PT", "madeira": "PT",

  // Reino Unido (Inglaterra/Gales)
  "londres": "GB", "london": "GB",
  "manchester": "GB", "birmingham": "GB", "liverpool": "GB",
  "bristol": "GB", "oxford": "GB", "cambridge": "GB",
  "cardiff": "GB", "bath": "GB",

  // Escocia
  "edimburgo": "SCO", "edinburgh": "SCO",
  "glasgow": "SCO", "highlands": "SCO", "inverness": "SCO",
  "stirling": "SCO", "st andrews": "SCO",

  // Irlanda
  "dublin": "IE", "cork": "IE", "galway": "IE",

  // Cuba
  "la habana": "CU", "habana": "CU", "havana": "CU",
  "varadero": "CU", "santiago de cuba": "CU",
  "cienfuegos": "CU", "vinales": "CU",

  // Estados Unidos
  "nueva york": "US", "new york": "US",
  "los angeles": "US",
  "miami": "US", "chicago": "US",
  "san francisco": "US", "las vegas": "US",
  "nueva orleans": "US", "new orleans": "US",
  "washington": "US", "boston": "US",
  "seattle": "US", "austin": "US", "nashville": "US",
  "hawaii": "US", "honolulu": "US",

  // Brasil
  "rio de janeiro": "BR", "rio": "BR",
  "sao paulo": "BR", "san pablo": "BR",
  "salvador": "BR", "brasilia": "BR",
  "fortaleza": "BR", "florianopolis": "BR",
  "foz do iguazu": "BR", "foz do iguacu": "BR",
  "belo horizonte": "BR", "manaos": "BR", "manaus": "BR",

  // México
  "ciudad de mexico": "MX", "mexico city": "MX",
  "cancun": "MX", "guadalajara": "MX",
  "playa del carmen": "MX", "tulum": "MX", "oaxaca": "MX",
  "san cristobal": "MX", "merida": "MX",

  // Grecia
  "atenas": "GR", "athens": "GR",
  "santorini": "GR", "mykonos": "GR",
  "rodas": "GR", "rhodes": "GR",
  "creta": "GR", "crete": "GR",
  "thessaloniki": "GR", "corfu": "GR",

  // Turquía
  "estambul": "TR", "istanbul": "TR",
  "ankara": "TR", "antalya": "TR",
  "capadocia": "TR", "cappadocia": "TR",
  "bodrum": "TR", "izmir": "TR",

  // Tailandia
  "bangkok": "TH", "chiang mai": "TH",
  "phuket": "TH", "koh samui": "TH",
  "pattaya": "TH", "ayutthaya": "TH",

  // Australia
  "sydney": "AU", "melbourne": "AU",
  "brisbane": "AU", "perth": "AU",
  "adelaide": "AU", "gold coast": "AU", "cairns": "AU",
  "canberra": "AU",

  // Países Bajos
  "amsterdam": "NL", "rotterdam": "NL",
  "la haya": "NL", "the hague": "NL", "den haag": "NL",
  "utrecht": "NL",

  // Bélgica
  "bruselas": "BE", "brussels": "BE", "bruxelles": "BE",
  "amberes": "BE", "antwerp": "BE", "antwerpen": "BE",
  "brujas": "BE", "bruges": "BE",
  "gante": "BE", "ghent": "BE",

  // Austria
  "viena": "AT", "vienna": "AT", "wien": "AT",
  "salzburgo": "AT", "salzburg": "AT",
  "innsbruck": "AT", "graz": "AT",

  // Suiza
  "zurich": "CH",
  "ginebra": "CH", "geneva": "CH", "geneve": "CH",
  "berna": "CH", "bern": "CH",
  "basilea": "CH", "basel": "CH",
  "lausanne": "CH",
  "lucerna": "CH", "lucerne": "CH", "luzern": "CH",
  "zermatt": "CH", "interlaken": "CH",

  // Suecia
  "estocolmo": "SE", "stockholm": "SE",
  "gotemburgo": "SE", "gothenburg": "SE", "goteborg": "SE",
  "malmo": "SE",

  // Noruega
  "oslo": "NO", "bergen": "NO", "tromso": "NO",

  // Dinamarca
  "copenhague": "DK", "copenhagen": "DK", "kobenhavn": "DK",
  "aarhus": "DK",

  // Finlandia
  "helsinki": "FI", "tampere": "FI", "rovaniemi": "FI",

  // Polonia
  "varsovia": "PL", "warsaw": "PL",
  "cracovia": "PL", "krakow": "PL",
  "gdansk": "PL", "wroclaw": "PL",

  // República Checa
  "praga": "CZ", "prague": "CZ", "praha": "CZ",
  "brno": "CZ",

  // Hungría
  "budapest": "HU",

  // Croacia
  "zagreb": "HR", "dubrovnik": "HR", "split": "HR",

  // Emiratos Árabes
  "dubai": "AE", "abu dhabi": "AE",

  // Singapur
  "singapur": "SG", "singapore": "SG",

  // Japón
  "tokio": "JP", "tokyo": "JP",
  "osaka": "JP",
  "kioto": "JP", "kyoto": "JP",
  "sapporo": "JP", "hiroshima": "JP", "nara": "JP",

  // Corea del Sur
  "seul": "KR", "seoul": "KR",
  "busan": "KR",

  // India
  "nueva delhi": "IN", "new delhi": "IN",
  "mumbai": "IN", "bombay": "IN",
  "goa": "IN", "jaipur": "IN", "agra": "IN",

  // Chile
  "santiago": "CL", "valparaiso": "CL", "atacama": "CL",

  // Colombia
  "bogota": "CO", "medellin": "CO", "cartagena": "CO", "cali": "CO",

  // Uruguay
  "montevideo": "UY", "punta del este": "UY",

  // Perú
  "lima": "PE", "cusco": "PE", "machu picchu": "PE",

  // Nueva Zelanda
  "auckland": "NZ", "queenstown": "NZ", "wellington": "NZ",

  // Indonesia
  "bali": "ID", "jakarta": "ID", "lombok": "ID",

  // Malasia
  "kuala lumpur": "MY", "penang": "MY",

  // Marruecos
  "marrakech": "MA", "marrakesh": "MA",
  "casablanca": "MA", "fez": "MA", "fes": "MA", "rabat": "MA",

  // Egipto
  "el cairo": "EG", "cairo": "EG",
  "luxor": "EG", "hurghada": "EG", "sharm el sheikh": "EG",

  // Sudáfrica
  "ciudad del cabo": "ZA", "cape town": "ZA",
  "johannesburgo": "ZA", "johannesburg": "ZA",

  // Brasil adicional (Cataratas)
  "iguazu": "AR", "iguacu": "BR",
};
