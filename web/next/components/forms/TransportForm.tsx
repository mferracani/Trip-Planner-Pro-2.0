"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createTransport, updateTransport, deleteTransport } from "@/lib/firestore";
import type { Transport } from "@/lib/types";
import { COMMON_TIMEZONES, localToUtcTimestamp, guessTimezone } from "@/lib/datetime";
import { FormSheet } from "./FormSheet";
import { Field, TextInput, NumberInput, SelectInput } from "./fields";

interface Props {
  tripId: string;
  existing?: Transport;
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

const TRANSPORT_TYPES: { value: Transport["type"]; label: string }[] = [
  { value: "train", label: "🚆 Tren" },
  { value: "bus", label: "🚌 Bus" },
  { value: "ferry", label: "⛴️ Ferry" },
  { value: "car", label: "🚗 Auto" },
  { value: "car_rental", label: "🚙 Alquiler de auto" },
  { value: "taxi", label: "🚕 Taxi / Uber" },
  { value: "subway", label: "🚇 Metro / subte" },
  { value: "other", label: "🚐 Otro" },
];

export function TransportForm({ tripId, existing, initialDate, onClose, onSaved }: Props) {
  const { user, ownerUid } = useAuth();
  const defaultTz = guessTimezone();

  const [type, setType] = useState<Transport["type"]>(existing?.type ?? "train");
  const [origin, setOrigin] = useState(existing?.origin ?? "");
  const [destination, setDestination] = useState(existing?.destination ?? "");
  const [departureLocal, setDepartureLocal] = useState(
    existing?.departure_local_time ?? (initialDate ? `${initialDate}T00:00` : "")
  );
  const [departureTz, setDepartureTz] = useState(existing?.departure_timezone ?? defaultTz);
  const [arrivalLocal, setArrivalLocal] = useState(existing?.arrival_local_time ?? "");
  const [arrivalTz, setArrivalTz] = useState(existing?.arrival_timezone ?? defaultTz);
  const [operator, setOperator] = useState(existing?.operator ?? "");
  const [bookingRef, setBookingRef] = useState(existing?.booking_ref ?? "");
  const [price, setPrice] = useState<number | null>(existing?.price ?? null);
  const [currency, setCurrency] = useState(existing?.currency ?? "USD");
  const [priceUsd, setPriceUsd] = useState<number | null>(existing?.price_usd ?? null);
  const [paidAmount, setPaidAmount] = useState<number | null>(existing?.paid_amount ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!(origin.trim() && destination.trim() && departureLocal);

  async function handleSubmit() {
    const uid = ownerUid ?? user?.uid;
    if (!uid || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const depUtc = localToUtcTimestamp(departureLocal, departureTz);
      if (!depUtc) throw new Error("Fecha de salida inválida");
      const arrUtc = arrivalLocal ? localToUtcTimestamp(arrivalLocal, arrivalTz) : null;

      const data: Omit<Transport, "id"> = {
        trip_id: tripId,
        type,
        origin: origin.trim(),
        destination: destination.trim(),
        departure_local_time: departureLocal,
        departure_timezone: departureTz,
        departure_utc: depUtc,
        arrival_local_time: arrivalLocal || undefined,
        arrival_timezone: arrivalLocal ? arrivalTz : undefined,
        arrival_utc: arrUtc ?? undefined,
        operator: operator.trim() || undefined,
        booking_ref: bookingRef.trim() || undefined,
        price: price ?? undefined,
        currency: price != null ? currency : undefined,
        price_usd: priceUsd ?? undefined,
        paid_amount: paidAmount ?? undefined,
      };
      if (existing) {
        await updateTransport(uid, tripId, existing.id, data);
      } else {
        await createTransport(uid, tripId, data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const uid = ownerUid ?? user?.uid;
    if (!uid || !existing) return;
    setSaving(true);
    setError(null);
    try {
      await deleteTransport(uid, tripId, existing.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  const tzOptions = COMMON_TIMEZONES.map((tz) => ({ value: tz, label: tz }));

  return (
    <FormSheet
      title={existing ? "Editar transporte" : "Nuevo transporte"}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={existing ? handleDelete : undefined}
      submitting={saving}
      canSubmit={canSubmit}
      error={error}
    >
      <Field label="Tipo">
        <SelectInput value={type} onChange={setType} options={TRANSPORT_TYPES} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Origen">
          <TextInput value={origin} onChange={setOrigin} placeholder="Madrid Atocha" />
        </Field>
        <Field label="Destino">
          <TextInput value={destination} onChange={setDestination} placeholder="Barcelona Sants" />
        </Field>
      </div>

      <Field label="Salida (local)">
        <TextInput
          value={departureLocal}
          onChange={setDepartureLocal}
          type="datetime-local"
        />
      </Field>
      <Field label="Timezone salida">
        <SelectInput value={departureTz} onChange={setDepartureTz} options={tzOptions} />
      </Field>

      <Field label="Llegada (local)" hint="Opcional">
        <TextInput value={arrivalLocal} onChange={setArrivalLocal} type="datetime-local" />
      </Field>
      {arrivalLocal && (
        <Field label="Timezone llegada">
          <SelectInput value={arrivalTz} onChange={setArrivalTz} options={tzOptions} />
        </Field>
      )}

      <Field label="Operador">
        <TextInput value={operator} onChange={setOperator} placeholder="Renfe" />
      </Field>
      <Field label="Booking ref">
        <TextInput value={bookingRef} onChange={setBookingRef} placeholder="ABC123" />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Precio">
          <NumberInput value={price} onChange={setPrice} placeholder="75" />
        </Field>
        <Field label="Moneda">
          <TextInput value={currency} onChange={setCurrency} placeholder="EUR" />
        </Field>
        <Field label="USD">
          <NumberInput value={priceUsd} onChange={setPriceUsd} placeholder="80" />
        </Field>
      </div>

      <Field label="Pagado" hint="Monto ya abonado en la misma moneda">
        <NumberInput value={paidAmount} onChange={setPaidAmount} placeholder="0" />
      </Field>
    </FormSheet>
  );
}
