"use client";

import { useState } from "react";
import type { Trip, City, Flight, FlightLeg, Hotel, Transport, Expense } from "@/lib/types";
import { FlightForm } from "../forms/FlightForm";
import { HotelForm } from "../forms/HotelForm";
import { TransportForm } from "../forms/TransportForm";
import { ExpenseForm } from "../forms/ExpenseForm";

interface Props {
  trip: Trip;
  cities: City[];
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
  expenses?: Expense[];
  onChanged?: () => void;
}

interface DayGroup {
  date: string;
  city?: City;
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
  expenses: Expense[];
}

type EditTarget =
  | { kind: "flight"; data: Flight }
  | { kind: "hotel"; data: Hotel }
  | { kind: "transport"; data: Transport }
  | { kind: "expense"; data: Expense }
  | null;

function buildDayGroups(
  trip: Trip,
  cities: City[],
  flights: Flight[],
  hotels: Hotel[],
  transports: Transport[],
  expenses: Expense[]
): DayGroup[] {
  const dateCityMap: Record<string, City> = {};
  for (const c of cities) {
    for (const d of c.days ?? []) dateCityMap[d] = c;
  }

  const dates: string[] = [];
  const cur = new Date(trip.start_date + "T00:00:00");
  const end = new Date(trip.end_date + "T00:00:00");
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }

  return dates
    .map((date) => ({
      date,
      city: dateCityMap[date],
      flights: flights.filter((f) => {
        if (f.departure_local_time?.startsWith(date)) return true;
        return f.legs?.some((l) => l.departure_local_time?.startsWith(date)) ?? false;
      }),
      hotels: hotels.filter((h) => h.check_in <= date && h.check_out > date),
      transports: transports.filter((t) => t.departure_local_time?.startsWith(date)),
      expenses: expenses.filter((e) => e.date === date && !e.linked_item_id),
    }))
    .filter(
      (g) =>
        g.flights.length > 0 ||
        g.hotels.length > 0 ||
        g.transports.length > 0 ||
        g.expenses.length > 0
    );
}

export function ListView({ trip, cities, flights, hotels, transports, expenses = [], onChanged }: Props) {
  const [editing, setEditing] = useState<EditTarget>(null);
  const groups = buildDayGroups(trip, cities, flights, hotels, transports, expenses);

  function handleSaved() {
    setEditing(null);
    onChanged?.();
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-4xl">📋</span>
        <p className="text-[#707070] text-[15px]">Todavía no hay items. Usá ✨ para agregar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="px-6 md:px-8 space-y-6 pb-32 md:pb-8">
        {groups.map((group) => {
          const date = new Date(group.date + "T00:00:00");
          const label = date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

          return (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-1 h-5 rounded-full"
                  style={{ backgroundColor: group.city?.color ?? "#333" }}
                />
                <div>
                  <p className="text-[15px] font-semibold text-white capitalize">{label}</p>
                  {group.city && (
                    <p className="text-[12px] text-[#A0A0A0]">{group.city.name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {group.flights.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setEditing({ kind: "flight", data: f })}
                    className="w-full text-left press-feedback"
                  >
                    <FlightRow flight={f} date={group.date} />
                  </button>
                ))}
                {group.hotels.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setEditing({ kind: "hotel", data: h })}
                    className="w-full text-left press-feedback"
                  >
                    <HotelRow hotel={h} />
                  </button>
                ))}
                {group.transports.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditing({ kind: "transport", data: t })}
                    className="w-full text-left press-feedback"
                  >
                    <TransportRow transport={t} />
                  </button>
                ))}
                {group.expenses.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setEditing({ kind: "expense", data: e })}
                    className="w-full text-left press-feedback"
                  >
                    <ExpenseRow expense={e} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit forms */}
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

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtLegTime(localTime: string): string {
  return localTime?.split("T")[1]?.slice(0, 5) ?? "";
}

function fmtLegDate(localTime: string): string {
  const date = localTime?.split("T")[0];
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function LegLine({ leg }: { leg: FlightLeg }) {
  const dep = fmtLegTime(leg.departure_local_time);
  const arr = fmtLegTime(leg.arrival_local_time);
  const date = fmtLegDate(leg.departure_local_time);
  return (
    <p className="text-[13px] text-[#A0A0A0]">
      {leg.flight_number}
      {date ? ` · ${date}` : ""}
      {dep ? ` · ${dep}` : ""}
      {arr ? ` → ${arr}` : ""}
      {leg.duration_minutes > 0 ? ` · ${fmtDuration(leg.duration_minutes)}` : ""}
    </p>
  );
}

function FlightRow({ flight, date }: { flight: Flight; date: string }) {
  if (flight.legs && flight.legs.length > 0) {
    const dayLegs = flight.legs.filter((l) => l.departure_local_time?.startsWith(date));

    if (dayLegs.length > 0) {
      return (
        <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0A84FF]/15 flex items-center justify-center text-xl shrink-0">
            ✈️
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {dayLegs.map((leg, i) => {
              const dep = fmtLegTime(leg.departure_local_time);
              const arr = fmtLegTime(leg.arrival_local_time);
              const arrDate = leg.arrival_local_time?.split("T")[0];
              const isReturn = leg.direction === "inbound";
              const nextDay = arrDate && arrDate !== date;
              return (
                <div key={i}>
                  <p className="text-[15px] font-semibold text-white">
                    {isReturn && <span className="mr-1 opacity-60">↩</span>}
                    {leg.origin_iata} → {leg.destination_iata}
                  </p>
                  <p className="text-[13px] text-[#A0A0A0]">
                    {leg.flight_number}
                    {dep ? ` · ${dep}` : ""}
                    {arr ? ` → ${arr}` : ""}
                    {nextDay ? ` (+1)` : ""}
                    {leg.duration_minutes > 0 ? ` · ${fmtDuration(leg.duration_minutes)}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Fallback: full card (root departure day)
    const outbound = flight.legs.filter((l) => l.direction === "outbound");
    const inbound = flight.legs.filter((l) => l.direction === "inbound");
    const outFirst = outbound[0];
    const outLast = outbound[outbound.length - 1];
    const outRoute = outbound.length > 0
      ? outbound.map((l) => l.origin_iata).join(" → ") + " → " + (outLast?.destination_iata ?? "")
      : "";
    const outTotal = outFirst && outLast
      ? fmtLegTime(outFirst.departure_local_time) + " → " + fmtLegTime(outLast.arrival_local_time)
      : "";
    const outTotalMins = outFirst && outLast
      ? Math.round((outLast.arrival_utc.toMillis() - outFirst.departure_utc.toMillis()) / 60000)
      : 0;

    return (
      <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#0A84FF]/15 flex items-center justify-center text-xl shrink-0">✈️</div>
        <div className="flex-1 min-w-0 space-y-2">
          {outbound.length > 0 && (
            <div>
              <p className="text-[15px] font-semibold text-white">
                {outRoute}
                {outbound.length > 1 && (
                  <span className="ml-2 text-[11px] font-normal text-[#0A84FF] bg-[#0A84FF]/15 rounded px-1.5 py-0.5">
                    {outbound.length} tramos
                  </span>
                )}
              </p>
              {outTotal && (
                <p className="text-[13px] text-[#A0A0A0]">
                  {outTotal}
                  {outTotalMins > 0 ? ` · ${fmtDuration(outTotalMins)} total` : ""}
                </p>
              )}
              {outbound.length > 1 && outbound.map((leg, i) => <LegLine key={i} leg={leg} />)}
            </div>
          )}
          {inbound.length > 0 && (
            <div className="pt-1 border-t border-[#2A2A2A]">
              {inbound.map((leg, i) => {
                const dep = fmtLegTime(leg.departure_local_time);
                const arr = fmtLegTime(leg.arrival_local_time);
                const legDate = fmtLegDate(leg.departure_local_time);
                return (
                  <div key={i}>
                    <p className="text-[14px] font-semibold text-[#A0A0A0]">
                      <span className="mr-1 text-[#A0A0A0]">↩</span>
                      {leg.origin_iata} → {leg.destination_iata}
                    </p>
                    <p className="text-[13px] text-[#707070]">
                      {leg.flight_number}
                      {legDate ? ` · ${legDate}` : ""}
                      {dep ? ` · ${dep}` : ""}
                      {arr ? ` → ${arr}` : ""}
                      {leg.duration_minutes > 0 ? ` · ${fmtDuration(leg.duration_minutes)}` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Legacy mono-leg doc
  const dep = flight.departure_local_time?.split("T")[1]?.slice(0, 5) ?? "";
  const arr = flight.arrival_local_time?.split("T")[1]?.slice(0, 5) ?? "";
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#0A84FF]/15 flex items-center justify-center text-xl">✈️</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white">
          {flight.airline} {flight.flight_number} · {flight.origin_iata}→{flight.destination_iata}
        </p>
        <p className="text-[13px] text-[#A0A0A0]">
          {dep} → {arr}
          {flight.duration_minutes ? ` · ${fmtDuration(flight.duration_minutes)}` : ""}
        </p>
      </div>
    </div>
  );
}

function HotelRow({ hotel }: { hotel: Hotel }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#FF9F0A]/15 flex items-center justify-center text-xl">🏨</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white">{hotel.name}</p>
        <p className="text-[13px] text-[#A0A0A0]">
          {hotel.check_in} → {hotel.check_out}
          {hotel.room_type ? ` · ${hotel.room_type}` : ""}
        </p>
      </div>
    </div>
  );
}

function TransportRow({ transport }: { transport: Transport }) {
  const dep = transport.departure_local_time?.split("T")[1]?.slice(0, 5) ?? "";
  const emoji = ({ train: "🚆", bus: "🚌", ferry: "⛴️", car: "🚗", taxi: "🚕", subway: "🚇", other: "🚐" } as Record<string, string>)[transport.type] ?? "🚐";
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#BF5AF2]/15 flex items-center justify-center text-xl">{emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white">
          {transport.origin} → {transport.destination}
        </p>
        <p className="text-[13px] text-[#A0A0A0]">
          {dep}
          {transport.operator ? ` · ${transport.operator}` : ""}
        </p>
      </div>
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const EMOJI: Record<string, string> = {
    flight: "✈️", hotel: "🏨", transport: "🚆", food: "🍽️",
    activity: "🎭", shopping: "🛍️", taxi: "🚕", other: "💰",
  };
  const emoji = EMOJI[expense.category] ?? "💰";
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#30D158]/10 flex items-center justify-center text-xl">{emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white">{expense.title}</p>
        <p className="text-[13px] text-[#A0A0A0]">{expense.category}</p>
      </div>
      <p className="text-[14px] font-semibold text-white tabular-nums">
        {expense.currency} {expense.amount.toLocaleString("es-AR")}
      </p>
    </div>
  );
}
