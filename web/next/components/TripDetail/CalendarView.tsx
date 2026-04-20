"use client";

import { useState } from "react";
import { Trip, City, Flight, Hotel, Transport } from "@/lib/types";

interface Props {
  trip: Trip;
  cities: City[];
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Returns ISO date string "2026-03-15" for a given Date
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Returns Monday of the week containing the given date
function getMondayOf(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

// Generate all weeks (Mon→Sun) covering the trip
function buildWeeks(startDate: string, endDate: string): string[][] {
  const monday = getMondayOf(startDate);
  const lastDay = new Date(endDate + "T00:00:00");
  const weeks: string[][] = [];

  let current = new Date(monday);
  while (current <= lastDay) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(toDateStr(new Date(current)));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

interface DayItems {
  flights: { id: string; time: string; label: string }[];
  hotels: { id: string; label: string }[];
  transports: { id: string; time: string; label: string }[];
}

function buildDayItemsMap(
  flights: Flight[],
  hotels: Hotel[],
  transports: Transport[]
): Record<string, DayItems> {
  const map: Record<string, DayItems> = {};

  function ensure(d: string) {
    if (!map[d]) map[d] = { flights: [], hotels: [], transports: [] };
  }

  // Flights: show on departure day AND arrival day
  for (const f of flights) {
    const depDate = f.departure_local_time?.split("T")[0];
    const arrDate = f.arrival_local_time?.split("T")[0];
    const depTime = f.departure_local_time?.split("T")[1]?.slice(0, 5) ?? "";
    const arrTime = f.arrival_local_time?.split("T")[1]?.slice(0, 5) ?? "";

    if (depDate) {
      ensure(depDate);
      map[depDate].flights.push({ id: f.id, time: depTime, label: `✈ ${depTime}` });
    }
    if (arrDate && arrDate !== depDate) {
      ensure(arrDate);
      map[arrDate].flights.push({
        id: f.id + "_arr",
        time: arrTime,
        label: `✈ ${arrTime} ${f.destination_iata ?? ""}`,
      });
    }
  }

  // Hotels: show on each night (check_in to check_out exclusive)
  for (const h of hotels) {
    const start = new Date(h.check_in + "T00:00:00");
    const end = new Date(h.check_out + "T00:00:00");
    const brand = h.brand ?? h.name.split(" ").slice(0, 1).join(" ");
    let cur = new Date(start);
    while (cur < end) {
      const d = toDateStr(cur);
      ensure(d);
      map[d].hotels.push({ id: h.id + "_" + d, label: `🏨 ${brand}` });
      cur.setDate(cur.getDate() + 1);
    }
  }

  // Transports: show on departure day
  for (const t of transports) {
    const depDate = t.departure_local_time?.split("T")[0];
    const depTime = t.departure_local_time?.split("T")[1]?.slice(0, 5) ?? "";
    if (depDate) {
      ensure(depDate);
      map[depDate].transports.push({ id: t.id, time: depTime, label: `🚆 ${depTime}` });
    }
  }

  return map;
}

export function CalendarView({ trip, cities, flights, hotels, transports }: Props) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const weeks = buildWeeks(trip.start_date, trip.end_date);
  const dayItemsMap = buildDayItemsMap(flights, hotels, transports);

  // City color map: date -> city
  const dateCityMap: Record<string, City> = {};
  for (const city of cities) {
    for (const d of city.days ?? []) {
      dateCityMap[d] = city;
    }
  }

  return (
    <div className="px-3 md:px-6">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[11px] font-medium text-[#707070] py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map((dateStr) => {
              const inRange = dateStr >= trip.start_date && dateStr <= trip.end_date;
              const city = dateCityMap[dateStr];
              const items = dayItemsMap[dateStr];
              const isSelected = selectedDay === dateStr;
              const dayNum = parseInt(dateStr.split("-")[2]);

              return (
                <DayCell
                  key={dateStr}
                  dateStr={dateStr}
                  dayNum={dayNum}
                  inRange={inRange}
                  city={city}
                  items={items}
                  isSelected={isSelected}
                  onTap={() => inRange && setSelectedDay(isSelected ? null : dateStr)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* City legend */}
      {cities.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 px-1">
          {cities.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="text-[12px] text-[#A0A0A0]">{c.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Day detail drawer */}
      {selectedDay && (
        <DayDetailSheet
          dateStr={selectedDay}
          city={dateCityMap[selectedDay]}
          items={dayItemsMap[selectedDay]}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}

interface DayCellProps {
  dateStr: string;
  dayNum: number;
  inRange: boolean;
  city?: City;
  items?: DayItems;
  isSelected: boolean;
  onTap: () => void;
}

function DayCell({ dateStr, dayNum, inRange, city, items, isSelected, onTap }: DayCellProps) {
  const cityBg = city ? `${city.color}24` : undefined; // 14% opacity
  const cityBorder = city ? `${city.color}4D` : "#333333"; // 30% opacity

  const allBadges = [
    ...(items?.flights ?? []).map((f) => ({ key: f.id, label: f.label, type: "flight" as const })),
    ...(items?.hotels ?? []).map((h) => ({ key: h.id, label: h.label, type: "hotel" as const })),
    ...(items?.transports ?? []).map((t) => ({ key: t.id, label: t.label, type: "transport" as const })),
  ].slice(0, 3);

  return (
    <button
      onClick={onTap}
      disabled={!inRange}
      role="button"
      aria-label={`${dateStr}${city ? ` — ${city.name}` : ""}`}
      className={`
        flex flex-col rounded-[10px] border px-1 pt-1.5 pb-1
        min-h-[92px] md:h-[120px] w-full text-left
        transition-transform active:scale-95
        ${inRange ? "cursor-pointer" : "opacity-30 cursor-default"}
        ${isSelected ? "border-[#0A84FF] border-2" : ""}
        focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:ring-offset-1 focus:ring-offset-[#0D0D0D]
      `}
      style={{
        backgroundColor: cityBg ?? "#1A1A1A",
        borderColor: isSelected ? "#0A84FF" : cityBorder,
      }}
    >
      {/* Day number */}
      <span className="text-[13px] md:text-[15px] font-bold text-white leading-none px-0.5">
        {dayNum}
      </span>

      {/* Badges */}
      <div className="flex flex-col gap-[3px] mt-1 flex-1">
        {allBadges.map((b) => (
          <ItemBadge key={b.key} label={b.label} type={b.type} />
        ))}
      </div>

      {/* City tag */}
      {city && (
        <div
          className="mt-auto text-[9px] md:text-[10px] font-bold uppercase tracking-wide px-0.5 truncate"
          style={{ color: city.color }}
        >
          {city.name}
        </div>
      )}
    </button>
  );
}

function ItemBadge({ label, type }: { label: string; type: "flight" | "hotel" | "transport" }) {
  const styles = {
    flight: "bg-[#0A84FF33] text-[#60A5FA]",
    hotel: "bg-[#FF9F0A2E] text-[#FBBF24]",
    transport: "bg-[#BF5AF233] text-[#D8B4FE]",
  };

  return (
    <span
      className={`text-[9px] md:text-[11px] font-semibold px-1 py-0.5 rounded-[4px] truncate leading-tight ${styles[type]}`}
    >
      {label}
    </span>
  );
}

function DayDetailSheet({
  dateStr,
  city,
  items,
  onClose,
}: {
  dateStr: string;
  city?: City;
  items?: DayItems;
  onClose: () => void;
}) {
  const date = new Date(dateStr + "T00:00:00");
  const label = date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  const allItems = [
    ...(items?.flights ?? []).map((f) => ({ key: f.id, label: f.label, type: "flight" as const })),
    ...(items?.hotels ?? []).map((h) => ({ key: h.id, label: h.label, type: "hotel" as const })),
    ...(items?.transports ?? []).map((t) => ({ key: t.id, label: t.label, type: "transport" as const })),
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[8px]" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-[#1A1A1A] rounded-t-[20px] p-6 pb-10"
        style={{ animation: "slideUp 300ms cubic-bezier(0.32,0.72,0,1) both" }}
      >
        {/* Handle */}
        <div className="w-9 h-1 bg-[#333] rounded-full mx-auto mb-5" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[20px] font-semibold text-white capitalize">{label}</h3>
            {city && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: city.color }} />
                <span className="text-[14px] text-[#A0A0A0]">{city.name}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-[#A0A0A0] text-[15px]">Cerrar</button>
        </div>

        {allItems.length === 0 ? (
          <div className="text-center py-8 text-[#707070] text-[15px]">
            Sin items en este día.
          </div>
        ) : (
          <div className="space-y-2">
            {allItems.map((item) => (
              <div
                key={item.key}
                className="bg-[#242424] rounded-[12px] px-4 py-3 flex items-center gap-3"
              >
                <span className="text-[20px]">
                  {item.type === "flight" ? "✈️" : item.type === "hotel" ? "🏨" : "🚆"}
                </span>
                <span className="text-[15px] text-white">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <button className="w-full mt-5 bg-[#BF5AF2]/20 border border-[#BF5AF2]/30 text-[#BF5AF2] rounded-[12px] py-3.5 text-[15px] font-semibold">
          ✨ Agregar al día
        </button>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
