"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { Trip, City, Flight, Hotel, Transport } from "@/lib/types";

interface Props {
  trip: Trip;
  cities: City[];
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const LONG_PRESS_MS = 380;

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getMondayOf(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function buildWeeks(startDate: string, endDate: string): string[][] {
  const monday = getMondayOf(startDate);
  const lastDay = new Date(endDate + "T00:00:00");
  const weeks: string[][] = [];
  const current = new Date(monday);
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
  hotels: { id: string; label: string; isFirst: boolean }[];
  transports: { id: string; time: string; label: string }[];
}

function buildDayItemsMap(
  flights: Flight[],
  hotels: Hotel[],
  transports: Transport[],
): Record<string, DayItems> {
  const map: Record<string, DayItems> = {};

  function ensure(d: string) {
    if (!map[d]) map[d] = { flights: [], hotels: [], transports: [] };
  }

  for (const f of flights) {
    const depDate = f.departure_local_time?.split("T")[0];
    const arrDate = f.arrival_local_time?.split("T")[0];
    const depTime = f.departure_local_time?.split("T")[1]?.slice(0, 5) ?? "";
    const arrTime = f.arrival_local_time?.split("T")[1]?.slice(0, 5) ?? "";
    if (depDate) {
      ensure(depDate);
      map[depDate].flights.push({
        id: f.id,
        time: depTime,
        label: `${depTime} ${f.destination_iata ?? ""}`.trim(),
      });
    }
    if (arrDate && arrDate !== depDate) {
      ensure(arrDate);
      map[arrDate].flights.push({
        id: f.id + "_arr",
        time: arrTime,
        label: `${arrTime} ${f.destination_iata ?? ""}`.trim(),
      });
    }
  }

  for (const h of hotels) {
    const start = new Date(h.check_in + "T00:00:00");
    const end = new Date(h.check_out + "T00:00:00");
    const brand = h.brand ?? h.name.split(" ").slice(0, 2).join(" ");
    const cur = new Date(start);
    let isFirst = true;
    while (cur < end) {
      const d = toDateStr(cur);
      ensure(d);
      map[d].hotels.push({ id: h.id + "_" + d, label: brand, isFirst });
      isFirst = false;
      cur.setDate(cur.getDate() + 1);
    }
  }

  for (const t of transports) {
    const depDate = t.departure_local_time?.split("T")[0];
    const depTime = t.departure_local_time?.split("T")[1]?.slice(0, 5) ?? "";
    if (depDate) {
      ensure(depDate);
      map[depDate].transports.push({ id: t.id, time: depTime, label: depTime });
    }
  }

  return map;
}

interface SelectionStats {
  count: number;
  hasEmpty: boolean;
  hasCity: boolean;
  cities: City[];
}

export function CalendarView({ trip, cities, flights, hotels, transports }: Props) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [filterCity, setFilterCity] = useState<City | null>(null);

  const longPressTimer = useRef<number | null>(null);
  const dragStartDate = useRef<string | null>(null);
  const isDragging = useRef(false);

  const todayStr = toDateStr(new Date());
  const weeks = buildWeeks(trip.start_date, trip.end_date);
  const dayItemsMap = buildDayItemsMap(flights, hotels, transports);

  const dateCityMap: Record<string, City> = {};
  for (const city of cities) {
    for (const d of city.days ?? []) {
      dateCityMap[d] = city;
    }
  }

  const inSelectionMode = selection.size > 0;

  function clearSelection() {
    setSelection(new Set());
    isDragging.current = false;
    dragStartDate.current = null;
  }

  function toggleDay(dateStr: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  }

  function setRangeFromStart(endDate: string) {
    if (!dragStartDate.current) return;
    const start = dragStartDate.current;
    const [a, b] = start <= endDate ? [start, endDate] : [endDate, start];
    const newSelection = new Set<string>();
    for (const week of weeks) {
      for (const d of week) {
        if (d >= trip.start_date && d <= trip.end_date && d >= a && d <= b) {
          newSelection.add(d);
        }
      }
    }
    setSelection(newSelection);
  }

  function handlePointerDown(dateStr: string, inRange: boolean, e: ReactPointerEvent<HTMLElement>) {
    if (!inRange) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    dragStartDate.current = dateStr;
    if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      setSelection(new Set([dateStr]));
      isDragging.current = true;
      longPressTimer.current = null;
      if (navigator.vibrate) navigator.vibrate(12);
    }, LONG_PRESS_MS);
  }

  function handlePointerEnter(dateStr: string) {
    if (!isDragging.current) return;
    setRangeFromStart(dateStr);
  }

  function handlePointerUp(dateStr: string, inRange: boolean) {
    const wasDragging = isDragging.current;
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isDragging.current = false;
    dragStartDate.current = null;

    if (!inRange) return;

    if (wasDragging) {
      return;
    }

    if (inSelectionMode) {
      toggleDay(dateStr);
    } else {
      setSelectedDay(dateStr);
    }
  }

  useEffect(() => {
    function onGlobalUp() {
      if (longPressTimer.current !== null) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      isDragging.current = false;
    }
    window.addEventListener("pointerup", onGlobalUp);
    window.addEventListener("pointercancel", onGlobalUp);
    return () => {
      window.removeEventListener("pointerup", onGlobalUp);
      window.removeEventListener("pointercancel", onGlobalUp);
    };
  }, []);

  const selectionStats: SelectionStats = (() => {
    if (selection.size === 0) return { count: 0, hasEmpty: false, hasCity: false, cities: [] };
    let hasEmpty = false;
    let hasCity = false;
    const cityIds = new Set<string>();
    for (const d of selection) {
      const city = dateCityMap[d];
      if (!city) hasEmpty = true;
      else {
        hasCity = true;
        cityIds.add(city.id);
      }
    }
    return {
      count: selection.size,
      hasEmpty,
      hasCity,
      cities: Array.from(cityIds)
        .map((id) => cities.find((c) => c.id === id))
        .filter((c): c is City => !!c),
    };
  })();

  return (
    <div className="px-3 md:px-6 pb-32" style={{ userSelect: inSelectionMode ? "none" : "auto" }}>
      {/* Hint bar — selection mode */}
      {inSelectionMode && (
        <div className="mb-3 px-3 py-2 bg-[#0A84FF]/12 border border-[#0A84FF]/30 rounded-[10px] text-[12px] text-[#0A84FF] font-medium text-center animate-fade-slide-up">
          {selection.size} día{selection.size === 1 ? "" : "s"} · mantené y arrastrá para extender
        </div>
      )}

      {/* Filter city hint */}
      {filterCity && !inSelectionMode && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-[10px] animate-fade-slide-up" style={{ backgroundColor: `${filterCity.color}15`, border: `1px solid ${filterCity.color}40` }}>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: filterCity.color }} />
          <span className="text-[12px] font-semibold flex-1" style={{ color: filterCity.color }}>
            Filtrando {filterCity.name.toUpperCase()}
          </span>
          <button onClick={() => setFilterCity(null)} className="text-[#A0A0A0] text-[16px] leading-none press-feedback">×</button>
        </div>
      )}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-semibold text-[#4D4D4D] uppercase tracking-wide py-1.5">
            {day}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-1" style={{ touchAction: inSelectionMode ? "none" : "auto" }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((dateStr) => {
              const inRange = dateStr >= trip.start_date && dateStr <= trip.end_date;
              const city = dateCityMap[dateStr];
              const items = dayItemsMap[dateStr];
              const isSelected = selection.has(dateStr);
              const isToday = dateStr === todayStr;
              const dayNum = parseInt(dateStr.split("-")[2]);
              const dimmed = !!filterCity && (!city || city.id !== filterCity.id);

              return (
                <DayCell
                  key={dateStr}
                  dateStr={dateStr}
                  dayNum={dayNum}
                  inRange={inRange}
                  city={city}
                  items={items}
                  isSelected={isSelected}
                  isToday={isToday}
                  dimmed={dimmed}
                  onPointerDown={(e) => handlePointerDown(dateStr, inRange, e)}
                  onPointerEnter={() => handlePointerEnter(dateStr)}
                  onPointerUp={() => handlePointerUp(dateStr, inRange)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* City legend — tap to filter */}
      {cities.length > 0 && !inSelectionMode && (
        <div className="flex flex-wrap gap-2 mt-5 px-1">
          {cities.map((c) => {
            const isActive = filterCity?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFilterCity(isActive ? null : c)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide press-feedback transition-all"
                style={{
                  backgroundColor: isActive ? `${c.color}40` : `${c.color}20`,
                  color: c.color,
                  boxShadow: isActive ? `0 0 0 1px ${c.color}` : undefined,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Day detail sheet */}
      {selectedDay && !inSelectionMode && (
        <DayDetailSheet
          dateStr={selectedDay}
          city={dateCityMap[selectedDay]}
          items={dayItemsMap[selectedDay]}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Selection action bar */}
      {inSelectionMode && (
        <SelectionActionBar
          stats={selectionStats}
          onClose={clearSelection}
          onFilterCity={(c) => {
            setFilterCity(c);
            clearSelection();
          }}
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
  isToday: boolean;
  dimmed: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerEnter: () => void;
  onPointerUp: () => void;
}

function DayCell({
  dateStr,
  dayNum,
  inRange,
  city,
  items,
  isSelected,
  isToday,
  dimmed,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
}: DayCellProps) {
  const bg = city ? `${city.color}24` : "#1A1A1A";
  const selectionColor = city?.color ?? "#0A84FF";
  const borderColor = isSelected
    ? selectionColor
    : isToday
    ? "#0A84FF"
    : city
    ? `${city.color}4D`
    : "#262626";
  const borderWidth = isSelected ? 2 : isToday ? 2 : 1;

  const hasHotel = (items?.hotels.length ?? 0) > 0;

  const badges = [
    ...(items?.flights ?? []).map((f) => ({ key: f.id, label: f.label, type: "flight" as const })),
    ...(items?.hotels ?? []).map((h) => ({ key: h.id, label: h.label, type: "hotel" as const })),
    ...(items?.transports ?? []).map((t) => ({ key: t.id, label: t.label, type: "transport" as const })),
  ].slice(0, 3);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerUp={onPointerUp}
      data-date={dateStr}
      aria-disabled={!inRange}
      aria-label={`${dateStr}${city ? ` — ${city.name}` : ""}`}
      className={`
        relative flex flex-col rounded-[10px] px-1 pt-1.5 pb-1
        min-h-[88px] md:min-h-[112px] w-full text-left
        transition-all
        ${inRange ? "cursor-pointer active:scale-[0.94]" : "opacity-25 cursor-default"}
        ${dimmed ? "opacity-30" : ""}
        ${isSelected ? "scale-[0.96]" : ""}
        focus:outline-none
      `}
      style={{
        backgroundColor: inRange ? bg : "#0D0D0D",
        border: `${borderWidth}px solid ${borderColor}`,
        boxShadow: isSelected ? `0 0 0 3px ${selectionColor}33, 0 4px 12px ${selectionColor}22` : undefined,
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      {/* Today indicator dot */}
      {isToday && (
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0A84FF]" />
      )}

      {/* Selection checkmark */}
      {isSelected && (
        <div
          className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-pop-in"
          style={{ backgroundColor: selectionColor }}
        >
          ✓
        </div>
      )}

      {/* Day number */}
      <span
        className="text-[13px] md:text-[15px] font-bold leading-none px-0.5"
        style={{ color: isToday ? "#0A84FF" : "#FFFFFF" }}
      >
        {dayNum}
      </span>

      {/* Badges */}
      <div className="flex flex-col gap-[3px] mt-1 flex-1 w-full overflow-hidden">
        {badges.map((b) => (
          <ItemBadge key={b.key} label={b.label} type={b.type} />
        ))}
      </div>

      {/* City tag */}
      {city && (
        <div
          className="mt-auto text-[9px] font-bold uppercase tracking-widest px-0.5 truncate leading-tight"
          style={{ color: city.color }}
        >
          {city.name}
        </div>
      )}

      {/* Hotel continued strip */}
      {hasHotel && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-[8px]"
          style={{ backgroundColor: "#FF9F0A" }}
        />
      )}
    </div>
  );
}

function ItemBadge({ label, type }: { label: string; type: "flight" | "hotel" | "transport" }) {
  const styles: Record<typeof type, { bg: string; text: string }> = {
    flight: { bg: "#0A84FF22", text: "#0A84FF" },
    hotel: { bg: "#FF9F0A22", text: "#FF9F0A" },
    transport: { bg: "#BF5AF222", text: "#BF5AF2" },
  };
  const { bg, text } = styles[type];
  const icon = type === "flight" ? "✈" : type === "hotel" ? "🏨" : "🚆";

  return (
    <span
      className="text-[9px] md:text-[10px] font-semibold px-1 py-[2px] rounded-[4px] truncate leading-tight flex items-center gap-0.5"
      style={{ backgroundColor: bg, color: text }}
    >
      <span className="text-[8px]">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function SelectionActionBar({
  stats,
  onClose,
  onFilterCity,
}: {
  stats: SelectionStats;
  onClose: () => void;
  onFilterCity: (c: City) => void;
}) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div
        className="mx-auto max-w-md px-4 pt-4 pb-4 flex items-center gap-2"
        style={{
          background: "rgba(13,13,13,0.96)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid #0A84FF40",
          boxShadow: "0 -12px 40px rgba(10,132,255,0.15)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Salir de selección"
          className="w-10 h-10 rounded-full bg-[#242424] text-white flex items-center justify-center text-[20px] leading-none press-feedback flex-shrink-0"
        >
          ×
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] text-white font-semibold leading-tight">
            {stats.count} {stats.count === 1 ? "día" : "días"}
          </p>
          <p className="text-[11px] text-[#A0A0A0] leading-tight truncate">
            {stats.hasEmpty && stats.hasCity
              ? "Mixto · varios estados"
              : stats.hasEmpty
              ? "Sin ciudad"
              : stats.cities.map((c) => c.name).join(" · ")}
          </p>
        </div>

        <div className="flex gap-1.5 flex-shrink-0 overflow-x-auto">
          {stats.hasEmpty && (
            <>
              <button
                className="px-3 py-2.5 text-white text-[12px] font-semibold rounded-full press-feedback whitespace-nowrap flex items-center gap-1"
                style={{ background: "linear-gradient(135deg, #FF6B6B, #E85959)" }}
              >
                + Ciudad
              </button>
              <button
                className="px-3 py-2.5 text-white text-[12px] font-semibold rounded-full press-feedback whitespace-nowrap flex items-center gap-1"
                style={{ background: "linear-gradient(135deg, #FF9F0A, #E68908)" }}
              >
                + Hotel
              </button>
            </>
          )}
          {stats.hasCity && !stats.hasEmpty && stats.cities.length === 1 && (
            <button
              onClick={() => onFilterCity(stats.cities[0])}
              className="px-3 py-2.5 text-white text-[12px] font-semibold rounded-full press-feedback whitespace-nowrap"
              style={{ background: `linear-gradient(135deg, ${stats.cities[0].color}, ${stats.cities[0].color}DD)` }}
            >
              Ver solo {stats.cities[0].name}
            </button>
          )}
          {stats.hasCity && !stats.hasEmpty && stats.cities.length > 1 && (
            <button
              className="px-3 py-2.5 text-white text-[12px] font-semibold rounded-full press-feedback whitespace-nowrap"
              style={{ background: "linear-gradient(135deg, #0A84FF, #0670D9)" }}
            >
              Ver resumen
            </button>
          )}
        </div>
      </div>
    </div>
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
  const label = date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const allItems = [
    ...(items?.flights ?? []).map((f) => ({ key: f.id, label: f.label, type: "flight" as const })),
    ...(items?.hotels ?? []).map((h) => ({ key: h.id, label: h.label, type: "hotel" as const })),
    ...(items?.transports ?? []).map((t) => ({ key: t.id, label: t.label, type: "transport" as const })),
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[12px]" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-[#1A1A1A] rounded-t-[24px] p-6 pb-10 animate-slide-up"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        <div className="w-9 h-1 bg-[#333] rounded-full mx-auto mb-5" />

        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-[20px] font-semibold text-white capitalize">{label}</h3>
            {city && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: city.color }} />
                <span
                  className="text-[12px] font-semibold uppercase tracking-wide"
                  style={{ color: city.color }}
                >
                  {city.name}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-[#707070] hover:text-white transition-colors text-[24px] leading-none mt-0.5 press-feedback">
            ×
          </button>
        </div>

        {allItems.length === 0 ? (
          <div className="text-center py-10 text-[#4D4D4D] text-[15px]">
            Sin items en este día.
          </div>
        ) : (
          <div className="space-y-2">
            {allItems.map((item, i) => (
              <div
                key={item.key}
                className="bg-[#242424] rounded-[14px] px-4 py-3.5 flex items-center gap-3 animate-spring-up"
                style={{ border: "1px solid #2C2C2C", animationDelay: `${i * 60}ms` }}
              >
                <span className="text-[22px]">
                  {item.type === "flight" ? "✈️" : item.type === "hotel" ? "🏨" : "🚆"}
                </span>
                <span className="text-[15px] font-medium text-white">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <button
          className="w-full mt-5 rounded-[14px] py-3.5 text-[15px] font-semibold text-white press-feedback"
          style={{
            background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)",
            boxShadow: "0 4px 16px rgba(191,90,242,0.3)",
          }}
        >
          ✨ Agregar al día
        </button>
      </div>
    </div>
  );
}
