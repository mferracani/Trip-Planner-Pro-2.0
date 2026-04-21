"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createFlight,
  createHotel,
  createTransport,
  createCity,
  getCities,
} from "@/lib/firestore";
import type { City, Flight, Hotel, Transport } from "@/lib/types";
import { CITY_COLORS } from "@/lib/types";
import { COMMON_TIMEZONES, localToUtcTimestamp, minutesBetween, guessTimezone } from "@/lib/datetime";
import { ChevronDown, ArrowLeft, Plane, Hotel as HotelIcon, Car, Train, Bus, Ship, MapPin, ChevronRight } from "lucide-react";

// ─── Type picker ─────────────────────────────────────────────────────────────

export type ManualType = "flight" | "hotel" | "car" | "train" | "bus" | "ferry" | "taxi" | "subway" | "city";

interface TypeOpt {
  type: ManualType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
}

const TYPE_OPTIONS: TypeOpt[] = [
  { type: "flight", label: "Vuelo", desc: "Aerolínea, IATA, horarios", icon: <Plane size={22} strokeWidth={2.2} />, color: "#4D96FF" },
  { type: "hotel", label: "Hotel", desc: "Noches, check-in/out", icon: <HotelIcon size={22} strokeWidth={2.2} />, color: "#FFD93D" },
  { type: "car", label: "Auto / rental", desc: "Modelo, extras", icon: <Car size={22} strokeWidth={2.2} />, color: "#4ECDC4" },
  { type: "train", label: "Tren", desc: "Número, asientos", icon: <Train size={22} strokeWidth={2.2} />, color: "#FF8FA3" },
  { type: "bus", label: "Bus", desc: "Empresa, horarios", icon: <Bus size={22} strokeWidth={2.2} />, color: "#C77DFF" },
  { type: "ferry", label: "Ferry", desc: "Naviera, cruce", icon: <Ship size={22} strokeWidth={2.2} />, color: "#6BCB77" },
  { type: "taxi", label: "Taxi / Uber", desc: "Chofer, trayecto", icon: <Car size={22} strokeWidth={2.2} />, color: "#95E1D3" },
  { type: "subway", label: "Metro", desc: "Línea, estación", icon: <Train size={22} strokeWidth={2.2} />, color: "#FFD93D" },
  { type: "city", label: "Ciudad", desc: "Asignar a días", icon: <MapPin size={22} strokeWidth={2.2} />, color: "#BF5AF2" },
];

export function ManualTypePicker({ onSelect }: { onSelect: (t: ManualType) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
      {TYPE_OPTIONS.map((opt) => (
        <button
          key={opt.type}
          onClick={() => onSelect(opt.type)}
          className="group relative flex flex-col items-start gap-2 p-3.5 rounded-[14px] border border-[#1E1E1E] bg-[#141414] hover:bg-[#181818] hover:border-[#2A2A2A] transition-all press-feedback text-left"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: `${opt.color}18`, color: opt.color }}
          >
            {opt.icon}
          </div>
          <div className="min-w-0 w-full">
            <p className="text-white text-[14px] font-semibold leading-tight">{opt.label}</p>
            <p className="text-[#707070] text-[11px] mt-0.5 leading-tight">{opt.desc}</p>
          </div>
          <ChevronRight
            size={14}
            className="absolute top-4 right-4 text-[#4D4D4D] group-hover:text-[#A0A0A0] transition-colors"
          />
        </button>
      ))}
    </div>
  );
}

// ─── Shared UI bits ──────────────────────────────────────────────────────────

export function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-[#A0A0A0] hover:text-white transition-colors mb-4 press-feedback"
    >
      <ArrowLeft size={15} />
      <span className="text-[13px] font-semibold">{label}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4D4D4D] mb-2.5">
        {title}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 text-left group"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#707070] group-hover:text-[#A0A0A0] transition-colors">
          {title}
        </span>
        <ChevronDown
          size={14}
          className="text-[#4D4D4D] group-hover:text-[#A0A0A0] transition-all"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
        />
      </button>
      {open && <div className="space-y-2.5 mt-2 animate-fade-slide-up">{children}</div>}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-[#A0A0A0] mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10.5px] text-[#4D4D4D] mt-1">{hint}</p>}
    </div>
  );
}

function TxtInput({
  value, onChange, placeholder, type = "text", required, upper,
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean; upper?: boolean }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full bg-[#0D0D0D] border border-[#262626] rounded-[10px] px-3 py-2.5 text-white text-[14px] placeholder-[#4D4D4D] outline-none focus:border-[#BF5AF2] transition-colors"
    />
  );
}

function NumInput({
  value, onChange, placeholder, min = 0, step = "0.01",
}: { value: string; onChange: (v: string) => void; placeholder?: string; min?: number; step?: string }) {
  return (
    <input
      type="number"
      step={step}
      min={min}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#0D0D0D] border border-[#262626] rounded-[10px] px-3 py-2.5 text-white text-[14px] placeholder-[#4D4D4D] outline-none focus:border-[#BF5AF2] transition-colors tabular-nums"
    />
  );
}

function Select({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0D0D0D] border border-[#262626] rounded-[10px] px-3 py-2.5 text-white text-[14px] outline-none focus:border-[#BF5AF2] transition-colors appearance-none"
      style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234D4D4D' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        paddingRight: "32px",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

const CURRENCIES = ["USD", "EUR", "ARS", "BRL", "GBP"];

function CurrencyPills({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {CURRENCIES.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-all"
            style={{
              background: active ? "#BF5AF225" : "#0D0D0D",
              color: active ? "#BF5AF2" : "#707070",
              border: `1px solid ${active ? "#BF5AF250" : "#262626"}`,
            }}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full bg-[#0D0D0D] border border-[#262626] rounded-[10px] px-3 py-2.5 text-white text-[14px] placeholder-[#4D4D4D] outline-none focus:border-[#BF5AF2] transition-colors resize-none"
    />
  );
}

function SubmitBtn({ loading, label, color }: { loading: boolean; label: string; color: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full text-white rounded-[14px] py-3.5 text-[15px] font-semibold disabled:opacity-40 transition-opacity mt-2"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}DD)`,
        boxShadow: `0 4px 18px ${color}40`,
      }}
    >
      {loading ? "Guardando…" : `✓ ${label}`}
    </button>
  );
}

function ErrorMsg({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="text-[#FF453A] text-[13px] bg-[#FF453A]/10 rounded-[10px] py-2 px-3 mt-3">
      {error}
    </p>
  );
}

// ─── Flight form ─────────────────────────────────────────────────────────────

export function ManualFlightForm({ tripId, onCreated, onBack }: { tripId: string; onCreated: () => void; onBack: () => void }) {
  const { user } = useAuth();
  const defaultTz = guessTimezone();
  const tzOpts = COMMON_TIMEZONES.map((tz) => ({ value: tz, label: tz }));

  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [originIata, setOriginIata] = useState("");
  const [destIata, setDestIata] = useState("");
  const [depLocal, setDepLocal] = useState("");
  const [depTz, setDepTz] = useState(defaultTz);
  const [arrLocal, setArrLocal] = useState("");
  const [arrTz, setArrTz] = useState(defaultTz);
  const [bookingRef, setBookingRef] = useState("");
  const [seat, setSeat] = useState("");
  const [cabinClass, setCabinClass] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paid, setPaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = !!(
    airline.trim() && flightNumber.trim() && originIata.trim() &&
    destIata.trim() && depLocal && arrLocal
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setSaving(true);
    setErr(null);
    try {
      const depUtc = localToUtcTimestamp(depLocal, depTz);
      const arrUtc = localToUtcTimestamp(arrLocal, arrTz);
      if (!depUtc || !arrUtc) throw new Error("Fechas inválidas");
      const data: Omit<Flight, "id"> = {
        trip_id: tripId,
        airline: airline.trim(),
        flight_number: flightNumber.trim().toUpperCase(),
        origin_iata: originIata.trim().toUpperCase(),
        destination_iata: destIata.trim().toUpperCase(),
        departure_local_time: depLocal,
        departure_timezone: depTz,
        departure_utc: depUtc,
        arrival_local_time: arrLocal,
        arrival_timezone: arrTz,
        arrival_utc: arrUtc,
        duration_minutes: minutesBetween(depUtc, arrUtc),
        cabin_class: cabinClass.trim() || undefined,
        seat: seat.trim() || undefined,
        booking_ref: bookingRef.trim() || undefined,
        price: price ? Number(price) : undefined,
        currency: price ? currency : undefined,
        paid_amount: paid ? Number(paid) : undefined,
      };
      await createFlight(user.uid, tripId, data);
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <BackBar label="Vuelo" onBack={onBack} />

      <Section title="Ruta">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Origen (IATA)">
            <TxtInput value={originIata} onChange={setOriginIata} placeholder="EZE" required upper />
          </Field>
          <Field label="Destino (IATA)">
            <TxtInput value={destIata} onChange={setDestIata} placeholder="MAD" required upper />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Aerolínea">
            <TxtInput value={airline} onChange={setAirline} placeholder="Iberia" required />
          </Field>
          <Field label="Nº vuelo">
            <TxtInput value={flightNumber} onChange={setFlightNumber} placeholder="IB6842" required upper />
          </Field>
        </div>
      </Section>

      <Section title="Horarios">
        <Field label="Salida (local)">
          <TxtInput value={depLocal} onChange={setDepLocal} type="datetime-local" required />
        </Field>
        <Field label="Timezone salida">
          <Select value={depTz} onChange={setDepTz} options={tzOpts} />
        </Field>
        <Field label="Llegada (local)">
          <TxtInput value={arrLocal} onChange={setArrLocal} type="datetime-local" required />
        </Field>
        <Field label="Timezone llegada">
          <Select value={arrTz} onChange={setArrTz} options={tzOpts} />
        </Field>
      </Section>

      <Section title="Reserva">
        <Field label="Código de reserva">
          <TxtInput value={bookingRef} onChange={setBookingRef} placeholder="NVJCW" upper />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Asiento">
            <TxtInput value={seat} onChange={setSeat} placeholder="12A" upper />
          </Field>
          <Field label="Clase">
            <TxtInput value={cabinClass} onChange={setCabinClass} placeholder="Economy" />
          </Field>
        </div>
      </Section>

      <CollapsibleSection title="Precio">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Precio total">
            <NumInput value={price} onChange={setPrice} placeholder="850" />
          </Field>
          <Field label="Pagado">
            <NumInput value={paid} onChange={setPaid} placeholder="0" />
          </Field>
        </div>
        <Field label="Moneda">
          <CurrencyPills value={currency} onChange={setCurrency} />
        </Field>
      </CollapsibleSection>

      <ErrorMsg error={err} />
      <SubmitBtn loading={saving} label="Guardar vuelo" color="#4D96FF" />
    </form>
  );
}

// ─── Hotel form ──────────────────────────────────────────────────────────────

function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const d1 = new Date(a + "T00:00:00").getTime();
  const d2 = new Date(b + "T00:00:00").getTime();
  return Math.max(0, Math.round((d2 - d1) / 86400000));
}

export function ManualHotelForm({ tripId, onCreated, onBack }: { tripId: string; onCreated: () => void; onBack: () => void }) {
  const { user } = useAuth();
  const [cities, setCities] = useState<City[]>([]);

  const [name, setName] = useState("");
  const [cityId, setCityId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [nightly, setNightly] = useState("");
  const [total, setTotal] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [paid, setPaid] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [address, setAddress] = useState("");
  const [roomType, setRoomType] = useState("");
  const [lastEditedPrice, setLastEditedPrice] = useState<"nightly" | "total" | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) getCities(user.uid, tripId).then(setCities);
  }, [user, tripId]);

  const nights = nightsBetween(checkIn, checkOut);

  // Auto-compute total when nightly changes or dates change
  function syncFromNightly(val: string) {
    setLastEditedPrice("nightly");
    setNightly(val);
    if (val && nights > 0) {
      setTotal(String(+(Number(val) * nights).toFixed(2)));
    } else if (!val) {
      setTotal("");
    }
  }
  function syncFromTotal(val: string) {
    setLastEditedPrice("total");
    setTotal(val);
    if (val && nights > 0) {
      setNightly(String(+(Number(val) / nights).toFixed(2)));
    } else if (!val) {
      setNightly("");
    }
  }
  function onCheckInChange(v: string) {
    setCheckIn(v);
    recomputeFrom(v, checkOut);
  }
  function onCheckOutChange(v: string) {
    setCheckOut(v);
    recomputeFrom(checkIn, v);
  }
  function recomputeFrom(ci: string, co: string) {
    const n = nightsBetween(ci, co);
    if (n <= 0) return;
    if (lastEditedPrice === "nightly" && nightly) {
      setTotal(String(+(Number(nightly) * n).toFixed(2)));
    } else if (lastEditedPrice === "total" && total) {
      setNightly(String(+(Number(total) / n).toFixed(2)));
    }
  }

  const canSubmit = !!(name.trim() && checkIn && checkOut && nights > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setSaving(true);
    setErr(null);
    try {
      const data: Omit<Hotel, "id"> = {
        trip_id: tripId,
        city_id: cityId,
        name: name.trim(),
        check_in: checkIn,
        check_out: checkOut,
        price_per_night: nightly ? Number(nightly) : undefined,
        total_price: total ? Number(total) : undefined,
        currency: (nightly || total) ? currency : undefined,
        total_price_usd: undefined, // recalc elsewhere
        paid_amount: paid ? Number(paid) : undefined,
        booking_ref: bookingRef.trim() || undefined,
        room_type: roomType.trim() || undefined,
      };
      if (address.trim()) (data as unknown as { address: string }).address = address.trim();
      await createHotel(user.uid, tripId, data);
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <BackBar label="Hotel" onBack={onBack} />

      <Section title="Básico">
        <Field label="Nombre del hotel">
          <TxtInput value={name} onChange={setName} placeholder="Park Hyatt" required />
        </Field>
        {cities.length > 0 && (
          <Field label="Ciudad">
            <Select
              value={cityId}
              onChange={setCityId}
              options={[{ value: "", label: "— sin ciudad —" }, ...cities.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </Field>
        )}
      </Section>

      <Section title="Estadía">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Check-in">
            <TxtInput value={checkIn} onChange={onCheckInChange} type="date" required />
          </Field>
          <Field label="Check-out">
            <TxtInput value={checkOut} onChange={onCheckOutChange} type="date" required />
          </Field>
        </div>
        {nights > 0 && (
          <p className="text-[11.5px] text-[#FFD93D] font-semibold">
            🌙 {nights} {nights === 1 ? "noche" : "noches"}
          </p>
        )}
      </Section>

      <Section title="Precio">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Precio/noche">
            <NumInput value={nightly} onChange={syncFromNightly} placeholder="180" />
          </Field>
          <Field label="Total" hint="Se calcula automáticamente">
            <NumInput value={total} onChange={syncFromTotal} placeholder="1440" />
          </Field>
        </div>
        <Field label="Moneda">
          <CurrencyPills value={currency} onChange={setCurrency} />
        </Field>
        <Field label="Pagado">
          <NumInput value={paid} onChange={setPaid} placeholder="0" />
        </Field>
      </Section>

      <CollapsibleSection title="Más detalles">
        <Field label="Código de reserva">
          <TxtInput value={bookingRef} onChange={setBookingRef} placeholder="ABC123" upper />
        </Field>
        <Field label="Tipo de habitación">
          <TxtInput value={roomType} onChange={setRoomType} placeholder="King Suite" />
        </Field>
        <Field label="Dirección">
          <TxtInput value={address} onChange={setAddress} placeholder="Av. Rivadavia 1234" />
        </Field>
      </CollapsibleSection>

      <ErrorMsg error={err} />
      <SubmitBtn loading={saving} label="Guardar hotel" color="#FFD93D" />
    </form>
  );
}

// ─── Transport form (car, train, bus, ferry, taxi, subway) ──────────────────

type TransportMode = "car" | "train" | "bus" | "ferry" | "taxi" | "subway" | "other";

const TRANSPORT_LABELS: Record<TransportMode, { label: string; color: string; placeholderProvider: string; emoji: string }> = {
  car: { label: "Auto / rental", color: "#4ECDC4", placeholderProvider: "Hertz, Avis", emoji: "🚗" },
  train: { label: "Tren", color: "#FF8FA3", placeholderProvider: "Renfe, Iryo", emoji: "🚆" },
  bus: { label: "Bus", color: "#C77DFF", placeholderProvider: "Alsa, Flixbus", emoji: "🚌" },
  ferry: { label: "Ferry", color: "#6BCB77", placeholderProvider: "Balearia", emoji: "⛴️" },
  taxi: { label: "Taxi / Uber", color: "#95E1D3", placeholderProvider: "Uber, Cabify", emoji: "🚕" },
  subway: { label: "Metro", color: "#FFD93D", placeholderProvider: "Línea 1", emoji: "🚇" },
  other: { label: "Otro", color: "#A0A0A0", placeholderProvider: "", emoji: "🚐" },
};

export function ManualTransportForm({ tripId, mode, onCreated, onBack }: { tripId: string; mode: TransportMode; onCreated: () => void; onBack: () => void }) {
  const { user } = useAuth();
  const defaultTz = guessTimezone();
  const tzOpts = COMMON_TIMEZONES.map((tz) => ({ value: tz, label: tz }));
  const meta = TRANSPORT_LABELS[mode];

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [depLocal, setDepLocal] = useState("");
  const [depTz, setDepTz] = useState(defaultTz);
  const [arrLocal, setArrLocal] = useState("");
  const [arrTz, setArrTz] = useState(defaultTz);
  const [operator, setOperator] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  // Mode-specific
  const [trainNumber, setTrainNumber] = useState("");
  const [busNumber, setBusNumber] = useState("");
  const [carModel, setCarModel] = useState("");
  const [extras, setExtras] = useState("");
  const [seats, setSeats] = useState("");
  // Price
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [paid, setPaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = !!(origin.trim() && destination.trim() && depLocal);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setSaving(true);
    setErr(null);
    try {
      const depUtc = localToUtcTimestamp(depLocal, depTz);
      if (!depUtc) throw new Error("Fecha de salida inválida");
      const arrUtc = arrLocal ? localToUtcTimestamp(arrLocal, arrTz) : null;

      // Build notes from mode-specific fields
      const noteParts: string[] = [];
      if (mode === "train" && trainNumber) noteParts.push(`Tren ${trainNumber}`);
      if (mode === "bus" && busNumber) noteParts.push(`Bus ${busNumber}`);
      if (mode === "car" && carModel) noteParts.push(`Auto: ${carModel}`);
      if (seats) noteParts.push(`Asientos: ${seats}`);
      if (extras) noteParts.push(extras);
      const notes = noteParts.length ? noteParts.join(" · ") : undefined;

      const data: Omit<Transport, "id"> = {
        trip_id: tripId,
        type: mode === "other" ? "other" : (mode as Transport["type"]),
        origin: origin.trim(),
        destination: destination.trim(),
        departure_local_time: depLocal,
        departure_timezone: depTz,
        departure_utc: depUtc,
        arrival_local_time: arrLocal || undefined,
        arrival_timezone: arrLocal ? arrTz : undefined,
        arrival_utc: arrUtc ?? undefined,
        operator: operator.trim() || undefined,
        booking_ref: bookingRef.trim() || undefined,
        price: price ? Number(price) : undefined,
        currency: price ? currency : undefined,
        paid_amount: paid ? Number(paid) : undefined,
      };
      if (notes) (data as unknown as { notes?: string }).notes = notes;
      await createTransport(user.uid, tripId, data);
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <BackBar label={`${meta.emoji} ${meta.label}`} onBack={onBack} />

      <Section title="Ruta">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Origen">
            <TxtInput value={origin} onChange={setOrigin} placeholder="Madrid Atocha" required />
          </Field>
          <Field label="Destino">
            <TxtInput value={destination} onChange={setDestination} placeholder="Barcelona Sants" required />
          </Field>
        </div>
      </Section>

      <Section title="Horarios">
        <Field label="Salida (local)">
          <TxtInput value={depLocal} onChange={setDepLocal} type="datetime-local" required />
        </Field>
        <Field label="Timezone salida">
          <Select value={depTz} onChange={setDepTz} options={tzOpts} />
        </Field>
        <Field label="Llegada (opcional)">
          <TxtInput value={arrLocal} onChange={setArrLocal} type="datetime-local" />
        </Field>
        {arrLocal && (
          <Field label="Timezone llegada">
            <Select value={arrTz} onChange={setArrTz} options={tzOpts} />
          </Field>
        )}
      </Section>

      <Section title={`Detalles del ${meta.label.toLowerCase()}`}>
        <Field label={mode === "bus" ? "Empresa" : "Operador"}>
          <TxtInput value={operator} onChange={setOperator} placeholder={meta.placeholderProvider} />
        </Field>
        {mode === "train" && (
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Nº tren">
              <TxtInput value={trainNumber} onChange={setTrainNumber} placeholder="03181" />
            </Field>
            <Field label="Asientos">
              <TxtInput value={seats} onChange={setSeats} placeholder="Coche 4 · 12A-12B" />
            </Field>
          </div>
        )}
        {mode === "bus" && (
          <Field label="Nº bus">
            <TxtInput value={busNumber} onChange={setBusNumber} placeholder="112" />
          </Field>
        )}
        {mode === "car" && (
          <>
            <Field label="Modelo">
              <TxtInput value={carModel} onChange={setCarModel} placeholder="Toyota Corolla" />
            </Field>
            <Field label="Extras">
              <TxtInput value={extras} onChange={setExtras} placeholder="GPS, silla bebé" />
            </Field>
          </>
        )}
      </Section>

      <CollapsibleSection title="Reserva y precio">
        <Field label="Código de reserva">
          <TxtInput value={bookingRef} onChange={setBookingRef} placeholder="ABC123" upper />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Precio">
            <NumInput value={price} onChange={setPrice} placeholder="75" />
          </Field>
          <Field label="Pagado">
            <NumInput value={paid} onChange={setPaid} placeholder="0" />
          </Field>
        </div>
        <Field label="Moneda">
          <CurrencyPills value={currency} onChange={setCurrency} />
        </Field>
      </CollapsibleSection>

      <ErrorMsg error={err} />
      <SubmitBtn loading={saving} label={`Guardar ${meta.label.toLowerCase()}`} color={meta.color} />
    </form>
  );
}

// ─── City form ───────────────────────────────────────────────────────────────

export function ManualCityForm({ tripId, onCreated, onBack }: { tripId: string; onCreated: () => void; onBack: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [color, setColor] = useState(CITY_COLORS[0]);
  const [timezone, setTimezone] = useState(guessTimezone());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = !!name.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !canSubmit) return;
    setSaving(true);
    setErr(null);
    try {
      await createCity(user.uid, tripId, {
        trip_id: tripId,
        name: name.trim(),
        lat: lat ? Number(lat) : 0,
        lng: lng ? Number(lng) : 0,
        color,
        timezone,
        days: [],
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const tzOpts = COMMON_TIMEZONES.map((tz) => ({ value: tz, label: tz }));

  return (
    <form onSubmit={handleSubmit}>
      <BackBar label="Ciudad" onBack={onBack} />

      <Section title="Ciudad">
        <Field label="Nombre">
          <TxtInput value={name} onChange={setName} placeholder="Madrid" required />
        </Field>
        <Field label="País">
          <TxtInput value={country} onChange={setCountry} placeholder="España" />
        </Field>
        <Field label="Timezone">
          <Select value={timezone} onChange={setTimezone} options={tzOpts} />
        </Field>
      </Section>

      <Section title="Color">
        <div className="flex gap-2 flex-wrap">
          {CITY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-transform hover:scale-110"
              style={{
                background: c,
                border: color === c ? "2px solid white" : "2px solid transparent",
                boxShadow: color === c ? `0 0 0 2px ${c}` : undefined,
              }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </Section>

      <CollapsibleSection title="Coordenadas (opcional)">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Latitud">
            <NumInput value={lat} onChange={setLat} placeholder="40.4168" step="any" />
          </Field>
          <Field label="Longitud">
            <NumInput value={lng} onChange={setLng} placeholder="-3.7038" step="any" />
          </Field>
        </div>
      </CollapsibleSection>

      <ErrorMsg error={err} />
      <SubmitBtn loading={saving} label="Guardar ciudad" color="#BF5AF2" />
    </form>
  );
}
