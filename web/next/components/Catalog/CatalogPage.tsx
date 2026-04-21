"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  getAllFlights,
  getAllHotels,
  getAllTransports,
  getCities,
  type FlightWithTrip,
  type HotelWithTrip,
  type TransportWithTrip,
} from "@/lib/firestore";
import type { City } from "@/lib/types";
import { TopNav } from "../TopNav";
import { BottomNav } from "../BottomNav";
import { CreateTripModal } from "../CreateTripModal";
import { FlightForm } from "../forms/FlightForm";
import { HotelForm } from "../forms/HotelForm";
import { TransportForm } from "../forms/TransportForm";
import { Plane, Hotel as HotelIcon, Car, Train, Bus, Ship, Search } from "lucide-react";

type Tab = "flights" | "hotels" | "transports";
type TransportFilter = "all" | "train" | "car" | "bus" | "ferry" | "taxi" | "subway" | "other";

// ─── date helpers ────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function fmtTime(iso?: string | null): string {
  if (!iso) return "";
  const t = iso.split("T")[1]?.slice(0, 5);
  return t ?? "";
}

function fmtDateShort(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function nightsBetween(a?: string, b?: string): number {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000));
}

// ─── page ────────────────────────────────────────────────────────────────────

export function CatalogPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("flights");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <TopNav active="catalog" onAdd={() => setCreateOpen(true)} addLabel="Nuevo viaje" />

      {/* Mobile header */}
      <div className="md:hidden px-6 pt-14 pb-4">
        <p className="text-[#707070] text-[11px] uppercase tracking-[0.18em] font-semibold mb-1.5">Catálogo</p>
        <h1 className="text-[26px] font-bold text-white tracking-tight">Todos los items</h1>
      </div>

      <div className="mx-auto max-w-6xl px-6 md:px-8 pb-32 md:pb-16">
        {/* Desktop header */}
        <div className="hidden md:block pt-10 pb-6">
          <p className="text-[#707070] text-[11px] uppercase tracking-[0.18em] font-semibold mb-1.5">Catálogo</p>
          <h1 className="text-[38px] font-bold text-white tracking-tight">Todos los items</h1>
          <p className="text-[#A0A0A0] text-[14px] mt-1.5">
            Vuelos, hoteles y traslados de todos tus viajes en un solo lugar.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2 mt-4 mb-6 border-b border-[#1E1E1E]">
          <TabBtn active={tab === "flights"} onClick={() => setTab("flights")} icon={<Plane size={14} />} label="Vuelos" />
          <TabBtn active={tab === "hotels"} onClick={() => setTab("hotels")} icon={<HotelIcon size={14} />} label="Hoteles" />
          <TabBtn active={tab === "transports"} onClick={() => setTab("transports")} icon={<Car size={14} />} label="Traslados" />
        </div>

        {user && tab === "flights" && <FlightsList uid={user.uid} />}
        {user && tab === "hotels" && <HotelsList uid={user.uid} />}
        {user && tab === "transports" && <TransportsList uid={user.uid} />}
      </div>

      <BottomNav active="catalog" onAdd={() => setCreateOpen(true)} />

      {createOpen && (
        <CreateTripModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
        active ? "text-white" : "text-[#707070] hover:text-[#A0A0A0]"
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#BF5AF2] rounded-full" />
      )}
    </button>
  );
}

// ─── Search box ──────────────────────────────────────────────────────────────

function SearchBox({ value, onChange, count, placeholder }: { value: string; onChange: (v: string) => void; count: number; placeholder: string }) {
  return (
    <div className="mb-4">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4D4D4D]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#161616] border border-[#2A2A2A] rounded-[12px] pl-9 pr-4 py-2.5 text-white text-[14px] placeholder-[#4D4D4D] outline-none focus:border-[#BF5AF2] transition-colors"
        />
      </div>
      <p className="text-[#4D4D4D] text-[11px] mt-1.5">
        {count} resultado{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

// ─── Flights ─────────────────────────────────────────────────────────────────

function FlightsList({ uid }: { uid: string }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<FlightWithTrip | null>(null);
  const { data: flights = [], isLoading, refetch } = useQuery({
    queryKey: ["all_flights", uid],
    queryFn: () => getAllFlights(uid),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flights;
    return flights.filter((f) =>
      [f.airline, f.flight_number, f.origin_iata, f.destination_iata, f.booking_ref, f.trip_name, f.seat]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(q))
    );
  }, [flights, search]);

  if (isLoading) return <Loading />;

  return (
    <>
      <SearchBox
        value={search}
        onChange={setSearch}
        count={filtered.length}
        placeholder="Buscar por aerolínea, IATA, booking, viaje…"
      />
      <div className="space-y-2">
        {filtered.length === 0 && <EmptyState msg="Sin resultados" />}
        {filtered.map((f) => (
          <FlightRow key={f.id} flight={f} onClick={() => setEditing(f)} />
        ))}
      </div>

      {editing && (
        <FlightForm
          tripId={editing.trip_id}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
    </>
  );
}

function FlightRow({ flight: f, onClick }: { flight: FlightWithTrip; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#141414] hover:bg-[#181818] border border-[#1E1E1E] hover:border-[#2A2A2A] rounded-[14px] px-4 py-3.5 transition-colors press-feedback"
    >
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-[#4D96FF20] flex items-center justify-center flex-shrink-0">
          <Plane size={16} className="text-[#4D96FF]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-[14px]">
              {f.origin_iata} → {f.destination_iata}
            </span>
            <span className="text-[#707070] text-[12px]">·</span>
            <span className="text-[#A0A0A0] text-[12px]">
              {f.airline} {f.flight_number}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11.5px] text-[#707070]">
            <span>{fmtDate(f.departure_local_time)}</span>
            {fmtTime(f.departure_local_time) && (
              <>
                <span>·</span>
                <span>
                  {fmtTime(f.departure_local_time)} → {fmtTime(f.arrival_local_time)}
                </span>
              </>
            )}
            {f.booking_ref && (
              <>
                <span>·</span>
                <span className="text-[#BF5AF2] font-mono">{f.booking_ref}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[11px] text-[#4D4D4D] uppercase tracking-wider font-semibold">
            {f.trip_name}
          </p>
          {f.price_usd != null && (
            <p className="text-[13px] text-[#30D158] font-semibold mt-0.5">
              USD {Math.round(f.price_usd).toLocaleString("es-AR")}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Hotels ──────────────────────────────────────────────────────────────────

function HotelsList({ uid }: { uid: string }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<HotelWithTrip | null>(null);
  const [editingCities, setEditingCities] = useState<City[]>([]);
  const { data: hotels = [], isLoading, refetch } = useQuery({
    queryKey: ["all_hotels", uid],
    queryFn: () => getAllHotels(uid),
  });

  async function openHotel(h: HotelWithTrip) {
    const cities = await getCities(uid, h.trip_id);
    setEditingCities(cities);
    setEditing(h);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter((h) =>
      [h.name, h.brand, h.city_name, h.booking_ref, h.trip_name]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(q))
    );
  }, [hotels, search]);

  if (isLoading) return <Loading />;

  return (
    <>
      <SearchBox
        value={search}
        onChange={setSearch}
        count={filtered.length}
        placeholder="Buscar por hotel, ciudad, booking…"
      />
      <div className="space-y-2">
        {filtered.length === 0 && <EmptyState msg="Sin resultados" />}
        {filtered.map((h) => (
          <HotelRow key={h.id} hotel={h} onClick={() => openHotel(h)} />
        ))}
      </div>

      {editing && (
        <HotelForm
          tripId={editing.trip_id}
          cities={editingCities}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
    </>
  );
}

function HotelRow({ hotel: h, onClick }: { hotel: HotelWithTrip; onClick: () => void }) {
  const nights = nightsBetween(h.check_in, h.check_out);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#141414] hover:bg-[#181818] border border-[#1E1E1E] hover:border-[#2A2A2A] rounded-[14px] px-4 py-3.5 transition-colors press-feedback"
    >
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-[#FFD93D20] flex items-center justify-center flex-shrink-0">
          <HotelIcon size={16} className="text-[#FFD93D]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-[14px]">{h.name}</span>
            {h.city_name && (
              <>
                <span className="text-[#707070] text-[12px]">·</span>
                <span className="text-[#A0A0A0] text-[12px]">{h.city_name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11.5px] text-[#707070]">
            <span>{fmtDateShort(h.check_in)} → {fmtDateShort(h.check_out)}</span>
            <span>·</span>
            <span>{nights} {nights === 1 ? "noche" : "noches"}</span>
            {h.booking_ref && (
              <>
                <span>·</span>
                <span className="text-[#BF5AF2] font-mono">{h.booking_ref}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[11px] text-[#4D4D4D] uppercase tracking-wider font-semibold">
            {h.trip_name}
          </p>
          {h.total_price_usd != null && (
            <p className="text-[13px] text-[#30D158] font-semibold mt-0.5">
              USD {Math.round(h.total_price_usd).toLocaleString("es-AR")}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Transports ──────────────────────────────────────────────────────────────

const TRANSPORT_FILTERS: { value: TransportFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "Todos", icon: <Car size={12} /> },
  { value: "car", label: "Autos", icon: <Car size={12} /> },
  { value: "train", label: "Trenes", icon: <Train size={12} /> },
  { value: "bus", label: "Bus", icon: <Bus size={12} /> },
  { value: "ferry", label: "Ferry", icon: <Ship size={12} /> },
  { value: "taxi", label: "Taxi", icon: <Car size={12} /> },
  { value: "subway", label: "Metro", icon: <Train size={12} /> },
  { value: "other", label: "Otro", icon: <Car size={12} /> },
];

function TransportsList({ uid }: { uid: string }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TransportFilter>("all");
  const [editing, setEditing] = useState<TransportWithTrip | null>(null);
  const { data: transports = [], isLoading, refetch } = useQuery({
    queryKey: ["all_transports", uid],
    queryFn: () => getAllTransports(uid),
  });

  const filtered = useMemo(() => {
    let list = transports;
    if (filter !== "all") list = list.filter((t) => t.type === filter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) =>
      [t.operator, t.origin, t.destination, t.booking_ref, t.trip_name, t.type]
        .filter(Boolean)
        .some((v) => v!.toString().toLowerCase().includes(q))
    );
  }, [transports, search, filter]);

  if (isLoading) return <Loading />;

  return (
    <>
      <SearchBox
        value={search}
        onChange={setSearch}
        count={filtered.length}
        placeholder="Buscar por operador, origen, destino…"
      />

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap mb-4 -mt-2">
        {TRANSPORT_FILTERS.map((f) => {
          const count = f.value === "all"
            ? transports.length
            : transports.filter((t) => t.type === f.value).length;
          if (f.value !== "all" && count === 0) return null;
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
              style={{
                background: active ? "#BF5AF220" : "#141414",
                color: active ? "#BF5AF2" : "#707070",
                border: `1px solid ${active ? "#BF5AF240" : "#1E1E1E"}`,
              }}
            >
              {f.icon}
              <span>{f.label}</span>
              <span className={active ? "text-[#BF5AF2]" : "text-[#4D4D4D]"}>· {count}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <EmptyState msg="Sin resultados" />}
        {filtered.map((t) => (
          <TransportRow key={t.id} transport={t} onClick={() => setEditing(t)} />
        ))}
      </div>

      {editing && (
        <TransportForm
          tripId={editing.trip_id}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
    </>
  );
}

const TRANSPORT_TYPE_LABELS: Record<string, string> = {
  train: "Tren",
  bus: "Bus",
  ferry: "Ferry",
  car: "Auto / rental",
  taxi: "Taxi",
  subway: "Metro",
  other: "Otro",
};

function transportIcon(type: string) {
  const iconProps = { size: 16, className: "text-[#4ECDC4]" };
  if (type === "train" || type === "subway") return <Train {...iconProps} />;
  if (type === "bus") return <Bus {...iconProps} />;
  if (type === "ferry") return <Ship {...iconProps} />;
  return <Car {...iconProps} />;
}

function TransportRow({ transport: t, onClick }: { transport: TransportWithTrip; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#141414] hover:bg-[#181818] border border-[#1E1E1E] hover:border-[#2A2A2A] rounded-[14px] px-4 py-3.5 transition-colors press-feedback"
    >
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-[#4ECDC420] flex items-center justify-center flex-shrink-0">
          {transportIcon(t.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-[14px]">
              {t.operator || `${t.origin} → ${t.destination}`}
            </span>
            <span className="text-[#707070] text-[12px]">·</span>
            <span className="text-[#A0A0A0] text-[12px]">
              {TRANSPORT_TYPE_LABELS[t.type] ?? t.type}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11.5px] text-[#707070]">
            <span>{fmtDate(t.departure_local_time)}</span>
            {t.origin && t.destination && (
              <>
                <span>·</span>
                <span className="truncate">{t.origin} → {t.destination}</span>
              </>
            )}
            {t.booking_ref && (
              <>
                <span>·</span>
                <span className="text-[#BF5AF2] font-mono">{t.booking_ref}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[11px] text-[#4D4D4D] uppercase tracking-wider font-semibold">
            {t.trip_name}
          </p>
          {t.price_usd != null && (
            <p className="text-[13px] text-[#30D158] font-semibold mt-0.5">
              USD {Math.round(t.price_usd).toLocaleString("es-AR")}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── shared ──────────────────────────────────────────────────────────────────

function Loading() {
  return <div className="text-[#707070] text-[13px] py-8 text-center">Cargando…</div>;
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="text-[#4D4D4D] text-[13px] py-8 text-center border border-dashed border-[#1E1E1E] rounded-[12px]">
      {msg}
    </div>
  );
}
