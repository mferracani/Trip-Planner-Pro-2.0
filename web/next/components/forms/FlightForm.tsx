"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createFlight, updateFlight, deleteFlight, recalcTripAggregates } from "@/lib/firestore";
import type { Flight, FlightLeg } from "@/lib/types";
import { Timestamp } from "firebase/firestore";
import { COMMON_TIMEZONES, localToUtcTimestamp, minutesBetween, guessTimezone } from "@/lib/datetime";
import { FormSheet } from "./FormSheet";
import { Field, TextInput, NumberInput, SelectInput } from "./fields";

interface Props {
  tripId: string;
  existing?: Flight;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(localTime: string): string {
  return localTime?.split("T")[1]?.slice(0, 5) ?? "";
}

function fmtDate(localTime: string): string {
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

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  direction,
  legCount,
}: {
  direction: "outbound" | "inbound";
  legCount: number;
}) {
  const isOutbound = direction === "outbound";
  const iconColor = isOutbound
    ? "#0A84FF"
    : legCount > 0
    ? "#30D158"
    : "#A0A0A0";

  return (
    <div className="flex items-center gap-2">
      <span style={{ color: iconColor, fontSize: 16 }}>
        {isOutbound ? "✈" : "↩"}
      </span>
      <span className="text-[13px] font-semibold text-[#C6BDAE] uppercase tracking-wider">
        {isOutbound ? "IDA" : "VUELTA"}
      </span>
      {legCount > 0 && (
        <span
          className="text-[11px] font-semibold rounded-full px-2 py-0.5"
          style={{
            background: isOutbound ? "#0A84FF22" : "#30D15822",
            color: isOutbound ? "#0A84FF" : "#30D158",
          }}
        >
          {legCount}
        </span>
      )}
    </div>
  );
}

// ─── LegCard ─────────────────────────────────────────────────────────────────

function LegCard({
  leg,
  onEdit,
  onDelete,
}: {
  leg: FlightLeg;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const depTime = fmtTime(leg.departure_local_time);
  const arrTime = fmtTime(leg.arrival_local_time);
  const dateStr = fmtDate(leg.departure_local_time);

  return (
    <div className="rounded-[12px] border border-[#2A2520] bg-[#1A1716] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#0A84FF] text-[14px]">✈</span>
          <span className="text-[15px] font-semibold text-white truncate">
            {leg.origin_iata} → {leg.destination_iata}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-[8px] text-[#A0A0A0] hover:text-white hover:bg-[#2A2520] transition-colors text-[13px]"
            aria-label="Editar tramo"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-[8px] text-[#A0A0A0] hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors text-[13px]"
            aria-label="Eliminar tramo"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-1 text-[13px] text-[#A0A0A0]">
        {leg.flight_number}
        {dateStr ? ` · ${dateStr}` : ""}
        {depTime && arrTime ? ` · ${depTime} → ${arrTime}` : ""}
      </div>
      {leg.duration_minutes > 0 && (
        <div className="mt-1 text-right text-[11px] text-[#707070]">
          {fmtDuration(leg.duration_minutes)}
        </div>
      )}
    </div>
  );
}

// ─── InlineLegForm ────────────────────────────────────────────────────────────

type LegFormValues = {
  origin_iata: string;
  destination_iata: string;
  airline: string;
  flight_number: string;
  departure_local_time: string;
  departure_timezone: string;
  arrival_local_time: string;
  arrival_timezone: string;
  cabin_class: FlightLeg["cabin_class"] | "";
  seat: string;
};

type FieldErrors = Partial<Record<keyof LegFormValues, string>>;

function InlineLegForm({
  direction,
  initialValues,
  onAdd,
  onCancel,
  isEditing,
}: {
  direction: "outbound" | "inbound";
  initialValues?: Partial<FlightLeg>;
  onAdd: (leg: FlightLeg) => void;
  onCancel: () => void;
  isEditing?: boolean;
}) {
  const defaultTz = guessTimezone();
  const isOutbound = direction === "outbound";
  const borderColor = isOutbound ? "#0A84FF" : "#A0A0A0";

  const [values, setValues] = useState<LegFormValues>({
    origin_iata: initialValues?.origin_iata ?? "",
    destination_iata: initialValues?.destination_iata ?? "",
    airline: initialValues?.airline ?? "",
    flight_number: initialValues?.flight_number ?? "",
    departure_local_time: initialValues?.departure_local_time ?? "",
    departure_timezone: initialValues?.departure_timezone ?? defaultTz,
    arrival_local_time: initialValues?.arrival_local_time ?? "",
    arrival_timezone: initialValues?.arrival_timezone ?? defaultTz,
    cabin_class: initialValues?.cabin_class ?? "",
    seat: initialValues?.seat ?? "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [showDetails, setShowDetails] = useState(
    !!(initialValues?.cabin_class || initialValues?.seat)
  );

  // Detect potential incoherent times (overnight warning, not a blocker)
  const arrivalBeforeDeparture = (() => {
    if (!values.departure_local_time || !values.arrival_local_time) return false;
    return values.arrival_local_time < values.departure_local_time;
  })();

  function set<K extends keyof LegFormValues>(key: K, val: LegFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const required: (keyof LegFormValues)[] = [
      "origin_iata",
      "destination_iata",
      "airline",
      "flight_number",
      "departure_local_time",
      "departure_timezone",
      "arrival_local_time",
      "arrival_timezone",
    ];
    const next: FieldErrors = {};
    for (const k of required) {
      if (!values[k]?.trim()) next[k] = "Campo requerido";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleAdd() {
    if (!validate()) return;

    const depUtc = localToUtcTimestamp(values.departure_local_time, values.departure_timezone);
    const arrUtc = localToUtcTimestamp(values.arrival_local_time, values.arrival_timezone);

    const leg: FlightLeg = {
      direction,
      airline: values.airline.trim(),
      flight_number: values.flight_number.trim(),
      origin_iata: values.origin_iata.trim().toUpperCase(),
      destination_iata: values.destination_iata.trim().toUpperCase(),
      departure_local_time: values.departure_local_time,
      departure_timezone: values.departure_timezone,
      departure_utc: depUtc ?? Timestamp.now(),
      arrival_local_time: values.arrival_local_time,
      arrival_timezone: values.arrival_timezone,
      arrival_utc: arrUtc ?? Timestamp.now(),
      duration_minutes:
        depUtc && arrUtc ? minutesBetween(depUtc, arrUtc) : 0,
      ...(values.cabin_class ? { cabin_class: values.cabin_class } : {}),
      ...(values.seat.trim() ? { seat: values.seat.trim() } : {}),
    };

    onAdd(leg);
  }

  const tzOptions = COMMON_TIMEZONES.map((tz) => ({ value: tz, label: tz }));

  const cabinOptions: { value: FlightLeg["cabin_class"] | ""; label: string }[] = [
    { value: "", label: "Sin especificar" },
    { value: "economy", label: "Economy" },
    { value: "premium_economy", label: "Premium Economy" },
    { value: "business", label: "Business" },
    { value: "first", label: "First" },
  ];

  const cabinLabels: Record<string, string> = {
    economy: "Economy",
    premium_economy: "Premium Economy",
    business: "Business",
    first: "First",
  };

  function fieldClass(key: keyof LegFormValues): string {
    const base =
      "w-full bg-[#1A1A1A] border rounded-[12px] px-4 py-3 text-white text-[15px] placeholder-[#4D4D4D] outline-none focus:border-[#0A84FF] transition-colors";
    return errors[key] ? `${base} border-[#FF453A]` : `${base} border-[#333]`;
  }

  return (
    <div
      className="rounded-[12px] py-4 px-4 my-2"
      style={{
        background: "#1A1A1A",
        borderLeft: `2px solid ${borderColor}`,
        borderTop: "1px solid #2A2520",
        borderRight: "1px solid #2A2520",
        borderBottom: "1px solid #2A2520",
      }}
    >
      <p className="text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wider mb-4">
        {isEditing ? "Editar tramo" : `Tramo de ${isOutbound ? "ida" : "vuelta"}`}
      </p>

      {/* Origin / Destination */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            Origen (IATA)
          </label>
          <input
            type="text"
            value={values.origin_iata}
            onChange={(e) => set("origin_iata", e.target.value)}
            placeholder="EZE"
            className={fieldClass("origin_iata")}
          />
          {errors.origin_iata && (
            <p className="text-[11px] text-[#FF453A] mt-1">{errors.origin_iata}</p>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            Destino (IATA)
          </label>
          <input
            type="text"
            value={values.destination_iata}
            onChange={(e) => set("destination_iata", e.target.value)}
            placeholder="MAD"
            className={fieldClass("destination_iata")}
          />
          {errors.destination_iata && (
            <p className="text-[11px] text-[#FF453A] mt-1">{errors.destination_iata}</p>
          )}
        </div>
      </div>

      {/* Airline / Flight number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            Aerolínea
          </label>
          <input
            type="text"
            value={values.airline}
            onChange={(e) => set("airline", e.target.value)}
            placeholder="Iberia"
            className={fieldClass("airline")}
          />
          {errors.airline && (
            <p className="text-[11px] text-[#FF453A] mt-1">{errors.airline}</p>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            Número de vuelo
          </label>
          <input
            type="text"
            value={values.flight_number}
            onChange={(e) => set("flight_number", e.target.value)}
            placeholder="IB6844"
            className={fieldClass("flight_number")}
          />
          {errors.flight_number && (
            <p className="text-[11px] text-[#FF453A] mt-1">{errors.flight_number}</p>
          )}
        </div>
      </div>

      {/* Departure / Arrival datetime */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            Salida (local)
          </label>
          <input
            type="datetime-local"
            value={values.departure_local_time}
            onChange={(e) => set("departure_local_time", e.target.value)}
            className={fieldClass("departure_local_time")}
          />
          {errors.departure_local_time && (
            <p className="text-[11px] text-[#FF453A] mt-1">{errors.departure_local_time}</p>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            Llegada (local)
          </label>
          <input
            type="datetime-local"
            value={values.arrival_local_time}
            onChange={(e) => set("arrival_local_time", e.target.value)}
            className={fieldClass("arrival_local_time")}
          />
          {errors.arrival_local_time && (
            <p className="text-[11px] text-[#FF453A] mt-1">{errors.arrival_local_time}</p>
          )}
          {arrivalBeforeDeparture && !errors.arrival_local_time && (
            <p className="text-[11px] mt-1" style={{ color: "#FF9F0A" }}>
              Llegada antes que salida? Verificá las timezones.
            </p>
          )}
        </div>
      </div>

      {/* Timezones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            TZ salida
          </label>
          <select
            value={values.departure_timezone}
            onChange={(e) => set("departure_timezone", e.target.value)}
            className={fieldClass("departure_timezone")}
          >
            {tzOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.departure_timezone && (
            <p className="text-[11px] text-[#FF453A] mt-1">{errors.departure_timezone}</p>
          )}
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
            TZ llegada
          </label>
          <select
            value={values.arrival_timezone}
            onChange={(e) => set("arrival_timezone", e.target.value)}
            className={fieldClass("arrival_timezone")}
          >
            {tzOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.arrival_timezone && (
            <p className="text-[11px] text-[#FF453A] mt-1">{errors.arrival_timezone}</p>
          )}
        </div>
      </div>

      {/* More details toggle */}
      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="flex items-center gap-1.5 text-[13px] text-[#A0A0A0] hover:text-white transition-colors mb-3"
      >
        <span>{showDetails ? "▲" : "▼"}</span>
        <span>Más detalles</span>
      </button>

      {showDetails && (
        <>
          <hr className="border-[#2A2520] mb-4" />

          {/* Mobile: radio buttons for cabin class */}
          <div className="md:hidden mb-3">
            <p className="text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-2">
              Clase de cabina (opcional)
            </p>
            <div className="space-y-2">
              {(["economy", "premium_economy", "business", "first"] as const).map((cls) => (
                <label key={cls} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`cabin_class_${direction}`}
                    value={cls}
                    checked={values.cabin_class === cls}
                    onChange={() => set("cabin_class", cls)}
                    className="accent-[#0A84FF] w-4 h-4"
                  />
                  <span className="text-[15px] text-white">{cabinLabels[cls]}</span>
                </label>
              ))}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={`cabin_class_${direction}`}
                  value=""
                  checked={values.cabin_class === ""}
                  onChange={() => set("cabin_class", "")}
                  className="accent-[#0A84FF] w-4 h-4"
                />
                <span className="text-[15px] text-[#707070]">Sin especificar</span>
              </label>
            </div>
          </div>

          {/* Desktop: select + seat on same row */}
          <div className="hidden md:grid md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
                Clase (opcional)
              </label>
              <select
                value={values.cabin_class}
                onChange={(e) =>
                  set("cabin_class", e.target.value as FlightLeg["cabin_class"] | "")
                }
                className="w-full bg-[#1A1A1A] border border-[#333] rounded-[12px] px-4 py-3 text-white text-[15px] outline-none focus:border-[#0A84FF] transition-colors"
              >
                {cabinOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
                Asiento (opcional)
              </label>
              <input
                type="text"
                value={values.seat}
                onChange={(e) => set("seat", e.target.value)}
                placeholder="24A"
                className="w-full bg-[#1A1A1A] border border-[#333] rounded-[12px] px-4 py-3 text-white text-[15px] placeholder-[#4D4D4D] outline-none focus:border-[#0A84FF] transition-colors"
              />
            </div>
          </div>

          {/* Mobile: seat field (cabin is radio above) */}
          <div className="md:hidden mb-3">
            <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1.5">
              Asiento (opcional)
            </label>
            <input
              type="text"
              value={values.seat}
              onChange={(e) => set("seat", e.target.value)}
              placeholder="24A"
              className="w-full bg-[#1A1A1A] border border-[#333] rounded-[12px] px-4 py-3 text-white text-[15px] placeholder-[#4D4D4D] outline-none focus:border-[#0A84FF] transition-colors"
            />
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 md:justify-end mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 md:flex-none md:px-5 rounded-[12px] py-2.5 text-[14px] font-semibold text-[#A0A0A0] border border-[#333] hover:text-white hover:border-[#555] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleAdd}
          className="flex-1 md:flex-none md:px-5 rounded-[12px] py-2.5 text-[14px] font-semibold text-white transition-colors"
          style={{ background: isOutbound ? "#0A84FF" : "#555" }}
        >
          {isEditing ? "Actualizar tramo" : "Agregar tramo"}
        </button>
      </div>
    </div>
  );
}

// ─── LegSection ───────────────────────────────────────────────────────────────

type ExpandedState =
  | { direction: "outbound" | "inbound"; index: number | "new" }
  | null;

function LegSection({
  direction,
  legs,
  expanded,
  onSetExpanded,
  onAddLeg,
  onUpdateLeg,
  onDeleteLeg,
}: {
  direction: "outbound" | "inbound";
  legs: FlightLeg[];
  expanded: ExpandedState;
  onSetExpanded: (s: ExpandedState) => void;
  onAddLeg: (leg: FlightLeg) => void;
  onUpdateLeg: (index: number, leg: FlightLeg) => void;
  onDeleteLeg: (index: number) => void;
}) {
  const isOutbound = direction === "outbound";
  const sectionLegs = legs.filter((l) => l.direction === direction);
  const expandedHere =
    expanded?.direction === direction ? expanded : null;

  // Map from section-local index back to global legs index
  const globalIndices = legs
    .map((l, i) => ({ leg: l, i }))
    .filter(({ leg }) => leg.direction === direction)
    .map(({ i }) => i);

  const addBtnColor = isOutbound ? "#0A84FF" : "#A0A0A0";
  const addBtnLabel = isOutbound
    ? "+ Agregar tramo de ida"
    : "+ Agregar tramo de vuelta";

  function handleEdit(sectionIndex: number) {
    onSetExpanded({ direction, index: sectionIndex });
  }

  function handleDelete(sectionIndex: number) {
    if (!window.confirm("Eliminar este tramo?")) return;
    onDeleteLeg(globalIndices[sectionIndex]);
    if (expandedHere?.index === sectionIndex) onSetExpanded(null);
  }

  function handleAdd(leg: FlightLeg) {
    if (expandedHere?.index === "new") {
      onAddLeg(leg);
    } else if (typeof expandedHere?.index === "number") {
      onUpdateLeg(globalIndices[expandedHere.index], leg);
    }
    onSetExpanded(null);
  }

  function handleCancel() {
    onSetExpanded(null);
  }

  function handleClickAdd() {
    // If another inline form in a different section is open, close it first
    onSetExpanded({ direction, index: "new" });
  }

  return (
    <div className="space-y-2">
      <SectionHeader direction={direction} legCount={sectionLegs.length} />

      {sectionLegs.length === 0 && expandedHere === null && (
        <p className="text-[13px] text-[#707070]">
          No hay tramos de {isOutbound ? "ida" : "vuelta"}.
        </p>
      )}

      {sectionLegs.map((leg, sectionIdx) => {
        if (expandedHere?.index === sectionIdx) {
          return (
            <InlineLegForm
              key={`edit-${sectionIdx}`}
              direction={direction}
              initialValues={leg}
              onAdd={handleAdd}
              onCancel={handleCancel}
              isEditing
            />
          );
        }
        return (
          <LegCard
            key={`leg-${sectionIdx}`}
            leg={leg}
            onEdit={() => handleEdit(sectionIdx)}
            onDelete={() => handleDelete(sectionIdx)}
          />
        );
      })}

      {expandedHere?.index === "new" && (
        <InlineLegForm
          direction={direction}
          onAdd={handleAdd}
          onCancel={handleCancel}
        />
      )}

      {expandedHere === null && (
        <button
          type="button"
          onClick={handleClickAdd}
          className="w-full md:w-auto rounded-[12px] border py-2.5 px-4 text-[14px] font-semibold transition-colors hover:opacity-80"
          style={{ borderColor: addBtnColor, color: addBtnColor }}
        >
          {addBtnLabel}
        </button>
      )}
    </div>
  );
}

// ─── FlightForm (main) ───────────────────────────────────────────────────────

export function FlightForm({ tripId, existing, initialDate: _initialDate, onClose, onSaved }: Props) {
  const { user } = useAuth();

  const [legs, setLegs] = useState<FlightLeg[]>(existing?.legs ?? []);
  const [expanded, setExpanded] = useState<ExpandedState>(null);

  const [bookingRef, setBookingRef] = useState(existing?.booking_ref ?? "");
  const [price, setPrice] = useState<number | null>(existing?.price ?? null);
  const [currency, setCurrency] = useState(existing?.currency ?? "USD");
  const [priceUsd, setPriceUsd] = useState<number | null>(existing?.price_usd ?? null);
  const [paidAmount, setPaidAmount] = useState<number | null>(existing?.paid_amount ?? null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = legs.length > 0 && !expanded;

  // Mutators
  function addLeg(leg: FlightLeg) {
    setLegs((prev) => [...prev, leg]);
  }

  function updateLeg(globalIndex: number, leg: FlightLeg) {
    setLegs((prev) => prev.map((l, i) => (i === globalIndex ? leg : l)));
  }

  function deleteLeg(globalIndex: number) {
    setLegs((prev) => prev.filter((_, i) => i !== globalIndex));
  }

  async function handleDeleteFlight() {
    if (!user || !existing) return;
    setSaving(true);
    setError(null);
    try {
      await deleteFlight(user.uid, tripId, existing.id);
      await recalcTripAggregates(user.uid, tripId);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!user || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const outbound = legs.filter((l) => l.direction === "outbound");
      const firstLeg = outbound[0] ?? legs[0];
      const lastLeg = outbound[outbound.length - 1] ?? legs[legs.length - 1];

      if (!firstLeg || !lastLeg) throw new Error("Agregá al menos un tramo");

      const totalDuration = minutesBetween(firstLeg.departure_utc, lastLeg.arrival_utc);

      // Legacy mono-leg summary fields — derive from legs array
      const summaryAirline = firstLeg.airline;
      const summaryFlightNumber = firstLeg.flight_number;

      const data: Omit<Flight, "id"> = {
        trip_id: tripId,
        // summary fields (backward-compat with legacy queries)
        airline: summaryAirline,
        flight_number: summaryFlightNumber,
        origin_iata: firstLeg.origin_iata,
        destination_iata: lastLeg.destination_iata,
        departure_local_time: firstLeg.departure_local_time,
        departure_timezone: firstLeg.departure_timezone,
        departure_utc: firstLeg.departure_utc,
        arrival_local_time: lastLeg.arrival_local_time,
        arrival_timezone: lastLeg.arrival_timezone,
        arrival_utc: lastLeg.arrival_utc,
        duration_minutes: totalDuration,
        // optional shared fields
        booking_ref: bookingRef.trim() || undefined,
        price: price ?? undefined,
        currency: price != null ? currency : undefined,
        price_usd: priceUsd ?? undefined,
        paid_amount: paidAmount ?? undefined,
        // multi-leg array
        legs,
      };

      if (existing) {
        await updateFlight(user.uid, tripId, existing.id, data);
      } else {
        await createFlight(user.uid, tripId, data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const currencyOptions: { value: "USD" | "EUR" | "ARS" | "GBP" | "BRL"; label: string }[] = [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "ARS", label: "ARS" },
    { value: "GBP", label: "GBP" },
    { value: "BRL", label: "BRL" },
  ];

  return (
    <FormSheet
      title={existing ? "Editar reserva" : "Nueva reserva de vuelo"}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={existing ? handleDeleteFlight : undefined}
      submitting={saving}
      canSubmit={canSubmit}
      error={error}
      submitLabel={canSubmit ? "Guardar reserva" : "Agregá al menos un tramo"}
    >
      {/* ── Datos de la reserva ──────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold text-[#707070] uppercase tracking-wider mb-3">
          Datos de la reserva
        </p>
        <div className="space-y-3">
          <Field label="Booking ref">
            <TextInput value={bookingRef} onChange={setBookingRef} placeholder="ABC123" />
          </Field>

          {/* Mobile: precio / moneda / equiv stacked then 3-col */}
          <div className="grid grid-cols-3 gap-3 md:hidden">
            <Field label="Precio">
              <NumberInput value={price} onChange={setPrice} placeholder="850" />
            </Field>
            <Field label="Moneda">
              <SelectInput
                value={currency as "USD" | "EUR" | "ARS" | "GBP" | "BRL"}
                onChange={(v) => setCurrency(v)}
                options={currencyOptions}
              />
            </Field>
            <Field label="Equiv. USD">
              <NumberInput value={priceUsd} onChange={setPriceUsd} placeholder="—" />
            </Field>
          </div>

          {/* Desktop: booking + moneda + precio en row, then equiv + pagado */}
          <div className="hidden md:grid md:grid-cols-3 md:gap-3">
            <Field label="Moneda">
              <SelectInput
                value={currency as "USD" | "EUR" | "ARS" | "GBP" | "BRL"}
                onChange={(v) => setCurrency(v)}
                options={currencyOptions}
              />
            </Field>
            <Field label="Precio">
              <NumberInput value={price} onChange={setPrice} placeholder="850" />
            </Field>
            <Field label="Equiv. USD">
              <NumberInput value={priceUsd} onChange={setPriceUsd} placeholder="—" />
            </Field>
          </div>

          <Field label="Monto pagado" hint="Abonado hasta ahora en la misma moneda">
            <NumberInput value={paidAmount} onChange={setPaidAmount} placeholder="0" />
          </Field>
        </div>
      </div>

      {/* ── Sección IDA ──────────────────────────────────────────── */}
      <hr className="border-[#333]" />

      <LegSection
        direction="outbound"
        legs={legs}
        expanded={expanded}
        onSetExpanded={setExpanded}
        onAddLeg={addLeg}
        onUpdateLeg={updateLeg}
        onDeleteLeg={deleteLeg}
      />

      {/* ── Divider ──────────────────────────────────────────────── */}
      <hr className="border-[#333]" />

      {/* ── Sección VUELTA ───────────────────────────────────────── */}
      <LegSection
        direction="inbound"
        legs={legs}
        expanded={expanded}
        onSetExpanded={setExpanded}
        onAddLeg={addLeg}
        onUpdateLeg={updateLeg}
        onDeleteLeg={deleteLeg}
      />
    </FormSheet>
  );
}
