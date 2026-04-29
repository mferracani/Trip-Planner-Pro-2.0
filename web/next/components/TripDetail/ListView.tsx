"use client";

import { useState } from "react";
import type { Trip, City, Flight, FlightLeg, Hotel, Transport, Expense } from "@/lib/types";
import { FlightForm } from "../forms/FlightForm";
import { HotelForm } from "../forms/HotelForm";
import { TransportForm } from "../forms/TransportForm";
import { ExpenseForm } from "../forms/ExpenseForm";
import { useAuth } from "@/context/AuthContext";
import { deleteFlight, deleteHotel, deleteTransport, deleteExpense, recalcTripAggregates } from "@/lib/firestore";
import { FlightStatusBadge } from "../FlightStatusBadge";

interface Props {
  trip: Trip;
  cities: City[];
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
  expenses?: Expense[];
  onChanged?: () => void;
}

type EditTarget =
  | { kind: "flight"; data: Flight }
  | { kind: "hotel"; data: Hotel }
  | { kind: "transport"; data: Transport }
  | { kind: "expense"; data: Expense }
  | null;

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(localTime?: string): string {
  return localTime?.split("T")[1]?.slice(0, 5) ?? "";
}

function fmtISODate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d ? `${d}-${m}-${y}` : iso;
}

function fmtDate(localTime?: string): string {
  const date = localTime?.split("T")[0];
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function fmtDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtTimestampTime(ts?: { seconds: number } | null): string {
  if (!ts) return "";
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtRelativeMinutes(ts?: { seconds: number } | null): string {
  if (!ts) return "";
  const diffMs = Date.now() - ts.seconds * 1000;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `hace ${hrs}h`;
}

function nightsLabel(checkIn: string, checkOut: string): string {
  const msPerDay = 86400000;
  const n = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay);
  return `${n} noche${n === 1 ? "" : "s"}`;
}

const TRANSPORT_EMOJI: Record<string, string> = {
  train: "🚆", bus: "🚌", ferry: "⛴️", car: "🚗",
  car_rental: "🚙", taxi: "🚕", subway: "🚇", other: "🚐",
};
const TRANSPORT_LABEL: Record<string, string> = {
  train: "Tren", bus: "Bus", ferry: "Ferry", car: "Auto",
  car_rental: "Auto", taxi: "Taxi", subway: "Metro", other: "Transporte",
};
const EXPENSE_EMOJI: Record<string, string> = {
  flight: "✈️", hotel: "🏨", transport: "🚆", food: "🍽️",
  activity: "🎭", shopping: "🛍️", taxi: "🚕", other: "💰",
};
const CABIN_LABEL: Record<string, string> = {
  economy: "Economy", premium_economy: "Premium Economy",
  business: "Business", first: "Primera",
};

// ─── DeleteButton ─────────────────────────────────────────────────────────────

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirming) {
      onDelete();
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3500);
    }
  }
  return (
    <button
      onClick={handleClick}
      className={`flex-1 text-center text-[13px] py-1.5 rounded-[8px] transition-colors ${
        confirming
          ? "text-white bg-[#FF453A] hover:bg-[#FF453A]/90"
          : "text-[#FF453A] bg-[#FF453A]/10 hover:bg-[#FF453A]/20"
      }`}
    >
      {confirming ? "¿Confirmar?" : "Eliminar"}
    </button>
  );
}

// ─── CopyableRef ──────────────────────────────────────────────────────────────

function CopyableRef({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#2A2A2A] border border-[#3A3A3A] hover:border-[#555] transition-colors shrink-0"
      title="Copiar ref"
    >
      <span className="font-mono text-[11px] text-[#B0B0B0] tracking-wider">{value}</span>
      <span className="text-[10px] text-[#666]">{copied ? "✓" : "⎘"}</span>
    </button>
  );
}

// ─── CategoryHeader ───────────────────────────────────────────────────────────

function CategoryHeader({
  emoji,
  label,
  count,
  totalUSD,
}: {
  emoji: string;
  label: string;
  count: number;
  totalUSD: number;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[13px]">{emoji}</span>
        <span className="text-[13px] font-semibold text-[#A0A0A0] uppercase tracking-widest">
          {label}
        </span>
        <span className="text-[11px] text-[#555] font-mono">·{count}</span>
      </div>
      {totalUSD > 0 && (
        <span className="text-[13px] font-semibold text-white tabular-nums">
          ${Math.round(totalUSD).toLocaleString("es-AR")} USD
        </span>
      )}
    </div>
  );
}

// ─── FlightsBlock ─────────────────────────────────────────────────────────────

function FlightsBlock({
  flights,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
}: {
  flights: Flight[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onEdit: (f: Flight) => void;
  onDelete: (f: Flight) => void;
}) {
  const sorted = [...flights].sort((a, b) =>
    (a.departure_local_time ?? "").localeCompare(b.departure_local_time ?? "")
  );
  const totalUSD = flights.reduce((s, f) => s + (f.price_usd ?? 0), 0);

  return (
    <div>
      <CategoryHeader emoji="✈️" label="Vuelos" count={flights.length} totalUSD={totalUSD} />
      <div className="space-y-2">
        {sorted.map((f) => (
          <FlightCard
            key={f.id}
            flight={f}
            isExpanded={expandedId === f.id}
            onToggle={() => onToggle(f.id)}
            onEdit={() => onEdit(f)}
            onDelete={() => onDelete(f)}
          />
        ))}
      </div>
    </div>
  );
}

function FlightCard({
  flight: f,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  flight: Flight;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const outbound = f.legs?.filter((l) => l.direction === "outbound") ?? [];
  const inbound = f.legs?.filter((l) => l.direction === "inbound") ?? [];
  const hasLegs = f.legs && f.legs.length > 0;

  const compactDep = fmtTime(f.departure_local_time);
  const compactArr = fmtTime(f.arrival_local_time);
  const route = hasLegs
    ? `${outbound[0]?.origin_iata ?? f.origin_iata} → ${outbound[outbound.length - 1]?.destination_iata ?? f.destination_iata}`
    : `${f.origin_iata} → ${f.destination_iata}`;

  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] overflow-hidden">
      {/* Compact row — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3 press-feedback"
      >
        <div className="w-9 h-9 rounded-full bg-[#0A84FF]/15 flex items-center justify-center text-lg shrink-0">
          ✈️
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-semibold text-white">{route}</p>
            <FlightStatusBadge flight={f} />
          </div>
          <p className="text-[13px] text-[#A0A0A0]">
            {f.airline} {f.flight_number}
            {compactDep ? ` · ${compactDep}` : ""}
            {compactArr ? ` → ${compactArr}` : ""}
            {f.duration_minutes ? ` · ${fmtDuration(f.duration_minutes)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {f.booking_ref && <CopyableRef value={f.booking_ref} />}
          <span className="text-[#555] text-[12px] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-[#2A2A2A] px-4 py-3 space-y-3">
          {/* Legs */}
          {hasLegs ? (
            <div className="space-y-3">
              {outbound.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-1.5">Ida</p>
                  <div className="space-y-2">
                    {outbound.map((leg, i) => <LegDetail key={i} leg={leg} />)}
                  </div>
                </div>
              )}
              {inbound.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-1.5">Vuelta</p>
                  <div className="space-y-2">
                    {inbound.map((leg, i) => <LegDetail key={i} leg={leg} />)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
              <DetailField label="Origen" value={f.origin_iata} />
              <DetailField label="Destino" value={f.destination_iata} />
              <DetailField label="Salida" value={`${fmtDate(f.departure_local_time)} ${fmtTime(f.departure_local_time)}`} />
              <DetailField label="Llegada" value={`${fmtDate(f.arrival_local_time)} ${fmtTime(f.arrival_local_time)}`} />
              <DetailField label="Duración" value={fmtDuration(f.duration_minutes)} />
              {f.cabin_class && <DetailField label="Clase" value={CABIN_LABEL[f.cabin_class] ?? f.cabin_class} />}
              {f.seat && <DetailField label="Asiento" value={f.seat} />}
            </div>
          )}

          {/* Gate / Terminal info (v1.1 tracking) */}
          {(f.current_terminal_departure || f.current_gate_departure || f.current_terminal_arrival || f.current_gate_arrival) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-[#2A2A2A]">
              {(f.current_terminal_departure || f.current_gate_departure) && (
                <span className="text-[12px] text-[#A0A0A0]">
                  <span className="text-[#555]">Salida</span>{" "}
                  {[
                    f.current_terminal_departure ? `Terminal ${f.current_terminal_departure}` : null,
                    f.current_gate_departure ? `Puerta ${f.current_gate_departure}` : null,
                  ].filter(Boolean).join(" · ")}
                </span>
              )}
              {(f.current_terminal_arrival || f.current_gate_arrival) && (
                <span className="text-[12px] text-[#A0A0A0]">
                  <span className="text-[#555]">Llegada</span>{" "}
                  {[
                    f.current_terminal_arrival ? `Terminal ${f.current_terminal_arrival}` : null,
                    f.current_gate_arrival ? `Puerta ${f.current_gate_arrival}` : null,
                  ].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
          )}

          {/* Estimated times (v1.1 tracking — shown when delayed or active) */}
          {(f.estimated_departure_utc || f.estimated_arrival_utc) && (
            <div className="pt-2 border-t border-[#2A2A2A] space-y-1">
              <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Horario estimado</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {f.estimated_departure_utc && (
                  <span className="text-[12px] text-[#F29E7D]">
                    <span className="text-[#555]">Salida</span>{" "}
                    {fmtTimestampTime(f.estimated_departure_utc)}
                    {" "}
                    <span className="text-[#555] text-[11px]">(UTC)</span>
                  </span>
                )}
                {f.estimated_arrival_utc && (
                  <span className="text-[12px] text-[#F29E7D]">
                    <span className="text-[#555]">Llegada</span>{" "}
                    {fmtTimestampTime(f.estimated_arrival_utc)}
                    {" "}
                    <span className="text-[#555] text-[11px]">(UTC)</span>
                  </span>
                )}
              </div>
              {f.last_tracking_update && (
                <p className="text-[11px] text-[#555]">
                  Actualizado {fmtRelativeMinutes(f.last_tracking_update)}
                </p>
              )}
            </div>
          )}

          {/* Price row */}
          {(f.price || f.price_usd) && (
            <div className="flex items-center gap-3 text-[13px] pt-1 border-t border-[#2A2A2A]">
              {f.price && f.currency && (
                <span className="text-[#A0A0A0]">{f.currency} {f.price.toLocaleString("es-AR")}</span>
              )}
              {f.price_usd && (
                <span className="text-white font-semibold">${Math.round(f.price_usd).toLocaleString("es-AR")} USD</span>
              )}
              {f.paid_amount != null && f.paid_amount > 0 && (
                <span className="text-[#30D158] ml-auto">Pagado: {f.currency} {f.paid_amount.toLocaleString("es-AR")}</span>
              )}
            </div>
          )}

          {/* Edit / Delete row */}
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex-1 text-center text-[13px] text-[#0A84FF] py-1.5 rounded-[8px] bg-[#0A84FF]/10 hover:bg-[#0A84FF]/20 transition-colors"
            >
              Editar vuelo
            </button>
            <DeleteButton onDelete={onDelete} />
          </div>
        </div>
      )}
    </div>
  );
}

function LegDetail({ leg }: { leg: FlightLeg }) {
  const dep = fmtTime(leg.departure_local_time);
  const arr = fmtTime(leg.arrival_local_time);
  const depDate = fmtDate(leg.departure_local_time);
  return (
    <div className="bg-[#222] rounded-[10px] px-3 py-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
      <DetailField label="Vuelo" value={`${leg.airline} ${leg.flight_number}`} />
      <DetailField label="Ruta" value={`${leg.origin_iata} → ${leg.destination_iata}`} />
      <DetailField label="Salida" value={`${depDate} ${dep}`} />
      <DetailField label="Llegada" value={fmtTime(leg.arrival_local_time)} />
      <DetailField label="Duración" value={fmtDuration(leg.duration_minutes)} />
      {leg.cabin_class && <DetailField label="Clase" value={CABIN_LABEL[leg.cabin_class] ?? leg.cabin_class} />}
      {leg.seat && <DetailField label="Asiento" value={leg.seat} />}
    </div>
  );
}

// ─── HotelsBlock ──────────────────────────────────────────────────────────────

function HotelsBlock({
  hotels,
  cities,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
}: {
  hotels: Hotel[];
  cities: City[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onEdit: (h: Hotel) => void;
  onDelete: (h: Hotel) => void;
}) {
  const sorted = [...hotels].sort((a, b) => a.check_in.localeCompare(b.check_in));
  const totalUSD = hotels.reduce((s, h) => s + (h.total_price_usd ?? 0), 0);
  const cityMap: Record<string, City> = {};
  for (const c of cities) cityMap[c.id] = c;

  return (
    <div>
      <CategoryHeader emoji="🏨" label="Hoteles" count={hotels.length} totalUSD={totalUSD} />
      <div className="space-y-2">
        {sorted.map((h) => (
          <HotelCard
            key={h.id}
            hotel={h}
            city={h.city_id ? cityMap[h.city_id] : undefined}
            isExpanded={expandedId === h.id}
            onToggle={() => onToggle(h.id)}
            onEdit={() => onEdit(h)}
            onDelete={() => onDelete(h)}
          />
        ))}
      </div>
    </div>
  );
}

function HotelCard({
  hotel: h,
  city,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  hotel: Hotel;
  city?: City;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3 press-feedback"
      >
        <div className="w-9 h-9 rounded-full bg-[#FF9F0A]/15 flex items-center justify-center text-lg shrink-0">🏨</div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-white truncate">{h.name}</p>
          <p className="text-[13px] text-[#A0A0A0]">
            {fmtISODate(h.check_in)} → {fmtISODate(h.check_out)} · {nightsLabel(h.check_in, h.check_out)}
            {city ? ` · ${city.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {h.booking_ref && <CopyableRef value={h.booking_ref} />}
          <span className="text-[#555] text-[12px] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#2A2A2A] px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            <DetailField label="Check-in" value={fmtISODate(h.check_in)} />
            <DetailField label="Check-out" value={fmtISODate(h.check_out)} />
            <DetailField label="Noches" value={nightsLabel(h.check_in, h.check_out)} />
            {h.room_type && <DetailField label="Habitación" value={h.room_type} />}
            {city && <DetailField label="Ciudad" value={city.name} />}
          </div>
          {(h.total_price || h.total_price_usd) && (
            <div className="flex items-center gap-3 text-[13px] pt-1 border-t border-[#2A2A2A]">
              {h.total_price && h.currency && (
                <span className="text-[#A0A0A0]">{h.currency} {h.total_price.toLocaleString("es-AR")}</span>
              )}
              {h.total_price_usd && (
                <span className="text-white font-semibold">${Math.round(h.total_price_usd).toLocaleString("es-AR")} USD</span>
              )}
              {h.paid_amount != null && h.paid_amount > 0 && (
                <span className="text-[#30D158] ml-auto">Pagado: {h.currency} {h.paid_amount.toLocaleString("es-AR")}</span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex-1 text-center text-[13px] text-[#FF9F0A] py-1.5 rounded-[8px] bg-[#FF9F0A]/10 hover:bg-[#FF9F0A]/20 transition-colors"
            >
              Editar hotel
            </button>
            <DeleteButton onDelete={onDelete} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TransportsBlock ──────────────────────────────────────────────────────────

function TransportsBlock({
  transports,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
  isCarRental = false,
}: {
  transports: Transport[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onEdit: (t: Transport) => void;
  onDelete: (t: Transport) => void;
  isCarRental?: boolean;
}) {
  const sorted = [...transports].sort((a, b) =>
    (a.departure_local_time ?? "").localeCompare(b.departure_local_time ?? "")
  );
  const totalUSD = transports.reduce((s, t) => s + (t.price_usd ?? 0), 0);
  const emoji = isCarRental ? "🚙" : "🚆";
  const label = isCarRental ? "Alquileres" : "Transportes";

  return (
    <div>
      <CategoryHeader emoji={emoji} label={label} count={transports.length} totalUSD={totalUSD} />
      <div className="space-y-2">
        {sorted.map((t) => (
          <TransportCard
            key={t.id}
            transport={t}
            isExpanded={expandedId === t.id}
            onToggle={() => onToggle(t.id)}
            onEdit={() => onEdit(t)}
            onDelete={() => onDelete(t)}
          />
        ))}
      </div>
    </div>
  );
}

function TransportCard({
  transport: t,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  transport: Transport;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dep = fmtTime(t.departure_local_time);
  const arr = fmtTime(t.arrival_local_time);
  const emoji = TRANSPORT_EMOJI[t.type] ?? "🚐";

  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3 press-feedback"
      >
        <div className="w-9 h-9 rounded-full bg-[#BF5AF2]/15 flex items-center justify-center text-lg shrink-0">{emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-white truncate">
            {t.origin} → {t.destination}
          </p>
          <p className="text-[13px] text-[#A0A0A0]">
            {TRANSPORT_LABEL[t.type] ?? "Transporte"}
            {dep ? ` · ${dep}` : ""}
            {arr ? ` → ${arr}` : ""}
            {t.operator ? ` · ${t.operator}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {t.booking_ref && <CopyableRef value={t.booking_ref} />}
          <span className="text-[#555] text-[12px] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#2A2A2A] px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            <DetailField label="Origen" value={t.origin} />
            <DetailField label="Destino" value={t.destination} />
            {dep && <DetailField label="Salida" value={`${fmtDate(t.departure_local_time)} ${dep}`} />}
            {arr && <DetailField label="Llegada" value={arr} />}
            {t.operator && <DetailField label="Operador" value={t.operator} />}
          </div>
          {(t.price || t.price_usd) && (
            <div className="flex items-center gap-3 text-[13px] pt-1 border-t border-[#2A2A2A]">
              {t.price && t.currency && (
                <span className="text-[#A0A0A0]">{t.currency} {t.price.toLocaleString("es-AR")}</span>
              )}
              {t.price_usd && (
                <span className="text-white font-semibold">${Math.round(t.price_usd).toLocaleString("es-AR")} USD</span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex-1 text-center text-[13px] text-[#BF5AF2] py-1.5 rounded-[8px] bg-[#BF5AF2]/10 hover:bg-[#BF5AF2]/20 transition-colors"
            >
              Editar transporte
            </button>
            <DeleteButton onDelete={onDelete} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ExpensesBlock ────────────────────────────────────────────────────────────

function ExpensesBlock({
  expenses,
  expandedId,
  onToggle,
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}) {
  const sorted = [...expenses].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const totalUSD = expenses.reduce((s, e) => s + (e.amount_usd ?? 0), 0);

  return (
    <div>
      <CategoryHeader emoji="💰" label="Otros gastos" count={expenses.length} totalUSD={totalUSD} />
      <div className="space-y-2">
        {sorted.map((e) => (
          <ExpenseCard
            key={e.id}
            expense={e}
            isExpanded={expandedId === e.id}
            onToggle={() => onToggle(e.id)}
            onEdit={() => onEdit(e)}
            onDelete={() => onDelete(e)}
          />
        ))}
      </div>
    </div>
  );
}

function ExpenseCard({
  expense: e,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const emoji = EXPENSE_EMOJI[e.category] ?? "💰";
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3 press-feedback"
      >
        <div className="w-9 h-9 rounded-full bg-[#30D158]/10 flex items-center justify-center text-lg shrink-0">{emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-white truncate">{e.title}</p>
          <p className="text-[13px] text-[#A0A0A0]">
            {e.category}
            {e.date ? ` · ${fmtISODate(e.date)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[14px] font-semibold text-white tabular-nums">
            {e.currency} {e.amount.toLocaleString("es-AR")}
          </span>
          <span className="text-[#555] text-[12px] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#2A2A2A] px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            <DetailField label="Categoría" value={e.category} />
            {e.date && <DetailField label="Fecha" value={fmtISODate(e.date)} />}
            <DetailField label="Monto" value={`${e.currency} ${e.amount.toLocaleString("es-AR")}`} />
            {e.amount_usd && <DetailField label="USD" value={`$${Math.round(e.amount_usd)}`} />}
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e2) => { e2.stopPropagation(); onEdit(); }}
              className="flex-1 text-center text-[13px] text-[#30D158] py-1.5 rounded-[8px] bg-[#30D158]/10 hover:bg-[#30D158]/20 transition-colors"
            >
              Editar gasto
            </button>
            <DeleteButton onDelete={onDelete} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DetailField ──────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] text-[#555] uppercase tracking-wider">{label}</p>
      <p className="text-[13px] text-[#D0D0D0] font-medium">{value}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ListView({ trip, cities, flights, hotels, transports, expenses = [], onChanged }: Props) {
  const { user, ownerUid } = useAuth();
  const [editing, setEditing] = useState<EditTarget>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleSaved() {
    setEditing(null);
    onChanged?.();
  }

  async function handleDeleteFlight(id: string) {
    const uid = ownerUid ?? user?.uid;
    if (!uid) return;
    await deleteFlight(uid, trip.id, id);
    await recalcTripAggregates(uid, trip.id);
    onChanged?.();
  }

  async function handleDeleteHotel(id: string) {
    const uid = ownerUid ?? user?.uid;
    if (!uid) return;
    await deleteHotel(uid, trip.id, id);
    await recalcTripAggregates(uid, trip.id);
    onChanged?.();
  }

  async function handleDeleteTransport(id: string) {
    const uid = ownerUid ?? user?.uid;
    if (!uid) return;
    await deleteTransport(uid, trip.id, id);
    await recalcTripAggregates(uid, trip.id);
    onChanged?.();
  }

  async function handleDeleteExpense(id: string) {
    const uid = ownerUid ?? user?.uid;
    if (!uid) return;
    await deleteExpense(uid, trip.id, id);
    await recalcTripAggregates(uid, trip.id);
    onChanged?.();
  }

  const regularTransports = transports.filter((t) => t.type !== "car_rental");
  const carRentals = transports.filter((t) => t.type === "car_rental");
  const unlinkedExpenses = expenses.filter((e) => !e.linked_item_id);
  const hasAny =
    flights.length > 0 ||
    hotels.length > 0 ||
    transports.length > 0 ||
    unlinkedExpenses.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-4xl">📋</span>
        <p className="text-[#707070] text-[15px]">Todavía no hay items. Usá ✨ para agregar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="px-6 md:px-8 space-y-8 pb-32 md:pb-8">
        {flights.length > 0 && (
          <FlightsBlock
            flights={flights}
            expandedId={expandedId}
            onToggle={toggleExpand}
            onEdit={(f) => setEditing({ kind: "flight", data: f })}
            onDelete={(f) => handleDeleteFlight(f.id)}
          />
        )}
        {hotels.length > 0 && (
          <HotelsBlock
            hotels={hotels}
            cities={cities}
            expandedId={expandedId}
            onToggle={toggleExpand}
            onEdit={(h) => setEditing({ kind: "hotel", data: h })}
            onDelete={(h) => handleDeleteHotel(h.id)}
          />
        )}
        {regularTransports.length > 0 && (
          <TransportsBlock
            transports={regularTransports}
            expandedId={expandedId}
            onToggle={toggleExpand}
            onEdit={(t) => setEditing({ kind: "transport", data: t })}
            onDelete={(t) => handleDeleteTransport(t.id)}
          />
        )}
        {carRentals.length > 0 && (
          <TransportsBlock
            transports={carRentals}
            expandedId={expandedId}
            onToggle={toggleExpand}
            onEdit={(t) => setEditing({ kind: "transport", data: t })}
            onDelete={(t) => handleDeleteTransport(t.id)}
            isCarRental
          />
        )}
        {unlinkedExpenses.length > 0 && (
          <ExpensesBlock
            expenses={unlinkedExpenses}
            expandedId={expandedId}
            onToggle={toggleExpand}
            onEdit={(e) => setEditing({ kind: "expense", data: e })}
            onDelete={(e) => handleDeleteExpense(e.id)}
          />
        )}
      </div>

      {editing?.kind === "flight" && (
        <FlightForm
          tripId={trip.id}
          existing={editing.data}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
      {editing?.kind === "hotel" && (
        <HotelForm
          tripId={trip.id}
          cities={cities}
          existing={editing.data}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
      {editing?.kind === "transport" && (
        <TransportForm
          tripId={trip.id}
          existing={editing.data}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
      {editing?.kind === "expense" && (
        <ExpenseForm
          tripId={trip.id}
          existing={editing.data}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
