"use client";

import { useRef, useState } from "react";
import { CalendarView } from "@/components/TripDetail/CalendarView";
import { ListView } from "@/components/TripDetail/ListView";
import { AiParseModal } from "@/components/AiParseModal";
import { Pressable } from "@/components/ui/Pressable";
import { BottomNav, BottomNavTab } from "@/components/BottomNav";
import { Plane, MapPin, DollarSign, CalendarDays } from "lucide-react";
import { Trip, City, Flight, Hotel, Transport, ParsedItem } from "@/lib/types";
import { useCountUp } from "@/lib/hooks";
import type { Timestamp } from "firebase/firestore";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Mock data — Europa 2026 (BUE → MAD → BCN → ROM → BUE)
// ---------------------------------------------------------------------------

const fakeTs = {} as Timestamp;

const MOCK_TRIP: Trip = {
  id: "mock-1",
  name: "Europa 2026",
  start_date: "2026-05-15",
  end_date: "2026-05-28",
  cover_url: undefined,
  total_usd: 3240,
  created_at: fakeTs,
  updated_at: fakeTs,
};

const MOCK_CITIES: City[] = [
  {
    id: "city-mad",
    trip_id: "mock-1",
    name: "Madrid",
    color: "#FF6B6B",
    lat: 40.4, lng: -3.7,
    timezone: "Europe/Madrid",
    days: ["2026-05-15","2026-05-16","2026-05-17","2026-05-18"],
  },
  {
    id: "city-bcn",
    trip_id: "mock-1",
    name: "Barcelona",
    color: "#4ECDC4",
    lat: 41.4, lng: 2.2,
    timezone: "Europe/Madrid",
    days: ["2026-05-19","2026-05-20","2026-05-21"],
  },
  {
    id: "city-rom",
    trip_id: "mock-1",
    name: "Roma",
    color: "#C77DFF",
    lat: 41.9, lng: 12.5,
    timezone: "Europe/Rome",
    days: ["2026-05-22","2026-05-23","2026-05-24","2026-05-25","2026-05-26","2026-05-27","2026-05-28"],
  },
];

const MOCK_FLIGHTS: Flight[] = [
  {
    id: "fl-1",
    trip_id: "mock-1",
    airline: "Iberia",
    flight_number: "IB6844",
    origin_iata: "EZE",
    destination_iata: "MAD",
    departure_local_time: "2026-05-14T21:35",
    departure_timezone: "America/Argentina/Buenos_Aires",
    departure_utc: fakeTs,
    arrival_local_time: "2026-05-15T13:20",
    arrival_timezone: "Europe/Madrid",
    arrival_utc: fakeTs,
    duration_minutes: 765,
    cabin_class: "Business",
    seat: "24A",
    booking_ref: "XKQP7M",
    price_usd: 1200,
  },
  {
    id: "fl-2",
    trip_id: "mock-1",
    airline: "Vueling",
    flight_number: "VY1234",
    origin_iata: "MAD",
    destination_iata: "BCN",
    departure_local_time: "2026-05-19T08:10",
    departure_timezone: "Europe/Madrid",
    departure_utc: fakeTs,
    arrival_local_time: "2026-05-19T09:25",
    arrival_timezone: "Europe/Madrid",
    arrival_utc: fakeTs,
    duration_minutes: 75,
    cabin_class: "Economy",
    price_usd: 65,
  },
  {
    id: "fl-3",
    trip_id: "mock-1",
    airline: "Ryanair",
    flight_number: "FR9021",
    origin_iata: "BCN",
    destination_iata: "FCO",
    departure_local_time: "2026-05-22T06:45",
    departure_timezone: "Europe/Madrid",
    departure_utc: fakeTs,
    arrival_local_time: "2026-05-22T08:55",
    arrival_timezone: "Europe/Rome",
    arrival_utc: fakeTs,
    duration_minutes: 130,
    cabin_class: "Economy",
    price_usd: 80,
  },
  {
    id: "fl-4",
    trip_id: "mock-1",
    airline: "Iberia",
    flight_number: "IB6845",
    origin_iata: "FCO",
    destination_iata: "EZE",
    departure_local_time: "2026-05-28T16:30",
    departure_timezone: "Europe/Rome",
    departure_utc: fakeTs,
    arrival_local_time: "2026-05-29T07:15",
    arrival_timezone: "America/Argentina/Buenos_Aires",
    arrival_utc: fakeTs,
    duration_minutes: 795,
    cabin_class: "Business",
    seat: "24A",
    booking_ref: "XKQP7N",
    price_usd: 1200,
  },
];

const MOCK_HOTELS: Hotel[] = [
  {
    id: "ht-1",
    trip_id: "mock-1",
    city_id: "city-mad",
    name: "Hotel Puerta América",
    brand: "Silken",
    check_in: "2026-05-15",
    check_out: "2026-05-19",
    room_type: "Superior Doble",
    booking_ref: "BK88231",
    price_per_night: 180,
    total_price_usd: 720,
  },
  {
    id: "ht-2",
    trip_id: "mock-1",
    city_id: "city-bcn",
    name: "H10 Casa Mimosa",
    brand: "H10",
    check_in: "2026-05-19",
    check_out: "2026-05-22",
    room_type: "Deluxe",
    booking_ref: "H10-44512",
    price_per_night: 210,
    total_price_usd: 630,
  },
  {
    id: "ht-3",
    trip_id: "mock-1",
    city_id: "city-rom",
    name: "Hotel Nazionale",
    brand: "Nazionale",
    check_in: "2026-05-22",
    check_out: "2026-05-28",
    room_type: "Classic",
    booking_ref: "NAZ-9912",
    price_per_night: 160,
    total_price_usd: 960,
  },
];

const MOCK_TRANSPORTS: Transport[] = [
  {
    id: "tr-1",
    trip_id: "mock-1",
    type: "train",
    origin: "Madrid Atocha",
    destination: "Barcelona Sants",
    departure_local_time: "2026-05-19T09:00",
    departure_timezone: "Europe/Madrid",
    departure_utc: fakeTs,
    arrival_local_time: "2026-05-19T12:30",
    arrival_timezone: "Europe/Madrid",
    arrival_utc: fakeTs,
    operator: "Renfe AVE",
    booking_ref: "AVE-7712",
    price_usd: 65,
  },
];

const MOCK_TRIPS: (Trip & { status: "active" | "future" | "past" })[] = [
  { ...MOCK_TRIP, status: "future" },
  {
    id: "mock-2",
    name: "Patagonia Sur",
    start_date: "2025-11-10",
    end_date: "2025-11-20",
    total_usd: 1850,
    created_at: fakeTs,
    updated_at: fakeTs,
    status: "past",
  },
  {
    id: "mock-3",
    name: "NYC & Boston",
    start_date: "2026-09-01",
    end_date: "2026-09-12",
    total_usd: 2100,
    created_at: fakeTs,
    updated_at: fakeTs,
    status: "future",
  },
];

const MOCK_PARSED_ITEMS: ParsedItem[] = [
  {
    type: "flight",
    confidence: 0.97,
    data: {
      airline: "Iberia",
      flight_number: "IB6844",
      origin_iata: "EZE",
      destination_iata: "MAD",
      departure_local_time: "2026-05-14T21:35",
      price_usd: 1200,
    },
  },
  {
    type: "hotel",
    confidence: 0.83,
    data: {
      name: "H10 Casa Mimosa",
      check_in: "2026-05-19",
      check_out: "2026-05-22",
      total_price_usd: 630,
    },
  },
  {
    type: "transport",
    confidence: 0.61,
    data: {
      origin: "Madrid Atocha",
      destination: "Barcelona Sants",
      operator: "Renfe AVE",
    },
  },
];

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

type Screen = "dashboard" | "trip" | "parse-modal";
type TripTab = "calendar" | "list" | "map";

export default function DevPreview() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [tripTab, setTripTab] = useState<TripTab>("calendar");
  const [parseOpen, setParseOpen] = useState(false);
  const [showParsed, setShowParsed] = useState(false);
  const [navTab, setNavTab] = useState<BottomNavTab>("trips");

  function handleTabChange(t: BottomNavTab) {
    setNavTab(t);
    if (t === "trips") setScreen("dashboard");
  }

  function handleAdd() {
    if (screen === "trip") setParseOpen(true);
    else setParseOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Dev nav bar */}
      <div className="sticky top-0 z-50 flex items-center gap-2 px-4 py-2 bg-[#BF5AF2]/90 backdrop-blur text-white text-[12px] font-semibold">
        <span className="opacity-60">DEV PREVIEW</span>
        <div className="flex gap-1 ml-2">
          {(["dashboard", "trip"] as Screen[]).map((s) => (
            <button
              key={s}
              onClick={() => { setScreen(s); setNavTab("trips"); }}
              className={`px-3 py-1 rounded-full transition-colors ${
                screen === s ? "bg-white text-[#BF5AF2]" : "bg-white/20 text-white"
              }`}
            >
              {s === "dashboard" ? "Dashboard" : "Trip Detail"}
            </button>
          ))}
          <button
            onClick={() => setParseOpen(true)}
            className="px-3 py-1 rounded-full bg-white/20 text-white"
          >
            ✨ Parse Modal
          </button>
        </div>
        <Link href="/auth" className="ml-auto opacity-60 hover:opacity-100">
          → Auth real
        </Link>
      </div>

      {/* Screens */}
      {navTab === "trips" && screen === "dashboard" && (
        <MockDashboard onOpenTrip={() => setScreen("trip")} />
      )}
      {navTab === "trips" && screen === "trip" && (
        <MockTripDetail
          tab={tripTab}
          onTabChange={setTripTab}
          onBack={() => setScreen("dashboard")}
          onOpenParse={() => setParseOpen(true)}
        />
      )}
      {navTab === "home" && <PlaceholderScreen title="Home" emoji="🏠" subtitle="Feed de próximos eventos · v1.1" />}
      {navTab === "map" && <PlaceholderScreen title="Mapa" emoji="🗺️" subtitle="Tus viajes en el mundo · v1.1" />}
      {navTab === "settings" && <PlaceholderScreen title="Ajustes" emoji="⚙️" subtitle="Perfil y preferencias · v1.1" />}

      {/* Bottom nav */}
      <BottomNav
        active={navTab}
        onAdd={handleAdd}
        addIcon={screen === "trip" ? "sparkles" : "plus"}
        onTabChange={handleTabChange}
      />

      {/* Parse Modal */}
      {parseOpen && (
        <MockParseModal
          showParsed={showParsed}
          onClose={() => { setParseOpen(false); setShowParsed(false); }}
          onParse={() => setShowParsed(true)}
        />
      )}
    </div>
  );
}

function PlaceholderScreen({ title, emoji, subtitle }: { title: string; emoji: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-6 text-center animate-fade-slide-up">
      <div className="text-7xl">{emoji}</div>
      <h1 className="text-[28px] font-bold text-white">{title}</h1>
      <p className="text-[#707070] text-[15px]">{subtitle}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard screen
// ---------------------------------------------------------------------------

function MockDashboard({ onOpenTrip }: { onOpenTrip: () => void }) {
  const [filter, setFilter] = useState<"all" | "future" | "past">("all");

  const filtered = MOCK_TRIPS.filter((t) =>
    filter === "all" ? true : t.status === filter
  );

  const daysUntil = Math.ceil(
    (new Date("2026-05-15").getTime() - new Date().getTime()) / 86400000
  );

  return (
    <div className="px-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between pt-14 pb-6 animate-fade-slide-up stagger-0">
        <div>
          <p className="text-[#A0A0A0] text-[13px] mb-0.5">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-[28px] font-bold text-white leading-tight">
            Buenas noches, <span className="text-[#BF5AF2]">Mati</span>
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-[15px] font-semibold text-white press-feedback">
          M
        </div>
      </div>

      {/* Hero card — with parallax tilt */}
      <div className="mb-6 animate-spring-up stagger-2">
        <MockHeroCard tintColor="#FF6B6B" daysUntil={daysUntil} onClick={onOpenTrip} />
      </div>

      {/* Stats 2×2 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Viajes" sublabel="este año" value="3" numericValue={3} color="#0A84FF" icon={<Plane size={16} strokeWidth={2.2} />} staggerDelay={200} />
        <StatCard label="Ciudades" sublabel="visitadas" value="8" numericValue={8} color="#BF5AF2" icon={<MapPin size={16} strokeWidth={2.2} />} staggerDelay={260} />
        <StatCard label="Total" sublabel="gastado" value="USD 7,190" numericValue={7190} currencyPrefix="USD " color="#FF9F0A" icon={<DollarSign size={16} strokeWidth={2.2} />} staggerDelay={320} />
        <StatCard label="Días" sublabel="viajando" value="34" numericValue={34} color="#30D158" icon={<CalendarDays size={16} strokeWidth={2.2} />} staggerDelay={380} />
      </div>

      {/* Mis viajes */}
      <div className="animate-fade-slide-up stagger-7">
        <h2 className="text-[20px] font-semibold text-white mb-4">Mis viajes</h2>
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar ios-scroll pb-1">
          {(["all", "future", "past"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap flex-shrink-0 transition-colors press-feedback ${
                filter === f ? "bg-[#0A84FF] text-white" : "bg-[#1A1A1A] text-[#A0A0A0] border border-[#333]"
              }`}
            >
              {f === "all" ? "Todos" : f === "future" ? "Futuros" : "Pasados"}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={onOpenTrip}
              className="w-full bg-[#1A1A1A] border border-[#262626] rounded-[16px] px-4 py-4 flex items-center gap-3 text-left card-lift press-feedback"
            >
              <div
                className="w-10 h-10 rounded-[10px] flex-shrink-0 flex items-center justify-center text-[18px]"
                style={{ backgroundColor: t.status === "past" ? "#4ECDC420" : "#FF6B6B20" }}
              >
                ✈️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-white truncate">{t.name}</p>
                <p className="text-[12px] text-[#707070] mt-0.5">
                  {t.start_date} – {t.end_date}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                    t.status === "past"
                      ? "bg-[#707070]/20 text-[#707070]"
                      : "bg-[#0A84FF]/20 text-[#0A84FF]"
                  }`}
                >
                  {t.status === "past" ? "Pasado" : "Futuro"}
                </span>
                <span className="text-[12px] font-mono text-[#A0A0A0]">USD {t.total_usd.toLocaleString()}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

function MockHeroCard({ tintColor, daysUntil, onClick }: { tintColor: string; daysUntil: number; onClick: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="w-full relative rounded-[24px] overflow-hidden h-52 flex flex-col p-5 text-left"
      style={{
        background: "#141414",
        border: `1px solid ${tintColor}35`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)",
        transform: pressed ? "scale(0.985)" : "scale(1)",
        transition: "transform 200ms cubic-bezier(0.2, 0.7, 0.3, 1)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 15% 0%, ${tintColor}40 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 90% 100%, ${tintColor}25 0%, transparent 55%),
            radial-gradient(ellipse 40% 30% at 50% 50%, ${tintColor}10 0%, transparent 70%)
          `,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none animate-gradient-drift opacity-60"
        style={{
          background: `linear-gradient(115deg, ${tintColor}18 0%, transparent 40%, ${tintColor}0A 80%, ${tintColor}15 100%)`,
          backgroundSize: "220% 220%",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-1.5 bg-[#0A84FF]/18 px-2.5 py-1 rounded-full">
          <span className="text-[10px] font-bold text-[#0A84FF] uppercase tracking-wider">Próximo</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/60 text-[12px]">›</div>
      </div>

      <div className="flex-1" />

      <div className="relative">
        <h3 className="text-[28px] font-bold text-white leading-[1.05] tracking-tight">Europa 2026</h3>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-white/75 text-[13px] font-medium">En {daysUntil} días</p>
          <span className="text-white/25 text-[11px]">·</span>
          <p className="text-white/75 text-[13px] font-mono tabular-nums">USD 3.240</p>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Trip Detail screen
// ---------------------------------------------------------------------------

const TRIP_TABS: TripTab[] = ["calendar", "list", "map"];

function MockTripDetail({
  tab, onTabChange, onBack, onOpenParse,
}: {
  tab: TripTab;
  onTabChange: (t: TripTab) => void;
  onBack: () => void;
  onOpenParse: () => void;
}) {
  const totalDays = 14;
  const tabIndex = TRIP_TABS.indexOf(tab);
  const prevTabIndex = useRef(tabIndex);
  const direction = tabIndex >= prevTabIndex.current ? 1 : -1;
  prevTabIndex.current = tabIndex;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-4 pb-4 border-b border-[#1A1A1A] animate-fade-slide-up stagger-0">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#333] text-[#0A84FF] text-[17px] press-feedback"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold text-white truncate leading-tight">Europa 2026</h1>
          <p className="text-[#707070] text-[12px] mt-0.5">15 may – 28 may 2026</p>
        </div>
        <button className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#333] text-[#A0A0A0] press-feedback">
          ⋯
        </button>
      </div>

      {/* Summary card — sin scroll */}
      <div className="px-6 pt-3 pb-3 animate-fade-slide-up stagger-2">
        <div
          className="rounded-[18px] px-5 py-4 overflow-hidden relative"
          style={{
            background: "linear-gradient(180deg, #1A1A1A 0%, #141414 100%)",
            border: "1px solid #262626",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#707070] font-bold mb-1">Presupuesto</p>
              <p className="text-[24px] font-bold text-white tabular-nums leading-none whitespace-nowrap">
                USD <span className="text-[#0A84FF]">3.240</span>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-[#707070] font-bold mb-1">Duración</p>
              <p className="text-[24px] font-bold text-white tabular-nums leading-none">
                {totalDays}<span className="text-[14px] text-[#707070] font-semibold ml-0.5">d</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — sliding indicator */}
      <div className="relative flex gap-1 mx-6 mb-4 mt-1 bg-[#1A1A1A] p-1 rounded-full border border-[#262626] animate-fade-slide-up stagger-3">
        {/* Sliding pill */}
        <span
          className="absolute top-1 bottom-1 rounded-full bg-[#242424] pointer-events-none"
          style={{
            boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
            width: "calc((100% - 8px) / 3)",
            left: `calc(4px + ${tabIndex} * (100% - 8px) / 3)`,
            transition: "left 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
        {TRIP_TABS.map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`relative flex-1 py-2 text-[14px] font-semibold rounded-full transition-colors duration-200 ${
              tab === t ? "text-white" : "text-[#707070]"
            }`}
          >
            {t === "calendar" ? "Calendario" : t === "list" ? "Lista" : "Mapa"}
          </button>
        ))}
      </div>

      {/* Content — slides horizontally */}
      <div
        key={tab}
        className={direction > 0 ? "animate-slide-in-right" : "animate-slide-in-left"}
      >
        {tab === "calendar" && (
          <CalendarView
            trip={MOCK_TRIP}
            cities={MOCK_CITIES}
            flights={MOCK_FLIGHTS}
            hotels={MOCK_HOTELS}
            transports={MOCK_TRANSPORTS}
          />
        )}
        {tab === "list" && (
          <ListView
            trip={MOCK_TRIP}
            cities={MOCK_CITIES}
            flights={MOCK_FLIGHTS}
            hotels={MOCK_HOTELS}
            transports={MOCK_TRANSPORTS}
          />
        )}
        {tab === "map" && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
            <span className="text-5xl">🗺️</span>
            <p className="text-[#A0A0A0] text-[17px] font-semibold">Mapa disponible en v1.1</p>
          </div>
        )}
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Parse Modal (mock — no llama a Firebase)
// ---------------------------------------------------------------------------

function MockParseModal({
  showParsed, onClose, onParse,
}: {
  showParsed: boolean;
  onClose: () => void;
  onParse: () => void;
}) {
  const [mode, setMode] = useState<"chat" | "file" | "manual">("chat");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);

  const msgs = ["Claude está leyendo…", "Identificando entidades…", "Estructurando datos…", "Calculando confianza…"];

  function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    let i = 0;
    const iv = setInterval(() => { i++; setMsgIdx(i % msgs.length); }, 900);
    setTimeout(() => { clearInterval(iv); setLoading(false); onParse(); }, 3200);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0D0D0D] animate-slide-up">
      <div className="flex items-center justify-between px-6 pt-12 pb-4 border-b border-[#262626]">
        <button onClick={onClose} className="text-[#0A84FF] text-[17px] font-medium press-feedback">Cancelar</button>
        <h2 className="text-[17px] font-semibold text-white">Agregar al viaje</h2>
        <div className="w-16" />
      </div>

      {!showParsed && !loading && (
        <div className="flex gap-1 mx-6 mt-4 bg-[#1A1A1A] p-1 rounded-full border border-[#262626]">
          {(["chat", "file", "manual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-full transition-all press-feedback ${mode === m ? "text-white" : "text-[#707070]"}`}
              style={mode === m ? { background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)" } : undefined}
            >
              {m === "chat" ? "💬 Chat" : m === "file" ? "📄 Archivo" : "✏️ Manual"}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-8">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <span className="animate-sparkle-1 absolute top-0 left-4 text-[28px]">✨</span>
              <span className="animate-sparkle-2 absolute top-2 right-2 text-[20px]">⭐</span>
              <span className="animate-sparkle-3 absolute bottom-4 left-0 text-[22px]">✨</span>
              <span className="animate-sparkle-4 absolute bottom-2 right-4 text-[16px]">⭐</span>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-[28px]" style={{ background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)" }}>
                ✨
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-white text-[17px] font-semibold">{msgs[msgIdx]}</p>
              <p className="text-[#707070] text-[13px]">Esto tarda unos segundos</p>
            </div>
            <div className="w-48 h-1 rounded-full overflow-hidden bg-[#242424]">
              <div className="h-full rounded-full" style={{ width: "60%", background: "linear-gradient(90deg, transparent, #BF5AF2, transparent)", backgroundSize: "200% 100%", animation: "shimmer 1.2s infinite" }} />
            </div>
          </div>
        ) : showParsed ? (
          <ParsePreview items={MOCK_PARSED_ITEMS} onEdit={() => {}} />
        ) : mode === "chat" ? (
          <div>
            <p className="text-[#A0A0A0] text-[14px] mb-3 leading-relaxed">
              Pegá el email de confirmación o escribí los datos del vuelo, hotel o transporte.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ej: Mi vuelo Iberia IB6844 sale el 15/05 a las 21:35 de Buenos Aires a Madrid…"
              className="w-full h-52 bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3.5 text-white text-[15px] placeholder-[#4D4D4D] outline-none focus:border-[#BF5AF2] transition-colors resize-none"
            />
            <div className="flex gap-2 mt-3">
              {["✈️ Vuelo", "🏨 Hotel", "🚆 Tren"].map((chip) => (
                <button key={chip} onClick={() => setText(text + `[${chip.split(" ")[1]}] `)}
                  className="px-3 py-1.5 bg-[#242424] border border-[#333] rounded-full text-[13px] text-[#A0A0A0] press-feedback">
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-[#4D4D4D] text-[15px]">Próximamente</div>
        )}
      </div>

      {!loading && (
        <div className="px-6 pb-10 pt-4 border-t border-[#262626]">
          {showParsed ? (
            <button onClick={onClose} className="w-full text-white rounded-[14px] py-4 text-[17px] font-semibold press-feedback" style={{ background: "linear-gradient(135deg, #30D158, #25A244)" }}>
              Confirmar y agregar (3 items)
            </button>
          ) : (
            <button
              onClick={handleParse}
              disabled={mode === "chat" && !text.trim()}
              className="w-full text-white rounded-[14px] py-4 text-[17px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2 press-feedback cta-shimmer"
              style={{ background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)", boxShadow: "0 4px 20px rgba(191,90,242,0.35)" }}
            >
              <span>✨</span> Parsear con Claude
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ParsePreview({ items, onEdit }: { items: ParsedItem[]; onEdit: () => void }) {
  const avg = Math.round(items.reduce((s, i) => s + i.confidence, 0) / items.length * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-5 animate-fade-slide-up stagger-0">
        <div>
          <h3 className="text-[20px] font-semibold text-white">{items.length} items detectados</h3>
          <p className="text-[#707070] text-[13px] mt-0.5">Confianza promedio {avg}%</p>
        </div>
        <button onClick={onEdit} className="text-[#0A84FF] text-[15px] press-feedback">Editar</button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => {
          const conf = item.confidence;
          const color = conf >= 0.9 ? "#30D158" : conf >= 0.7 ? "#FF9F0A" : "#FF453A";
          const label = conf >= 0.9 ? "Alta confianza" : conf >= 0.7 ? "Revisar" : "Baja confianza";
          const emoji = item.type === "flight" ? "✈️" : item.type === "hotel" ? "🏨" : "🚆";
          const d = item.data as Record<string, unknown>;
          const title = item.type === "flight"
            ? `${d.airline ?? ""} ${d.flight_number ?? ""} · ${d.origin_iata ?? ""}→${d.destination_iata ?? ""}`.trim()
            : item.type === "hotel" ? String(d.name ?? "Hotel")
            : `${d.origin ?? ""} → ${d.destination ?? ""}`.trim();
          return (
            <div
              key={i}
              className="bg-[#1A1A1A] rounded-[14px] px-4 py-4 flex items-start gap-3 animate-spring-up"
              style={{ border: `1px solid ${color}30`, animationDelay: `${i * 80}ms` }}
            >
              <span className="text-[24px]">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-white truncate">{title}</p>
                <p className="text-[12px] text-[#707070] mt-0.5 capitalize">{item.type}</p>
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <div className="text-[11px] font-bold px-2 py-1 rounded-full animate-pop-in" style={{ color, backgroundColor: `${color}18`, animationDelay: `${i * 80 + 100}ms` }}>
                  {Math.round(conf * 100)}%
                </div>
                <p className="text-[10px]" style={{ color }}>{label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared mini-components
// ---------------------------------------------------------------------------

function StatCard({
  label, sublabel, value, numericValue, currencyPrefix, color, icon, staggerDelay = 0,
}: {
  label: string;
  sublabel?: string;
  value: string;
  numericValue?: number;
  currencyPrefix?: string;
  color: string;
  icon?: React.ReactNode;
  staggerDelay?: number;
}) {
  const animated = useCountUp(numericValue ?? 0, 1200, staggerDelay + 80);
  const displayValue =
    numericValue !== undefined
      ? `${currencyPrefix ?? ""}${animated.toLocaleString("es-AR")}`
      : value;

  return (
    <div
      className="relative rounded-[18px] px-4 py-4 animate-pop-in overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${color}12 0%, #161616 100%)`,
        border: `1px solid ${color}22`,
        animationDelay: `${staggerDelay}ms`,
        boxShadow: `inset 0 1px 0 ${color}15`,
      }}
    >
      {icon && (
        <div
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1 pr-8">
        <div className="flex items-baseline gap-1">
          <span className="text-[11px] font-semibold text-[#A0A0A0] uppercase tracking-wider">{label}</span>
          {sublabel && <span className="text-[10px] text-[#4D4D4D] font-medium">{sublabel}</span>}
        </div>
        <p
          className={`font-bold leading-none tracking-tight whitespace-nowrap ${currencyPrefix ? "text-[20px]" : "text-[26px]"}`}
          style={{ color, textShadow: `0 0 24px ${color}22` }}
        >
          {displayValue}
        </p>
      </div>
    </div>
  );
}

