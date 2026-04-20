"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getExpenses } from "@/lib/firestore";
import type { Trip, City, Flight, Hotel, Transport, Expense } from "@/lib/types";
import { CityForm } from "../forms/CityForm";
import { FlightForm } from "../forms/FlightForm";
import { HotelForm } from "../forms/HotelForm";
import { TransportForm } from "../forms/TransportForm";
import { ExpenseForm } from "../forms/ExpenseForm";

type SubTab = "flights" | "hotels" | "transports" | "cities" | "expenses";

const SUBTABS: { value: SubTab; label: string; emoji: string }[] = [
  { value: "flights", label: "Vuelos", emoji: "✈️" },
  { value: "hotels", label: "Hoteles", emoji: "🏨" },
  { value: "transports", label: "Transportes", emoji: "🚆" },
  { value: "cities", label: "Ciudades", emoji: "🏙️" },
  { value: "expenses", label: "Gastos", emoji: "💵" },
];

interface Props {
  trip: Trip;
  cities: City[];
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
  onChanged: () => void;
}

type EditTarget =
  | { kind: "city"; data?: City }
  | { kind: "flight"; data?: Flight }
  | { kind: "hotel"; data?: Hotel }
  | { kind: "transport"; data?: Transport }
  | { kind: "expense"; data?: Expense }
  | null;

export function ItemsView({ trip, cities, flights, hotels, transports, onChanged }: Props) {
  const { user } = useAuth();
  const [sub, setSub] = useState<SubTab>("flights");
  const [editing, setEditing] = useState<EditTarget>(null);

  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ["expenses", user?.uid, trip.id],
    queryFn: () => getExpenses(user!.uid, trip.id),
    enabled: !!user,
  });

  function handleSaved() {
    setEditing(null);
    onChanged();
    refetchExpenses();
  }

  function openNew() {
    switch (sub) {
      case "flights":
        setEditing({ kind: "flight" });
        break;
      case "hotels":
        setEditing({ kind: "hotel" });
        break;
      case "transports":
        setEditing({ kind: "transport" });
        break;
      case "cities":
        setEditing({ kind: "city" });
        break;
      case "expenses":
        setEditing({ kind: "expense" });
        break;
    }
  }

  const subTabIndex = SUBTABS.findIndex((s) => s.value === sub);
  const addLabel =
    sub === "flights"
      ? "+ Vuelo"
      : sub === "hotels"
      ? "+ Hotel"
      : sub === "transports"
      ? "+ Transporte"
      : sub === "cities"
      ? "+ Ciudad"
      : "+ Gasto";

  return (
    <div className="pb-32 md:pb-8">
      {/* Subtabs — horizontal scroll */}
      <div className="px-4 md:px-8 overflow-x-auto scrollbar-hide">
        <div className="relative inline-flex gap-1 bg-[#1A1A1A] p-1 rounded-full border border-[#262626]">
          <span
            className="absolute top-1 bottom-1 rounded-full bg-[#242424] pointer-events-none transition-all"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
              width: `calc((100% - 8px) / ${SUBTABS.length})`,
              left: `calc(4px + ${subTabIndex} * (100% - 8px) / ${SUBTABS.length})`,
              transitionDuration: "320ms",
              transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
          {SUBTABS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSub(s.value)}
              className={`relative px-4 py-2 text-[13px] font-semibold rounded-full transition-colors whitespace-nowrap ${
                sub === s.value ? "text-white" : "text-[#707070]"
              }`}
            >
              <span className="mr-1">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add button */}
      <div className="px-6 md:px-8 pt-4">
        <button
          onClick={openNew}
          className="w-full py-3 rounded-[12px] border border-dashed border-[#262626] text-[14px] font-semibold text-[#A0A0A0] hover:border-[#0A84FF]/60 hover:text-[#0A84FF] hover:bg-[#0A84FF]/[0.03] transition-colors"
        >
          {addLabel}
        </button>
      </div>

      {/* Content */}
      <div className="px-6 md:px-8 pt-4">
        {sub === "flights" && (
          <ItemList
            items={flights}
            empty="Todavía no hay vuelos."
            render={(f) => <FlightRow flight={f} />}
            onClick={(f) => setEditing({ kind: "flight", data: f })}
          />
        )}
        {sub === "hotels" && (
          <ItemList
            items={hotels}
            empty="Todavía no hay hoteles."
            render={(h) => <HotelRow hotel={h} />}
            onClick={(h) => setEditing({ kind: "hotel", data: h })}
          />
        )}
        {sub === "transports" && (
          <ItemList
            items={transports}
            empty="Todavía no hay transportes."
            render={(t) => <TransportRow transport={t} />}
            onClick={(t) => setEditing({ kind: "transport", data: t })}
          />
        )}
        {sub === "cities" && (
          <ItemList
            items={cities}
            empty="Todavía no hay ciudades."
            render={(c) => <CityRow city={c} />}
            onClick={(c) => setEditing({ kind: "city", data: c })}
          />
        )}
        {sub === "expenses" && (
          <>
            <ExpensesSummary expenses={expenses} />
            <ItemList
              items={expenses}
              empty="Todavía no hay gastos."
              render={(e) => <ExpenseRow expense={e} />}
              onClick={(e) => setEditing({ kind: "expense", data: e })}
            />
          </>
        )}
      </div>

      {/* Form modals */}
      {editing?.kind === "city" && (
        <CityForm
          tripId={trip.id}
          tripStart={trip.start_date}
          tripEnd={trip.end_date}
          usedColors={cities.map((c) => c.color)}
          existing={editing.data}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
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
    </div>
  );
}

function ItemList<T extends { id: string }>({
  items,
  empty,
  render,
  onClick,
}: {
  items: T[];
  empty: string;
  render: (item: T) => React.ReactNode;
  onClick: (item: T) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-[#707070] text-[14px]">{empty}</div>
    );
  }
  return (
    <div className="space-y-2 mt-3">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onClick(it)}
          className="w-full text-left bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 flex items-center gap-3 hover:border-[#0A84FF]/40 transition-colors"
        >
          {render(it)}
        </button>
      ))}
    </div>
  );
}

function FlightRow({ flight }: { flight: Flight }) {
  const dep = flight.departure_local_time?.split("T")[1]?.slice(0, 5) ?? "";
  const depDate = flight.departure_local_time?.split("T")[0] ?? "";
  return (
    <>
      <div className="w-10 h-10 rounded-full bg-[#0A84FF]/15 flex items-center justify-center text-xl flex-shrink-0">✈️</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white truncate">
          {flight.airline} {flight.flight_number} · {flight.origin_iata}→{flight.destination_iata}
        </p>
        <p className="text-[13px] text-[#A0A0A0]">
          {depDate} {dep}
          {flight.duration_minutes ? ` · ${Math.floor(flight.duration_minutes / 60)}h ${flight.duration_minutes % 60}m` : ""}
        </p>
      </div>
      <span className="text-[#707070] text-[16px]">›</span>
    </>
  );
}

function HotelRow({ hotel }: { hotel: Hotel }) {
  return (
    <>
      <div className="w-10 h-10 rounded-full bg-[#FF9F0A]/15 flex items-center justify-center text-xl flex-shrink-0">🏨</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white truncate">{hotel.name}</p>
        <p className="text-[13px] text-[#A0A0A0]">
          {hotel.check_in} → {hotel.check_out}
          {hotel.room_type ? ` · ${hotel.room_type}` : ""}
        </p>
      </div>
      <span className="text-[#707070] text-[16px]">›</span>
    </>
  );
}

function TransportRow({ transport }: { transport: Transport }) {
  const dep = transport.departure_local_time?.split("T")[1]?.slice(0, 5) ?? "";
  const depDate = transport.departure_local_time?.split("T")[0] ?? "";
  const emoji = { train: "🚆", bus: "🚌", ferry: "⛴️", car: "🚗", taxi: "🚕", subway: "🚇", other: "🚐" }[transport.type] ?? "🚐";
  return (
    <>
      <div className="w-10 h-10 rounded-full bg-[#BF5AF2]/15 flex items-center justify-center text-xl flex-shrink-0">{emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white truncate">
          {transport.origin} → {transport.destination}
        </p>
        <p className="text-[13px] text-[#A0A0A0]">
          {depDate} {dep}
          {transport.operator ? ` · ${transport.operator}` : ""}
        </p>
      </div>
      <span className="text-[#707070] text-[16px]">›</span>
    </>
  );
}

function CityRow({ city }: { city: City }) {
  return (
    <>
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: `${city.color}25` }}
      >
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: city.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white truncate">{city.name}</p>
        <p className="text-[13px] text-[#A0A0A0]">
          {city.days?.length ?? 0} día{(city.days?.length ?? 0) === 1 ? "" : "s"} · {city.timezone}
        </p>
      </div>
      <span className="text-[#707070] text-[16px]">›</span>
    </>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const emoji =
    { flight: "✈️", hotel: "🏨", transport: "🚆", food: "🍽️", activity: "🎫", shopping: "🛍️", other: "📌" }[
      expense.category
    ] ?? "📌";
  return (
    <>
      <div className="w-10 h-10 rounded-full bg-[#30D158]/15 flex items-center justify-center text-xl flex-shrink-0">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white truncate">{expense.title}</p>
        <p className="text-[13px] text-[#A0A0A0]">
          {expense.date} · {expense.category}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[14px] font-bold text-white tabular-nums">
          {expense.amount.toLocaleString("es-AR")} {expense.currency}
        </p>
        {expense.currency !== "USD" && expense.amount_usd > 0 && (
          <p className="text-[11px] text-[#707070] tabular-nums">
            ≈ USD {expense.amount_usd.toLocaleString("es-AR")}
          </p>
        )}
      </div>
    </>
  );
}

function ExpensesSummary({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) return null;
  const totalUsd = expenses.reduce((s, e) => s + (e.amount_usd || 0), 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + (e.amount_usd || 0);
  }
  return (
    <div
      className="rounded-[14px] px-5 py-4 mt-2"
      style={{
        background: "linear-gradient(180deg, #1A1A1A 0%, #141414 100%)",
        border: "1px solid #262626",
      }}
    >
      <p className="text-[10px] uppercase tracking-wider text-[#707070] font-bold mb-1">Total gastado</p>
      <p className="text-[24px] font-bold text-white tabular-nums">
        USD <span className="text-[#30D158]">{totalUsd.toLocaleString("es-AR")}</span>
      </p>
      <p className="text-[12px] text-[#707070] mt-1">{expenses.length} gasto{expenses.length === 1 ? "" : "s"}</p>
    </div>
  );
}
