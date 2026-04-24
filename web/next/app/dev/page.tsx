"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Home,
  MapPin,
  MoreHorizontal,
  Palmtree,
  Plane,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";

type View = "dashboard" | "trip" | "catalog" | "settings";
type TripTab = "calendar" | "list" | "items" | "costs";
type TripStatus = "active" | "future" | "past";
type ItemType = "flight" | "hotel" | "transport";

type TripSummary = {
  id: string;
  name: string;
  flag: string;
  year: string;
  range: string;
  status: TripStatus;
  totalUsd: number;
  cities: number;
  days: number;
};

type CitySegment = {
  id: string;
  name: string;
  code: string;
  flag: string;
  color: string;
  start: string;
  days: string[];
};

type TripItem = {
  id: string;
  type: ItemType;
  date: string;
  time?: string;
  title: string;
  detail: string;
  priceUsd?: number;
};

type CalendarCellData = {
  date: string;
  day: string;
  city?: CitySegment;
  cityIndex?: number;
  items: TripItem[];
  outside?: boolean;
};

const heroImage =
  "https://images.unsplash.com/photo-1581776045061-4a5b1c983bb0?auto=format&fit=crop&w=1200&q=80";

const trips: TripSummary[] = [
  {
    id: "mallorca",
    name: "Mallorca",
    flag: "🇪🇸",
    year: "2026",
    range: "23 jun 26 – 8 jul 26",
    status: "active",
    totalUsd: 10407,
    cities: 3,
    days: 16,
  },
  {
    id: "rio",
    name: "Rio de Janeiro",
    flag: "🇧🇷",
    year: "2026",
    range: "4 dic 26 – 12 dic 26",
    status: "future",
    totalUsd: 2720,
    cities: 1,
    days: 9,
  },
];

const cities: CitySegment[] = [
  {
    id: "palma",
    name: "Palma",
    code: "PMI",
    flag: "🇪🇸",
    color: "#54C6A0",
    start: "2026-06-23",
    days: ["2026-06-23", "2026-06-24", "2026-06-25", "2026-06-26", "2026-06-27", "2026-06-28"],
  },
  {
    id: "soller",
    name: "Sóller",
    code: "SOL",
    flag: "🇪🇸",
    color: "#5D77B8",
    start: "2026-06-30",
    days: ["2026-06-30", "2026-07-01", "2026-07-02"],
  },
  {
    id: "alcudia",
    name: "Alcúdia",
    code: "ALC",
    flag: "🇪🇸",
    color: "#8E4BA6",
    start: "2026-07-03",
    days: ["2026-07-03", "2026-07-04", "2026-07-05", "2026-07-06"],
  },
];

const items: TripItem[] = [
  { id: "hm-23", type: "hotel", date: "2026-06-23", title: "HM Palma Blanc", detail: "Check-in · Suite vista mar", priceUsd: 1560 },
  { id: "hm-24", type: "hotel", date: "2026-06-24", title: "HM Palma Blanc", detail: "Noche 2/6" },
  { id: "car-25", type: "transport", date: "2026-06-25", time: "09:40", title: "Auto a Deià", detail: "Retiro en Palma" },
  { id: "hm-26", type: "hotel", date: "2026-06-26", title: "HM Palma Blanc", detail: "Noche 4/6" },
  { id: "hm-27", type: "hotel", date: "2026-06-27", title: "HM Palma Blanc", detail: "Noche 5/6" },
  { id: "ux-28", type: "flight", date: "2026-06-28", time: "21:35", title: "IB3912 Madrid → Palma", detail: "Asiento 4A · Business", priceUsd: 420 },
  { id: "js-30", type: "hotel", date: "2026-06-30", title: "Jumeirah Sóller", detail: "Check-in · Terrace Deluxe", priceUsd: 1290 },
  { id: "train-1", type: "transport", date: "2026-07-01", time: "10:15", title: "Tren de Sóller", detail: "Palma Estació → Sóller", priceUsd: 45 },
  { id: "train-2", type: "transport", date: "2026-07-02", time: "16:20", title: "Tren de Sóller", detail: "Sóller → Puerto" },
  { id: "viva-3", type: "hotel", date: "2026-07-03", title: "Viva Blue Alcúdia", detail: "Check-in · Suite", priceUsd: 1700 },
  { id: "viva-4", type: "hotel", date: "2026-07-04", title: "Viva Blue Alcúdia", detail: "Noche 2/4" },
  { id: "car-4", type: "transport", date: "2026-07-04", time: "12:00", title: "Auto a Formentor", detail: "Reserva local" },
  { id: "viva-5", type: "hotel", date: "2026-07-05", title: "Viva Blue Alcúdia", detail: "Noche 3/4" },
  { id: "home-6", type: "flight", date: "2026-07-06", time: "11:10", title: "UX6030 Palma → Madrid", detail: "Terminal B", priceUsd: 380 },
  { id: "home-7", type: "flight", date: "2026-07-07", time: "18:50", title: "IB6845 Madrid → Ezeiza", detail: "Regreso", priceUsd: 1200 },
];

const weekDates = [
  ["2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25", "2026-06-26", "2026-06-27", "2026-06-28"],
  ["2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"],
  ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12"],
];

export default function DevPrototype() {
  const [view, setView] = useState<View>("trip");
  const [tab, setTab] = useState<TripTab>("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>("2026-06-24");
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const activeTrip = trips[0];

  return (
    <main className="min-h-screen bg-[#090806] text-white">
      <TopNavigation view={view} onChange={setView} onAdd={() => setAiOpen(true)} />

      {view === "dashboard" && (
        <DashboardView onOpenTrip={() => setView("trip")} onAdd={() => setAiOpen(true)} />
      )}
      {view === "trip" && (
        <TripDetailView
          trip={activeTrip}
          tab={tab}
          onTabChange={setTab}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setActiveDate(date);
          }}
          onBack={() => setView("dashboard")}
        />
      )}
      {view === "catalog" && <CatalogView />}
      {view === "settings" && <SettingsView />}

      <BottomNavigation view={view} onChange={setView} onAdd={() => setAiOpen(true)} />

      {activeDate && (
        <DayDrawer date={activeDate} onClose={() => setActiveDate(null)} />
      )}
      {aiOpen && <AiModal onClose={() => setAiOpen(false)} />}
    </main>
  );
}

function TopNavigation({
  view,
  onChange,
  onAdd,
}: {
  view: View;
  onChange: (view: View) => void;
  onAdd: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-[#1F1F1F] bg-[#090806]/94 px-5 backdrop-blur md:px-6">
      <button onClick={() => onChange("dashboard")} className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#71D3A6] text-[#07100B]">
          <Palmtree className="h-6 w-6 fill-[#07100B]" />
        </span>
        <span className="hidden text-[20px] font-black tracking-tight sm:block">Trip Planner Pro</span>
      </button>

      <nav className="hidden items-center gap-9 text-[15px] font-semibold text-[#81786A] md:flex">
        <NavButton active={view === "trip" || view === "dashboard"} onClick={() => onChange("trip")}>Viajes</NavButton>
        <NavButton active={view === "catalog"} onClick={() => onChange("catalog")}>Catálogo</NavButton>
        <span className="opacity-45">Mapa</span>
        <NavButton active={view === "settings"} onClick={() => onChange("settings")}>Ajustes</NavButton>
      </nav>

      <button onClick={onAdd} className="flex items-center gap-2 rounded-full border border-[#A15CE6] bg-[#A891E8]/8 px-4 py-2 text-[13px] font-bold md:text-[14px]">
        <Sparkles className="h-4 w-4 text-[#A891E8]" />
        Agregar con IA
      </button>
    </header>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={active ? "border-b-2 border-[#71D3A6] py-6 text-white" : "py-6 hover:text-white"}>
      {children}
    </button>
  );
}

function DashboardView({ onOpenTrip, onAdd }: { onOpenTrip: () => void; onAdd: () => void }) {
  return (
    <section className="mx-auto max-w-[980px] px-5 py-8 pb-28 md:px-8 md:pb-10">
      <div className="mb-7 flex items-start justify-between">
        <div>
          <p className="text-[16px] font-medium text-[#81786A]">Buen día</p>
          <h1 className="mt-2 text-[38px] font-black leading-none tracking-tight md:text-[46px]">Día 2 de tu viaje</h1>
        </div>
        <button onClick={onAdd} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#242018] text-[#F3ECE1]">
          <User className="h-6 w-6" />
        </button>
      </div>

      <button onClick={onOpenTrip} className="w-full text-left">
        <MobileHero trip={trips[0]} />
      </button>

      <div className="mt-8 flex items-end justify-between">
        <h2 className="text-[26px] font-black tracking-tight">Mis viajes</h2>
        <span className="text-[18px] font-bold text-[#81786A]">24</span>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {["Todos", "Próximos", "En curso", "Pasados"].map((filter, index) => (
          <button key={filter} className={`rounded-full px-4 py-2 text-[14px] font-bold ${index === 0 ? "bg-[#F5F1EA] text-black" : "border border-[#252119] bg-[#171512] text-[#C6BDAE]"}`}>
            {filter}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {trips.map((trip) => (
          <TripRow key={trip.id} trip={trip} onClick={onOpenTrip} />
        ))}
      </div>
    </section>
  );
}

function MobileHero({ trip }: { trip: TripSummary }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[#4C8D76] bg-[#151513] shadow-[0_28px_70px_rgba(0,0,0,0.38)]">
      <div className="relative h-[230px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(113,211,166,0.92),rgba(36,68,55,0.78)_50%,rgba(9,8,6,0.66))]" />
        <Plane className="absolute left-[48%] top-10 h-24 w-24 -rotate-[24deg] fill-white/10 text-white/10" strokeWidth={0} />
        <div className="relative flex h-full flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-black uppercase tracking-[0.16em] text-[#FFD16A]">En curso</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-[28px] font-black">↗</span>
          </div>
          <div>
            <h2 className="text-[42px] font-black leading-none tracking-tight">{trip.name}</h2>
            <p className="mt-3 text-[20px] font-black text-white/86">Día 2</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[132px_1fr] gap-4 border-t border-white/8 p-6">
        <ProgressRing size={120} />
        <div className="space-y-4 self-center">
          <MetricLine icon={<Plane className="h-4 w-4 fill-[#FFD16A]" />} value="4" label="Viajes este año" />
          <MetricLine icon={<MapPin className="h-4 w-4" />} value="3" label="Ciudades" />
          <MetricLine icon={<CalendarDays className="h-4 w-4" />} value="16" label="Días viajando" />
        </div>
      </div>

      <div className="border-t border-white/8 px-6 py-5">
        <p className="text-[40px] font-black leading-none tracking-tight text-[#FFD16A]">
          <span className="mr-3 text-[16px] text-[#81786A]">USD</span>{trip.totalUsd.toLocaleString("en-US")}
        </p>
        <p className="mt-2 text-[17px] font-medium text-[#81786A]">Total gastado</p>
      </div>
    </section>
  );
}

function TripDetailView({
  trip,
  tab,
  onTabChange,
  selectedDate,
  onSelectDate,
  onBack,
}: {
  trip: TripSummary;
  tab: TripTab;
  onTabChange: (tab: TripTab) => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onBack: () => void;
}) {
  return (
    <section className="mx-auto max-w-[1380px] px-5 py-7 pb-28 md:px-6 md:pb-10">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4 md:gap-6">
          <button onClick={onBack} className="flex items-center gap-2 rounded-full border border-[#303030] bg-[#171717] px-4 py-2 text-[14px] font-semibold text-[#D6D0C8]">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div>
            <h1 className="text-[34px] font-black leading-none tracking-tight md:text-[38px]">{trip.name} {trip.year}</h1>
            <p className="mt-3 text-[16px] font-medium text-[#98938D]">{trip.range.replace("26", "2026")} · {trip.days} días</p>
          </div>
        </div>
        <div className="flex gap-2">
          <IconCircle><Upload className="h-5 w-5" /></IconCircle>
          <IconCircle><MoreHorizontal className="h-5 w-5" /></IconCircle>
        </div>
      </div>

      <DesktopHero trip={trip} />

      <section className="overflow-hidden rounded-[18px] border border-[#242424] bg-[#111210]">
        <div className="grid h-14 w-full max-w-[840px] grid-cols-4 bg-[#171817] text-[15px] font-semibold text-[#C6BDAE]">
          {(["calendar", "list", "items", "costs"] as TripTab[]).map((value) => (
            <button
              key={value}
              onClick={() => onTabChange(value)}
              className={tab === value ? "border-b-2 border-[#71D3A6] pt-1 text-white" : "pt-1 hover:text-white"}
            >
              {tabLabel(value)}
            </button>
          ))}
        </div>

        {tab === "calendar" && <CalendarPanel selectedDate={selectedDate} onSelectDate={onSelectDate} />}
        {tab === "list" && <ListPanel />}
        {tab === "items" && <ItemsPanel />}
        {tab === "costs" && <CostsPanel />}
      </section>
    </section>
  );
}

function DesktopHero({ trip }: { trip: TripSummary }) {
  return (
    <section className="mb-7 overflow-hidden rounded-[18px] border border-[#2D483A] bg-[#15130F] shadow-[0_18px_70px_rgba(0,0,0,0.34)]">
      <div className="grid min-h-[190px] md:grid-cols-[260px_1fr]">
        <div className="hidden bg-cover bg-center md:block" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(113,211,166,0.56),rgba(36,68,55,0.58)_36%,rgba(13,13,13,0.98)_100%)]" />
          <div className="relative grid min-h-[190px] items-center gap-5 p-6 md:grid-cols-[1.1fr_128px_repeat(3,112px)_160px]">
            <div>
              <span className="rounded-full bg-[#FFD16A]/18 px-3 py-1 text-[12px] font-black uppercase tracking-[0.1em] text-[#FFD16A]">En curso</span>
              <h2 className="mt-6 text-[36px] font-black leading-none tracking-tight">{trip.name}</h2>
              <p className="mt-3 text-[16px] font-medium text-white/70">Día 2 de tu viaje</p>
            </div>
            <ProgressRing size={104} />
            <DesktopMetric icon={<Plane className="h-6 w-6" />} value="4" label="Viajes este año" />
            <DesktopMetric icon={<MapPin className="h-6 w-6" />} value={String(trip.cities)} label="Ciudades" />
            <DesktopMetric icon={<CalendarDays className="h-6 w-6" />} value={String(trip.days)} label="Días viajando" />
            <div className="border-t border-white/10 pt-4 md:border-l md:border-t-0 md:px-6 md:pt-0">
              <p className="text-[14px] font-semibold text-[#C6BDAE]">USD</p>
              <p className="mt-2 text-[34px] font-black leading-none text-[#FFD16A]">{trip.totalUsd.toLocaleString("en-US")}</p>
              <p className="mt-3 text-[14px] font-medium text-[#81786A]">Total gastado</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarPanel({ selectedDate, onSelectDate }: { selectedDate: string | null; onSelectDate: (date: string) => void }) {
  const cells = useMemo(() => buildCalendarCells(), []);
  const weekdays = [
    { short: "L", long: "Lun" },
    { short: "M", long: "Mar" },
    { short: "X", long: "Mié" },
    { short: "J", long: "Jue" },
    { short: "V", long: "Vie" },
    { short: "S", long: "Sáb" },
    { short: "D", long: "Dom" },
  ];

  return (
    <>
      <div className="border-t border-[#242424] bg-[#181A19] px-2 pb-5 pt-3 md:px-4 md:pb-6 md:pt-4">
        <div className="grid grid-cols-7 gap-[3px] px-1 pb-2 text-center text-[10px] font-semibold text-[#C6BDAE] md:gap-2 md:px-2 md:pb-3 md:text-[15px]">
          {weekdays.map((day) => (
            <span key={day.long}>
              <span className="md:hidden">{day.short}</span>
              <span className="hidden md:inline">{day.long}</span>
            </span>
          ))}
        </div>

        <div className="space-y-[3px] md:space-y-2">
          {cells.map((row, index) => (
            <div key={index} className="grid grid-cols-7 gap-[3px] md:gap-2">
              {row.map((cell) => (
                <CalendarCell
                  key={cell.date}
                  cell={cell}
                  selected={selectedDate === cell.date}
                  onClick={() => onSelectDate(cell.date)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 border-t border-[#242424] px-5 py-4 text-[14px] text-[#C6BDAE] md:text-[15px]">
        {cities.map((city) => (
          <Legend key={city.id} color={city.color} label={city.name} flag={city.flag} />
        ))}
      </div>
    </>
  );
}

function buildCalendarCells(): CalendarCellData[][] {
  return weekDates.map((week) =>
    week.map((date) => {
      const city = cities.find((candidate) => candidate.days.includes(date));
      const dateItems = items.filter((item) => item.date === date);
      return {
        date,
        day: String(Number(date.slice(-2))),
        city,
        cityIndex: city ? city.days.indexOf(date) + 1 : undefined,
        items: dateItems,
        outside: !city && date !== "2026-07-08",
      };
    }),
  );
}

function CalendarCell({
  cell,
  selected,
  onClick,
}: {
  cell: CalendarCellData;
  selected: boolean;
  onClick: () => void;
}) {
  const bg = cell.city
    ? `linear-gradient(145deg, ${cell.city.color}72, rgba(17,18,17,0.94))`
    : "#191A19";
  const shownItems = cell.items.slice(0, 2);
  const overflow = Math.max(cell.items.length - shownItems.length, 0);

  return (
    <button
      onClick={onClick}
      className={`relative min-h-[142px] rounded-[8px] border px-[5px] py-[8px] text-left transition hover:brightness-110 md:min-h-[128px] md:rounded-[12px] md:p-4 ${
        cell.outside ? "opacity-62" : ""
      }`}
      style={{
        background: bg,
        borderColor: selected ? "#FFD16A" : cell.city ? `${cell.city.color}99` : "#2C2C2C",
        boxShadow: selected ? "0 0 0 2px rgba(255,209,106,0.24)" : undefined,
      }}
    >
      {selected && cell.city && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#71D3A6] text-[13px] font-black text-[#06110B] md:h-6 md:w-6">
          ✓
        </span>
      )}
      <p className={`text-[11px] font-semibold leading-none md:text-[18px] ${cell.outside ? "text-[#777]" : "text-white"}`}>
        <span className="md:hidden">{formatCellDate(cell.date)}</span>
        <span className="hidden md:inline">{cell.day}</span>
      </p>
      {cell.city ? (
        <div className="mt-3 space-y-2 text-[#EEE9E1] md:mt-4 md:space-y-1.5 md:text-[15px]">
          <p className="flex flex-col gap-1 md:block">
            <span className="text-[13px] leading-none md:ml-1.5">{cell.city.flag}</span>
            <span className="text-[12px] font-semibold leading-none md:hidden">{cell.city.code}</span>
            <span className="hidden truncate md:inline">{cell.city.name}</span>
          </p>
          <p className="text-[11px] font-medium leading-none md:text-[15px]">{cell.cityIndex}/{cell.city.days.length}</p>
          <div className="space-y-1 text-[10px] leading-none md:text-[13px] md:leading-normal">
            {shownItems.map((item) => (
              <p key={item.id} className="flex items-center gap-1 whitespace-nowrap">
                <span aria-hidden>{itemIcon(item.type)}</span>
                <span>{itemShortLabel(item)}</span>
              </p>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[16px] text-[#777] md:text-[18px]">—</p>
      )}
      {overflow > 0 && (
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/38 px-1.5 py-0.5 text-[10px] font-black md:bottom-3 md:right-3 md:px-2.5 md:py-1 md:text-[12px]">+{overflow}</span>
      )}
    </button>
  );
}

function ListPanel() {
  return (
    <div className="space-y-5 border-t border-[#242424] bg-[#181A19] p-5">
      {["2026-06-23", "2026-06-28", "2026-07-01", "2026-07-04"].map((date) => (
        <div key={date}>
          <p className="mb-2 text-[13px] font-black uppercase tracking-[0.14em] text-[#81786A]">{formatDate(date)}</p>
          <div className="space-y-2">
            {items.filter((item) => item.date === date).map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemsPanel() {
  return (
    <div className="grid gap-3 border-t border-[#242424] bg-[#181A19] p-5 md:grid-cols-2">
      {items.slice(0, 8).map((item) => (
        <ItemRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function CostsPanel() {
  const knownTotal = items.reduce((sum, item) => sum + (item.priceUsd ?? 0), 0);
  return (
    <div className="grid gap-4 border-t border-[#242424] bg-[#181A19] p-5 md:grid-cols-[280px_1fr]">
      <div className="rounded-[16px] border border-[#332E25] bg-[#171512] p-5">
        <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#81786A]">Registrado</p>
        <p className="mt-3 text-[36px] font-black text-[#FFD16A]">USD {knownTotal.toLocaleString("en-US")}</p>
        <p className="mt-2 text-[14px] text-[#C6BDAE]">7 items con costo asociado</p>
      </div>
      <div className="space-y-2">
        {items.filter((item) => item.priceUsd).map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-[14px] border border-[#252119] bg-[#171512] px-4 py-3">
            <span className="font-semibold">{item.title}</span>
            <span className="font-black text-[#FFD16A]">USD {item.priceUsd?.toLocaleString("en-US")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CatalogView() {
  return (
    <section className="mx-auto max-w-[1100px] px-5 py-8 pb-28 md:px-8 md:pb-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[36px] font-black tracking-tight">Catálogo</h1>
          <p className="mt-2 text-[#81786A]">Vuelos, hoteles y transportes del viaje.</p>
        </div>
        <button className="flex items-center gap-2 rounded-full border border-[#252119] bg-[#171512] px-4 py-2 text-[#C6BDAE]">
          <Search className="h-4 w-4" />
          Buscar
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => <ItemRow key={item.id} item={item} />)}
      </div>
    </section>
  );
}

function SettingsView() {
  return (
    <section className="mx-auto max-w-[760px] px-5 py-8 pb-28 md:px-8 md:pb-10">
      <h1 className="text-[36px] font-black tracking-tight">Ajustes</h1>
      <div className="mt-6 space-y-3">
        {["Firebase", "Moneda principal", "Proveedor IA", "Preferencias de calendario"].map((label) => (
          <div key={label} className="flex items-center justify-between rounded-[16px] border border-[#252119] bg-[#171512] px-5 py-4">
            <span className="font-semibold">{label}</span>
            <span className="text-[#81786A]">Configurar</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomNavigation({
  view,
  onChange,
  onAdd,
}: {
  view: View;
  onChange: (view: View) => void;
  onAdd: () => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/8 bg-[#11100D]/96 px-5 pb-5 pt-3 backdrop-blur md:hidden">
      <div className="grid grid-cols-5 items-end text-center">
        <MobileNav active={view === "dashboard"} icon={<Home className="h-7 w-7" />} label="Inicio" onClick={() => onChange("dashboard")} />
        <MobileNav active={view === "trip"} icon={<Send className="h-7 w-7" />} label="Viajes" onClick={() => onChange("trip")} />
        <button onClick={onAdd} className="-mt-11 flex justify-center">
          <span className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[#9C73E6] shadow-[0_0_48px_rgba(156,115,230,0.72)]">
            <Plus className="h-9 w-9 text-white" strokeWidth={2.4} />
          </span>
        </button>
        <MobileNav active={view === "catalog"} icon={<Briefcase className="h-7 w-7" />} label="Catálogo" onClick={() => onChange("catalog")} />
        <MobileNav active={view === "settings"} icon={<Settings className="h-7 w-7" />} label="Ajustes" onClick={() => onChange("settings")} />
      </div>
    </nav>
  );
}

function MobileNav({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 text-[12px] font-bold ${active ? "text-white" : "text-[#81786A]"}`}>
      {icon}
      <span>{label}</span>
      {active && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#FFD16A]" />}
    </button>
  );
}

function DayDrawer({ date, onClose }: { date: string; onClose: () => void }) {
  const dayItems = items.filter((item) => item.date === date);
  const city = cities.find((candidate) => candidate.days.includes(date));
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/64 backdrop-blur-sm md:items-stretch md:justify-end" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Cerrar detalle del día" />
      <aside className="relative w-full max-h-[76vh] overflow-hidden rounded-t-[28px] border border-[#252119] bg-[#11100D] shadow-[0_-24px_80px_rgba(0,0,0,0.58)] md:h-full md:max-h-none md:max-w-[420px] md:rounded-none md:border-y-0 md:border-r-0 md:border-l md:shadow-[0_0_80px_rgba(0,0,0,0.55)]">
        <div className="flex justify-center pt-3 md:hidden">
          <span className="h-1.5 w-12 rounded-full bg-[#3B352B]" />
        </div>
        <div className="max-h-[76vh] overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 md:h-full md:max-h-none md:p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#81786A]">{formatDate(date)}</p>
              <h2 className="mt-2 text-[28px] font-black">{city ? `${city.name} ${city.flag}` : "Sin ciudad"}</h2>
              {city && <p className="mt-2 text-[14px] font-semibold text-[#C6BDAE]">{city.code} · Día {(city.days.indexOf(date) + 1)}/{city.days.length}</p>}
            </div>
            <button onClick={onClose} className="rounded-full border border-[#252119] bg-[#171512] p-2">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 space-y-3">
            {dayItems.length > 0 ? dayItems.map((item) => <ItemRow key={item.id} item={item} />) : (
              <div className="rounded-[16px] border border-dashed border-[#332E25] p-5 text-[#81786A]">No hay items este día.</div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function AiModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-5 backdrop-blur">
      <div className="w-full max-w-[620px] rounded-[22px] border border-[#252119] bg-[#11100D] shadow-[0_30px_120px_rgba(0,0,0,0.62)]">
        <div className="flex items-center justify-between border-b border-[#252119] px-6 py-5">
          <div>
            <h2 className="text-[20px] font-black">Agregar con IA</h2>
            <p className="mt-1 text-[13px] text-[#81786A]">Pegá un email o confirmación de reserva.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-[#252119] bg-[#171512] p-2">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <textarea
            className="h-48 w-full resize-none rounded-[16px] border border-[#332E25] bg-[#171512] p-4 text-white outline-none focus:border-[#A891E8]"
            defaultValue={"Vuelo UX6030 Palma a Madrid el 7/7 a las 18:50. Hotel Viva Blue Alcúdia del 3/7 al 7/7."}
          />
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {["Vuelo detectado 97%", "Hotel detectado 91%", "Traslado sugerido 74%"].map((result) => (
              <div key={result} className="rounded-[14px] border border-[#71D3A6]/24 bg-[#71D3A6]/10 px-4 py-3 text-[13px] font-semibold text-[#9DE6C0]">
                {result}
              </div>
            ))}
          </div>
          <button onClick={onClose} className="mt-5 w-full rounded-[14px] bg-[#A891E8] py-3 font-black text-white">
            Confirmar y agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function TripRow({ trip, onClick }: { trip: TripSummary; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-4 rounded-[18px] border border-[#252119] bg-[#171512] px-4 py-3 text-left">
      <div className="h-[58px] w-[58px] shrink-0 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[18px] font-black md:text-[20px]">
          {trip.name} <span className="text-[15px]">{trip.flag}</span> <span>{trip.year}</span>
        </p>
        <p className="mt-1 text-[14px] font-medium text-[#81786A]">{trip.range}</p>
      </div>
      <div className="text-right">
        <p className="text-[16px] font-black">USD {trip.totalUsd.toLocaleString("en-US")}</p>
        <p className={`mt-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${
          trip.status === "active" ? "bg-[#71D3A6]/18 text-[#8FE1B7]" : "bg-[#6CAFE8]/18 text-[#84C7F2]"
        }`}>
          {trip.status === "active" ? "En curso" : "Futuro"}
        </p>
      </div>
    </button>
  );
}

function ItemRow({ item }: { item: TripItem }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[#252119] bg-[#171512] px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#FFD16A]/12 text-[#FFD16A]">
        {itemIcon(item.type)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{item.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-[#81786A]">{formatDate(item.date)}{item.time ? ` · ${item.time}` : ""} · {item.detail}</p>
      </div>
      {item.priceUsd && <span className="font-black text-[#FFD16A]">USD {item.priceUsd.toLocaleString("en-US")}</span>}
    </div>
  );
}

function IconCircle({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2C2C2C] bg-[#171717]">
      {children}
    </span>
  );
}

function ProgressRing({ size }: { size: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,209,106,0.14)" strokeWidth="12" />
        <circle cx="60" cy="60" r="48" fill="none" stroke="#FFD16A" strokeWidth="12" strokeLinecap="round" strokeDasharray="302" strokeDashoffset="268" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={size > 110 ? "text-[28px] font-black" : "text-[22px] font-black"}>11%</span>
        <span className={size > 110 ? "mt-1 text-[15px] text-[#C6BDAE]" : "mt-1 text-[12px] text-[#C6BDAE]"}>Progreso</span>
      </div>
    </div>
  );
}

function DesktopMetric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="hidden border-l border-white/10 px-4 text-center md:block">
      <div className="flex justify-center text-[#FFD16A]">{icon}</div>
      <p className="mt-3 text-[28px] font-black leading-none">{value}</p>
      <p className="mt-3 text-[12px] leading-tight text-[#C6BDAE]">{label}</p>
    </div>
  );
}

function MetricLine({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#FFD16A]/12 text-[#FFD16A]">{icon}</span>
      <span className="text-[22px] font-black">{value}</span>
      <span className="text-[17px] font-medium text-[#C6BDAE]">{label}</span>
    </div>
  );
}

function Legend({ color, label, flag }: { color: string; label: string; flag: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{flag}</span>
      <span>{label}</span>
    </span>
  );
}

function tabLabel(tab: TripTab): string {
  if (tab === "calendar") return "Calendario";
  if (tab === "list") return "Lista";
  if (tab === "items") return "Items";
  return "Costos";
}

function itemIcon(type: ItemType): string {
  if (type === "flight") return "✈";
  if (type === "hotel") return "🏨";
  return "🚆";
}

function itemShortLabel(item: TripItem): string {
  if (item.time) return item.time;
  if (item.title.includes("HM")) return "HM";
  if (item.title.includes("Jumeirah")) return "JS";
  if (item.title.includes("Viva")) return "Viva";
  if (item.title.includes("Palma Blanc")) return "HM";
  return shortTitle(item.title);
}

function shortTitle(title: string): string {
  return title.split(" ").slice(0, 2).join(" ");
}

function formatCellDate(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
