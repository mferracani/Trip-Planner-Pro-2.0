"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Trip, City, Flight, Hotel, Transport, CITY_TO_COUNTRY, COUNTRY_COLORS } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { updateTrip, citySettingsRef } from "@/lib/firestore";
import { onSnapshot } from "firebase/firestore";
import { CityForm } from "../forms/CityForm";
import { FlightForm } from "../forms/FlightForm";
import { HotelForm } from "../forms/HotelForm";
import { TransportForm } from "../forms/TransportForm";

type SelectionAddType = "city" | "hotel";

interface Props {
  trip: Trip;
  cities: City[];
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
  onChanged: () => void;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const LONG_PRESS_MS = 380;

function normalizeCity(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectCountryCode(city: City, settingsMap: Record<string, { country_code?: string }> = {}): string | undefined {
  const key = normalizeCity(city.name);
  if (settingsMap[key]?.country_code) return settingsMap[key].country_code;
  if (city.country_code) return city.country_code;
  return CITY_TO_COUNTRY[key];
}

const SPECIAL_FLAGS: Record<string, string> = {
  SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
};

function countryFlag(code: string): string {
  if (SPECIAL_FLAGS[code]) return SPECIAL_FLAGS[code];
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function cityColor(city: City, settingsMap: Record<string, { color?: string; country_code?: string }> = {}): string {
  const key = normalizeCity(city.name);
  if (settingsMap[key]?.color) return settingsMap[key].color!;
  const code = detectCountryCode(city, settingsMap);
  if (code && COUNTRY_COLORS[code]) return COUNTRY_COLORS[code];
  return city.color;
}

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

export function CalendarView({ trip, cities, flights, hotels, transports, onChanged }: Props) {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [filterCity, setFilterCity] = useState<City | null>(null);
  const [addingFromSelection, setAddingFromSelection] = useState<SelectionAddType | null>(null);

  const longPressTimer = useRef<number | null>(null);
  const dragStartDate = useRef<string | null>(null);
  const isDragging = useRef(false);

  // Global city settings — realtime listener so Catalog changes propagate instantly
  const [citySettingsMap, setCitySettingsMap] = useState<Record<string, { color?: string; country_code?: string }>>({});
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(citySettingsRef(user.uid), (snap) => {
      const map: Record<string, { color?: string; country_code?: string }> = {};
      snap.docs.forEach((d) => { map[d.id] = d.data() as { color?: string; country_code?: string }; });
      setCitySettingsMap(map);
    });
    return unsub;
  }, [user]);

  // Apply global settings on top of per-trip city data
  const enhancedCities = useMemo(
    () => cities.map((c) => ({
      ...c,
      color: cityColor(c, citySettingsMap),
      country_code: detectCountryCode(c, citySettingsMap),
    })) as City[],
    [cities, citySettingsMap]
  );

  const todayStr = toDateStr(new Date());
  const weeks = buildWeeks(trip.start_date, trip.end_date);
  const dayItemsMap = buildDayItemsMap(flights, hotels, transports);

  const dateCitiesMap: Record<string, City[]> = {};
  for (const city of enhancedCities) {
    for (const d of city.days ?? []) {
      if (!dateCitiesMap[d]) dateCitiesMap[d] = [];
      dateCitiesMap[d].push(city);
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

  async function adjustDate(edge: "start" | "end", delta: number) {
    if (!user) return;
    const base = edge === "start" ? trip.start_date : trip.end_date;
    const d = new Date(base + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().split("T")[0];
    if (edge === "start" && newDate >= trip.end_date) return;
    if (edge === "end" && newDate <= trip.start_date) return;
    await updateTrip(user.uid, trip.id, edge === "start" ? { start_date: newDate } : { end_date: newDate });
    onChanged();
  }

  const selectionStats: SelectionStats = (() => {
    if (selection.size === 0) return { count: 0, hasEmpty: false, hasCity: false, cities: [] };
    let hasEmpty = false;
    let hasCity = false;
    const cityIds = new Set<string>();
    for (const d of selection) {
      const citiesOnDay = dateCitiesMap[d] ?? [];
      if (citiesOnDay.length === 0) hasEmpty = true;
      else {
        hasCity = true;
        citiesOnDay.forEach((c) => cityIds.add(c.id));
      }
    }
    return {
      count: selection.size,
      hasEmpty,
      hasCity,
      cities: Array.from(cityIds)
        .map((id) => enhancedCities.find((c) => c.id === id))
        .filter((c): c is City => !!c),
    };
  })();

  return (
    <div className="px-3 md:px-8 pb-32 md:pb-8" style={{ userSelect: inSelectionMode ? "none" : "auto" }}>
      {/* Hint bar — selection mode */}
      {inSelectionMode && (
        <div className="mb-3 px-3 py-2 bg-[#71D3A6]/12 border border-[#71D3A6]/30 rounded-[10px] text-[12px] text-[#71D3A6] font-medium text-center animate-fade-slide-up">
          {selection.size} día{selection.size === 1 ? "" : "s"} · mantené y arrastrá para extender
        </div>
      )}

      {/* Filter city hint */}
      {filterCity && !inSelectionMode && (() => {
        const fc = filterCity;
        const fcColor = fc.color;
        const fcCode = detectCountryCode(fc);
        return (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-[10px] animate-fade-slide-up" style={{ backgroundColor: `${fcColor}15`, border: `1px solid ${fcColor}40` }}>
            {fcCode ? (
              <span className="text-[14px] leading-none">{countryFlag(fcCode)}</span>
            ) : (
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: fcColor }} />
            )}
            <span className="text-[12px] font-semibold flex-1" style={{ color: fcColor }}>
              Filtrando {fc.name.toUpperCase()}
            </span>
            <button onClick={() => setFilterCity(null)} className="text-[#A0A0A0] text-[16px] leading-none press-feedback">×</button>
          </div>
        );
      })()}

      {/* Countdown banner — only for future trips */}
      {!inSelectionMode && (() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tripStart = new Date(trip.start_date + "T00:00:00");
        const d = Math.ceil((tripStart.getTime() - today.getTime()) / 86400000);
        if (d <= 0) return null;
        return (
          <div
            className="mb-3 flex items-center gap-2.5 px-3 py-2 rounded-[10px] animate-fade-slide-up"
            style={{ background: "rgba(10,132,255,0.07)", border: "1px solid rgba(10,132,255,0.22)" }}
          >
            <span className="text-[15px]">✈️</span>
            <span className="text-[12px] font-semibold text-[#0A84FF] flex-1">
              {d === 1 ? "Mañana empieza el viaje" : `Faltan ${d} días para que empiece el viaje`}
            </span>
          </div>
        );
      })()}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[10px] font-bold text-[#707070] uppercase tracking-wide py-1.5">
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
              const citiesOnDay = dateCitiesMap[dateStr] ?? [];
              const primaryCity = citiesOnDay[0];
              const items = dayItemsMap[dateStr];
              const isSelected = selection.has(dateStr);
              const isToday = dateStr === todayStr;
              const [, mm, dd] = dateStr.split("-");
              const dateLabel = `${dd}/${mm}`;
              const dayIndex = primaryCity ? (primaryCity.days ?? []).indexOf(dateStr) : -1;
              const totalDays = primaryCity ? (primaryCity.days ?? []).length : 0;
              const dimmed = !!filterCity && !citiesOnDay.some((c) => c.id === filterCity.id);

              return (
                <DayCell
                  key={dateStr}
                  dateStr={dateStr}
                  dateLabel={dateLabel}
                  dayIndex={dayIndex}
                  totalDays={totalDays}
                  inRange={inRange}
                  cities={citiesOnDay}
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
      {enhancedCities.length > 0 && !inSelectionMode && (
        <div className="flex flex-wrap gap-2 mt-5 px-1">
          {enhancedCities.map((c) => {
            const isActive = filterCity?.id === c.id;
            const cc = detectCountryCode(c);
            const color = c.color;
            return (
              <button
                key={c.id}
                onClick={() => setFilterCity(isActive ? null : c)}
                className="flex items-center gap-1.5 press-feedback transition-all"
                style={{ opacity: isActive ? 1 : 0.65 }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                {cc && (
                  <span className="text-[12px] leading-none">{countryFlag(cc)}</span>
                )}
                <span className="text-[12px] font-medium" style={{ color: "#C6BDAE" }}>
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Date adjustment */}
      {!inSelectionMode && (
        <div className="mt-5 px-1">
          <p className="text-center text-[10px] text-[#4D4D4D] uppercase tracking-wider font-semibold mb-2.5">
            Ajustar duración
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <button
                onClick={() => adjustDate("start", -1)}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-[#A0A0A0] bg-[#1A1A1A] border border-[#333] press-feedback hover:border-[#555] transition-colors"
              >
                ← +día
              </button>
              <span className="text-[11px] text-[#707070] flex-1 text-center">
                {new Date(trip.start_date + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
              </span>
              <button
                onClick={() => adjustDate("start", +1)}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-[#A0A0A0] bg-[#1A1A1A] border border-[#333] press-feedback hover:border-[#555] transition-colors"
              >
                −día →
              </button>
            </div>
            <span className="text-[#333] text-[12px] flex-shrink-0">·</span>
            <div className="flex items-center gap-1.5 flex-1">
              <button
                onClick={() => adjustDate("end", -1)}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-[#A0A0A0] bg-[#1A1A1A] border border-[#333] press-feedback hover:border-[#555] transition-colors"
              >
                ← −día
              </button>
              <span className="text-[11px] text-[#707070] flex-1 text-center">
                {new Date(trip.end_date + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
              </span>
              <button
                onClick={() => adjustDate("end", +1)}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-[#A0A0A0] bg-[#1A1A1A] border border-[#333] press-feedback hover:border-[#555] transition-colors"
              >
                +día →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day detail sheet */}
      <AnimatePresence>
        {selectedDay && !inSelectionMode && (
          <DayDetailSheet
            key="day-detail"
            dateStr={selectedDay}
            cities={dateCitiesMap[selectedDay] ?? []}
            flights={flights}
            hotels={hotels}
            transports={transports}
            trip={trip}
            allCities={enhancedCities}
            onChanged={onChanged}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </AnimatePresence>

      {/* Selection action bar */}
      {inSelectionMode && (
        <SelectionActionBar
          stats={selectionStats}
          onClose={clearSelection}
          onFilterCity={(c) => {
            setFilterCity(c);
            clearSelection();
          }}
          onAddCity={() => setAddingFromSelection("city")}
          onAddHotel={() => setAddingFromSelection("hotel")}
        />
      )}

      {/* Forms triggered from selection */}
      {addingFromSelection === "city" && (
        <CityForm
          tripId={trip.id}
          tripStart={trip.start_date}
          tripEnd={trip.end_date}
          usedColors={cities.map((c) => c.color)}
          initialDays={Array.from(selection).sort()}
          onClose={() => setAddingFromSelection(null)}
          onSaved={() => { setAddingFromSelection(null); clearSelection(); onChanged(); }}
        />
      )}
      {addingFromSelection === "hotel" && (
        <HotelForm
          tripId={trip.id}
          cities={cities}
          initialDate={Array.from(selection).sort()[0]}
          onClose={() => setAddingFromSelection(null)}
          onSaved={() => { setAddingFromSelection(null); clearSelection(); onChanged(); }}
        />
      )}
    </div>
  );
}

interface DayCellProps {
  dateStr: string;
  dateLabel: string;
  dayIndex: number;
  totalDays: number;
  inRange: boolean;
  cities: City[];
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
  dateLabel,
  dayIndex,
  totalDays,
  inRange,
  cities,
  items,
  isSelected,
  isToday,
  dimmed,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
}: DayCellProps) {
  const primaryCity = cities[0];
  const isSplit = cities.length >= 2;
  const resolvedColor = primaryCity?.color ?? null;
  const selectionColor = resolvedColor ?? "#0A84FF";

  // Background: split diagonal when two cities share the day
  const bg = isSplit
    ? `linear-gradient(135deg, ${cities[0].color}35 0% 50%, ${cities[1].color}35 50% 100%)`
    : resolvedColor
    ? `linear-gradient(145deg, ${resolvedColor}42 0%, ${resolvedColor}14 100%)`
    : inRange
    ? "#1A1A1A"
    : "#0D0D0D";

  // Border: city color at 40%, default #333333
  const borderColor = isSelected
    ? selectionColor
    : isToday
    ? "#FFD16A"
    : resolvedColor
    ? `${resolvedColor}66`
    : "#333333";
  const borderWidth = isSelected || isToday ? 2 : 1;

  const showProgress = !isSplit && primaryCity && totalDays > 0 && dayIndex >= 0;

  // Just the day number, not DD/MM
  const dayNumber = dateStr.split("-")[2];
  void dayNumber; // used in aria-label only

  // Flights + transports first (time-critical), hotels last
  const allBadges = [
    ...(items?.flights ?? []).map((f) => ({ key: f.id, label: f.label, type: "flight" as const })),
    ...(items?.transports ?? []).map((t) => ({ key: t.id, label: t.label, type: "transport" as const })),
    ...(items?.hotels ?? []).map((h) => ({ key: h.id, label: h.label, type: "hotel" as const })),
  ];
  const badges = allBadges.slice(0, 3);
  const overflowCount = Math.max(allBadges.length - badges.length, 0);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerUp={onPointerUp}
      data-date={dateStr}
      aria-disabled={!inRange}
      aria-label={`${dateStr}${primaryCity ? ` — ${primaryCity.name}` : ""}`}
      className={`
        relative flex flex-col rounded-[10px] p-1.5 md:rounded-[12px] md:p-2
        min-h-[120px] md:min-h-[140px] w-full text-left
        transition-all
        ${inRange ? "cursor-pointer active:scale-[0.94]" : "opacity-20 cursor-default"}
        ${dimmed ? "opacity-30" : ""}
        ${isSelected ? "scale-[0.96]" : ""}
        focus:outline-none
      `}
      style={{
        background: bg,
        border: `${borderWidth}px solid ${borderColor}`,
        boxShadow: isSelected ? `0 0 0 3px ${selectionColor}33, 0 4px 12px ${selectionColor}22` : undefined,
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      {/* Row 1: DD/MM date + badge */}
      <div className="flex items-start justify-between mb-1">
        <span
          className="text-[11px] md:text-[12px] font-bold leading-none tabular-nums"
          style={{ color: isToday ? "#FFD16A" : inRange ? "#A0A0A0" : "#444" }}
        >
          {dateLabel}
        </span>
        {isSelected ? (
          <div
            className="w-[15px] h-[15px] rounded-full flex items-center justify-center text-white text-[8px] font-bold animate-pop-in flex-shrink-0"
            style={{ backgroundColor: selectionColor }}
          >
            ✓
          </div>
        ) : isToday ? (
          <div className="w-[15px] h-[15px] rounded-full bg-[#30D158] flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
            ✓
          </div>
        ) : null}
      </div>

      {/* City block */}
      {inRange && cities.length > 0 && (
        isSplit ? (
          // Split: two cities share the day
          <div className="mb-1 flex flex-col gap-[2px]">
            {cities.slice(0, 2).map((c) => {
              const code = detectCountryCode(c);
              const flag = code ? countryFlag(code) : null;
              return (
                <div key={c.id} className="flex items-center gap-[3px]">
                  {flag && <span className="text-[9px] leading-none">{flag}</span>}
                  <p className="text-[10px] md:text-[11px] font-bold leading-none truncate" style={{ color: c.color }}>
                    {c.name.substring(0, 3).toUpperCase()}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          // Single city
          <div className="mb-2">
            <span className="text-[12px] md:text-[13px] leading-none block mb-0.5">
              {(() => {
                const code = detectCountryCode(primaryCity!);
                return code ? countryFlag(code) : "";
              })()}
            </span>
            <p
              className="text-[14px] font-bold leading-none tracking-tight md:hidden"
              style={{ color: "#FFFFFF" }}
            >
              {primaryCity!.name.substring(0, 3).toUpperCase()}
            </p>
            <p
              className="hidden md:block text-[15px] font-bold leading-tight truncate"
              style={{ color: "#FFFFFF" }}
            >
              {primaryCity!.name}
            </p>
            {showProgress && (
              <p
                className="text-[10px] md:text-[11px] font-semibold leading-none tabular-nums mt-0.5"
                style={{ color: `${resolvedColor}B0` }}
              >
                {dayIndex + 1}/{totalDays}
              </p>
            )}
          </div>
        )
      )}

      {/* Items */}
      {inRange && (
        <div className="flex flex-col gap-[3px] mt-auto overflow-hidden">
          {badges.map((b) => (
            <ItemRow key={b.key} label={b.label} type={b.type} />
          ))}
          {overflowCount > 0 && (
            <span className="text-[8px] text-[#555] font-semibold">+{overflowCount}</span>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({ label, type }: { label: string; type: "flight" | "hotel" | "transport" }) {
  const icon = type === "flight" ? "✈" : type === "hotel" ? "🏨" : "🚌";
  // Design system: vuelo #60A5FA · hotel #FBBF24 · transit #D8B4FE
  const color = type === "flight" ? "#60A5FA" : type === "hotel" ? "#FBBF24" : "#D8B4FE";

  return (
    <div className="flex items-center gap-[3px] min-w-0 overflow-hidden">
      <span className="text-[9px] md:text-[10px] flex-shrink-0 leading-none">{icon}</span>
      <span
        className="text-[9px] md:text-[11px] font-medium truncate leading-tight"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

function SelectionActionBar({
  stats,
  onClose,
  onFilterCity,
  onAddCity,
  onAddHotel,
}: {
  stats: SelectionStats;
  onClose: () => void;
  onFilterCity: (c: City) => void;
  onAddCity: () => void;
  onAddHotel: () => void;
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
                onClick={onAddCity}
                className="px-3 py-2.5 text-white text-[12px] font-semibold rounded-full press-feedback whitespace-nowrap flex items-center gap-1"
                style={{ background: "linear-gradient(135deg, #FF6B6B, #E85959)" }}
              >
                + Ciudad
              </button>
              <button
                onClick={onAddHotel}
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

// ─── copyable booking ref ──────────────────────────────────────────────────

function CopyableBookingRef({ value, color }: { value: string; color: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (typeof navigator.vibrate === "function") navigator.vibrate(10);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard not available — noop
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-2.5 transition-all active:scale-[0.98] press-feedback"
      style={{
        background: `${color}12`,
        border: `1px solid ${color}30`,
      }}
      aria-label={`Copiar número de reserva ${value}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[14px] flex-shrink-0">🎫</span>
        <div className="min-w-0 text-left">
          <div className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: `${color}B0` }}>
            Reserva
          </div>
          <div
            className="text-[16px] font-mono font-bold tracking-[0.08em] truncate"
            style={{ color }}
          >
            {value}
          </div>
        </div>
      </div>
      <div
        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
        style={{
          background: copied ? "#30D15825" : `${color}20`,
          color: copied ? "#30D158" : color,
        }}
      >
        {copied ? (
          <>
            <span className="text-[11px]">✓</span>
            <span>Copiado</span>
          </>
        ) : (
          <>
            <span className="text-[12px]">⧉</span>
            <span>Copiar</span>
          </>
        )}
      </div>
    </button>
  );
}

// ─── day detail helpers ─────────────────────────────────────────────────────

function extractTime(iso?: string | null): string {
  return iso?.split("T")[1]?.slice(0, 5) ?? "";
}
function extractDate(iso?: string | null): string {
  return iso?.split("T")[0] ?? "";
}
function daysBetweenDates(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000
  );
}
function dayLabelShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// ─── the sheet ───────────────────────────────────────────────────────────────

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

type AddingType = "city" | "flight" | "hotel" | "transport";

function DayDetailSheet({
  dateStr,
  cities,
  flights,
  hotels,
  transports,
  trip,
  allCities,
  onChanged,
  onClose,
}: {
  dateStr: string;
  cities: City[];
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
  trip: Trip;
  allCities: City[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [showPicker, setShowPicker] = useState(false);
  const [addingType, setAddingType] = useState<AddingType | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);

  function handleSaved() {
    setAddingType(null);
    setShowPicker(false);
    onChanged();
    onClose();
  }

  const date = new Date(dateStr + "T00:00:00");
  const label = date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Filter items relevant to this day
  const dayFlights = flights.filter((f) => {
    const dep = extractDate(f.departure_local_time);
    const arr = extractDate(f.arrival_local_time);
    return dep === dateStr || arr === dateStr;
  });
  const dayHotels = hotels.filter((h) => dateStr >= h.check_in && dateStr < h.check_out);
  const dayTransports = transports.filter((t) => extractDate(t.departure_local_time) === dateStr);

  const totalCount = dayFlights.length + dayHotels.length + dayTransports.length;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-[12px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="
          absolute flex flex-col bg-[#161616] overflow-hidden
          bottom-0 left-0 right-0 max-h-[90vh] rounded-t-[24px]
          md:inset-y-0 md:right-0 md:left-auto md:w-[460px] md:max-h-none
          md:rounded-l-[20px] md:rounded-tr-none md:rounded-br-none
          md:border-l md:border-[#262626]
        "
        initial={isDesktop ? { x: "100%" } : { y: "100%" }}
        animate={isDesktop ? { x: 0 } : { y: 0 }}
        exit={isDesktop ? { x: "100%" } : { y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300, mass: 0.8 }}
        style={{ boxShadow: isDesktop ? "-32px 0 80px rgba(0,0,0,0.6)" : "inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#333]" />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-10">
          <div className="flex items-start justify-between mb-5 pt-4 md:pt-6">
            <div>
              <h3 className="text-[20px] font-semibold text-white capitalize leading-tight">{label}</h3>
              {cities.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {cities.map((c) => {
                    const sheetCode = detectCountryCode(c);
                    return (
                      <button
                        key={c.id}
                        onClick={() => setEditingCity(c)}
                        className="flex items-center gap-1.5 press-feedback"
                      >
                        {sheetCode ? (
                          <span className="text-[15px] leading-none">{countryFlag(sheetCode)}</span>
                        ) : (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                        )}
                        <span
                          className="text-[12px] font-semibold uppercase tracking-wide"
                          style={{ color: c.color }}
                        >
                          {c.name}
                        </span>
                        <span className="text-[14px]" style={{ color: "#FFD16A" }}>✎</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-[#707070] hover:text-white transition-colors text-[24px] leading-none mt-0.5 press-feedback"
            >
              ×
            </button>
          </div>

          {totalCount === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="text-[42px] mb-2 opacity-60">🗓️</div>
              <p className="text-[#707070] text-[14px]">Día libre.</p>
              <p className="text-[#4D4D4D] text-[12px] mt-1">Sin vuelos, hoteles ni transportes.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dayFlights.map((f, i) => (
                <FlightCard key={f.id} flight={f} dateStr={dateStr} delay={i * 60} />
              ))}
              {dayTransports.map((t, i) => (
                <TransportCard key={t.id} transport={t} delay={(dayFlights.length + i) * 60} />
              ))}
              {dayHotels.map((h, i) => (
                <HotelCard
                  key={h.id}
                  hotel={h}
                  dateStr={dateStr}
                  delay={(dayFlights.length + dayTransports.length + i) * 60}
                />
              ))}
            </div>
          )}

          {/* Add to day — type picker */}
          {!showPicker ? (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full mt-5 rounded-[14px] py-3.5 text-[15px] font-semibold text-white press-feedback"
              style={{
                background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)",
                boxShadow: "0 4px 16px rgba(191,90,242,0.3)",
              }}
            >
              ✨ Agregar al día
            </button>
          ) : (
            <div className="mt-5 space-y-2">
              <p className="text-center text-[12px] text-[#707070] mb-3">¿Qué querés agregar?</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { type: "city" as AddingType, label: "Ciudad", emoji: "🏙️", color: "#FF6B6B" },
                  { type: "flight" as AddingType, label: "Vuelo", emoji: "✈️", color: "#4D96FF" },
                  { type: "hotel" as AddingType, label: "Hotel", emoji: "🏨", color: "#FFD93D" },
                  { type: "transport" as AddingType, label: "Transporte", emoji: "🚆", color: "#4ECDC4" },
                ] as const).map(({ type, label, emoji, color }) => (
                  <button
                    key={type}
                    onClick={() => { setShowPicker(false); setAddingType(type); }}
                    className="flex flex-col items-center gap-1.5 py-3.5 rounded-[14px] font-semibold text-[13px] press-feedback transition-all"
                    style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
                  >
                    <span className="text-[22px]">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="w-full py-2.5 text-[13px] text-[#707070] hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Forms — rendered via createPortal inside each component */}
      {editingCity && (
        <CityForm
          tripId={trip.id}
          tripStart={trip.start_date}
          tripEnd={trip.end_date}
          usedColors={allCities.map((c) => c.color)}
          existing={editingCity}
          onClose={() => setEditingCity(null)}
          onSaved={handleSaved}
        />
      )}
      {addingType === "city" && (
        <CityForm
          tripId={trip.id}
          tripStart={trip.start_date}
          tripEnd={trip.end_date}
          usedColors={allCities.map((c) => c.color)}
          initialDay={dateStr}
          onClose={() => setAddingType(null)}
          onSaved={handleSaved}
        />
      )}
      {addingType === "flight" && (
        <FlightForm
          tripId={trip.id}
          initialDate={dateStr}
          onClose={() => setAddingType(null)}
          onSaved={handleSaved}
        />
      )}
      {addingType === "hotel" && (
        <HotelForm
          tripId={trip.id}
          cities={allCities}
          initialDate={dateStr}
          onClose={() => setAddingType(null)}
          onSaved={handleSaved}
        />
      )}
      {addingType === "transport" && (
        <TransportForm
          tripId={trip.id}
          initialDate={dateStr}
          onClose={() => setAddingType(null)}
          onSaved={handleSaved}
        />
      )}
    </div>,
    document.body
  );
}

// ─── Flight card ────────────────────────────────────────────────────────────

function FlightCard({ flight: f, dateStr, delay }: { flight: Flight; dateStr: string; delay: number }) {
  const depDate = extractDate(f.departure_local_time);
  const arrDate = extractDate(f.arrival_local_time);
  const depTime = extractTime(f.departure_local_time);
  const arrTime = extractTime(f.arrival_local_time);
  const isDeparture = depDate === dateStr;
  const isArrival = !isDeparture && arrDate === dateStr;
  const dayOffset = arrDate && depDate ? daysBetweenDates(depDate, arrDate) : 0;
  const sameDay = dayOffset === 0;

  return (
    <div
      className="relative rounded-[16px] px-4 pt-3.5 pb-3 animate-spring-up overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0F1B2E 0%, #101417 100%)",
        border: "1px solid #1E2A40",
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4D96FF]" />

      {/* Header row */}
      <div className="flex items-center gap-2 mb-2.5 pl-1">
        <span className="text-[14px]">✈️</span>
        <span className="text-[12px] font-bold text-[#4D96FF] uppercase tracking-wide">
          {isArrival ? "Llegada" : "Vuelo"}
        </span>
        {f.airline && (
          <span className="text-[12px] text-[#A0A0A0]">
            · {f.airline} {f.flight_number}
          </span>
        )}
      </div>

      {/* Route + times */}
      {isArrival ? (
        <div className="pl-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-bold text-white tabular-nums">{arrTime}</span>
            <span className="text-[13px] text-[#A0A0A0]">en</span>
            <span className="text-[18px] font-bold text-white">{f.destination_iata}</span>
          </div>
          {depTime && depDate && (
            <p className="text-[12px] text-[#707070] mt-1">
              ← Salió de {f.origin_iata} el {dayLabelShort(depDate)} a las {depTime}
            </p>
          )}
        </div>
      ) : (
        <div className="pl-1">
          <div className="flex items-center gap-3">
            {/* Departure */}
            <div>
              <div className="text-[22px] font-bold text-white tabular-nums leading-none">{depTime}</div>
              <div className="text-[15px] font-bold text-[#E0E0E0] mt-1">{f.origin_iata}</div>
            </div>
            {/* Arrow */}
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-[#4D96FF] to-[#4D96FF60]" />
              <span className="text-[#4D96FF] text-[12px]">✈</span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-[#4D96FF60] to-[#4D96FF]" />
            </div>
            {/* Arrival */}
            <div className="text-right">
              <div className="text-[22px] font-bold text-white tabular-nums leading-none relative inline-block">
                {arrTime}
                {!sameDay && dayOffset > 0 && (
                  <span className="absolute -top-1 -right-5 text-[10px] font-bold text-[#FF9F0A]">
                    +{dayOffset}
                  </span>
                )}
              </div>
              <div className="text-[15px] font-bold text-[#E0E0E0] mt-1">{f.destination_iata}</div>
            </div>
          </div>
          {!sameDay && dayOffset > 0 && (
            <p className="text-[11px] text-[#FF9F0A] mt-2">
              Llega el {dayLabelShort(arrDate)} ({dayOffset === 1 ? "mañana" : `+${dayOffset} días`})
            </p>
          )}
        </div>
      )}

      {/* Booking ref — prominent + copyable */}
      {f.booking_ref && (
        <div className="mt-3 pl-1">
          <CopyableBookingRef value={f.booking_ref} color="#4D96FF" />
        </div>
      )}

      {/* Metadata row */}
      {(f.seat || f.cabin_class || f.price != null) && (
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#1E2A40] pl-1 flex-wrap">
          {f.seat && (
            <span className="text-[11.5px] text-[#A0A0A0]">
              <span className="text-[#4D4D4D]">Asiento</span> <span className="text-white font-semibold">{f.seat}</span>
            </span>
          )}
          {f.cabin_class && (
            <>
              {f.seat && <span className="text-[#333]">·</span>}
              <span className="text-[11.5px] text-[#A0A0A0]">{f.cabin_class}</span>
            </>
          )}
          {f.price != null && (
            <>
              {(f.seat || f.cabin_class) && <span className="text-[#333]">·</span>}
              <span className="text-[11.5px] text-[#30D158] font-semibold">
                {f.currency ?? "USD"} {f.price.toLocaleString("es-AR")}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Hotel card ─────────────────────────────────────────────────────────────

function HotelCard({ hotel: h, dateStr, delay }: { hotel: Hotel; dateStr: string; delay: number }) {
  const totalNights = daysBetweenDates(h.check_in, h.check_out);
  const night = daysBetweenDates(h.check_in, dateStr) + 1;
  const isCheckIn = dateStr === h.check_in;
  const badge = isCheckIn ? "✨ Check-in hoy" : `Noche ${night} de ${totalNights}`;

  return (
    <div
      className="relative rounded-[16px] px-4 pt-3.5 pb-3 animate-spring-up overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1F1A10 0%, #171411 100%)",
        border: "1px solid #2E2818",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#FFD93D]" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2 pl-1 min-w-0">
        <span className="text-[14px]">🏨</span>
        <span className="text-[15px] font-bold text-white truncate">{h.name}</span>
      </div>

      {/* Brand / meta */}
      {h.brand && (
        <p className="pl-1 text-[12px] text-[#A0A0A0] mb-2.5">{h.brand}</p>
      )}

      {/* Stay badge */}
      <div className="pl-1 mb-2.5">
        <span
          className="inline-flex items-center text-[11px] font-bold px-2 py-1 rounded-full"
          style={{
            background: isCheckIn ? "#FFD93D25" : "#FFD93D15",
            color: "#FFD93D",
          }}
        >
          {badge}
        </span>
      </div>

      {/* Dates */}
      <div className="pl-1 flex items-center gap-3 text-[12px]">
        <div>
          <div className="text-[10px] text-[#4D4D4D] uppercase tracking-wide font-semibold">Check-in</div>
          <div className="text-[#E0E0E0] font-semibold">{dayLabelShort(h.check_in)}</div>
        </div>
        <div className="text-[#FFD93D60]">→</div>
        <div>
          <div className="text-[10px] text-[#4D4D4D] uppercase tracking-wide font-semibold">Check-out</div>
          <div className="text-[#E0E0E0] font-semibold">{dayLabelShort(h.check_out)}</div>
        </div>
        <div className="text-[#333]">·</div>
        <span className="text-[#A0A0A0]">{totalNights} {totalNights === 1 ? "noche" : "noches"}</span>
      </div>

      {/* Booking ref — prominent + copyable */}
      {h.booking_ref && (
        <div className="mt-3 pl-1">
          <CopyableBookingRef value={h.booking_ref} color="#FFD93D" />
        </div>
      )}

      {/* Metadata */}
      {(h.room_type || h.price_per_night != null) && (
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#2E2818] pl-1 flex-wrap">
          {h.room_type && (
            <span className="text-[11.5px] text-[#A0A0A0]">{h.room_type}</span>
          )}
          {h.price_per_night != null && (
            <>
              {h.room_type && <span className="text-[#333]">·</span>}
              <span className="text-[11.5px] text-[#30D158] font-semibold">
                {h.currency ?? "USD"} {h.price_per_night.toLocaleString("es-AR")}/noche
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Transport card ─────────────────────────────────────────────────────────

function TransportCard({ transport: t, delay }: { transport: Transport; delay: number }) {
  const depTime = extractTime(t.departure_local_time);
  const arrTime = extractTime(t.arrival_local_time);
  const typeEmoji: Record<Transport["type"], string> = {
    train: "🚆", bus: "🚌", ferry: "⛴️", car: "🚗", car_rental: "🚙", taxi: "🚕", subway: "🚇", other: "🚐",
  };
  const typeLabel: Record<Transport["type"], string> = {
    train: "Tren", bus: "Bus", ferry: "Ferry", car: "Auto", car_rental: "Alquiler de auto", taxi: "Taxi", subway: "Metro", other: "Transporte",
  };

  return (
    <div
      className="relative rounded-[16px] px-4 pt-3.5 pb-3 animate-spring-up overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #101D1B 0%, #0F1513 100%)",
        border: "1px solid #1B2E2B",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4ECDC4]" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2 pl-1 min-w-0">
        <span className="text-[14px]">{typeEmoji[t.type]}</span>
        <span className="text-[12px] font-bold text-[#4ECDC4] uppercase tracking-wide">{typeLabel[t.type]}</span>
        {t.operator && (
          <span className="text-[12px] text-[#A0A0A0] truncate">· {t.operator}</span>
        )}
      </div>

      {/* Route */}
      <div className="pl-1">
        <div className="flex items-start gap-2 text-[13px]">
          <div className="flex-1 min-w-0">
            {depTime && (
              <div className="text-[18px] font-bold text-white tabular-nums leading-none mb-0.5">{depTime}</div>
            )}
            <div className="text-[13px] text-[#E0E0E0] font-semibold truncate">{t.origin}</div>
          </div>
          <div className="text-[#4ECDC460] text-[14px] mt-1.5">→</div>
          <div className="flex-1 min-w-0 text-right">
            {arrTime && (
              <div className="text-[18px] font-bold text-white tabular-nums leading-none mb-0.5">{arrTime}</div>
            )}
            <div className="text-[13px] text-[#E0E0E0] font-semibold truncate">{t.destination}</div>
          </div>
        </div>
      </div>

      {/* Booking ref — prominent + copyable */}
      {t.booking_ref && (
        <div className="mt-3 pl-1">
          <CopyableBookingRef value={t.booking_ref} color="#4ECDC4" />
        </div>
      )}

      {/* Price */}
      {t.price != null && (
        <div className="flex items-center mt-3 pt-2.5 border-t border-[#1B2E2B] pl-1">
          <span className="text-[11.5px] text-[#30D158] font-semibold">
            {t.currency ?? "USD"} {t.price.toLocaleString("es-AR")}
          </span>
        </div>
      )}
    </div>
  );
}
