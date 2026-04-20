"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createFlight, updateFlight, deleteFlight } from "@/lib/firestore";
import type { Flight } from "@/lib/types";
import { COMMON_TIMEZONES, localToUtcTimestamp, minutesBetween, guessTimezone } from "@/lib/datetime";
import { FormSheet } from "./FormSheet";
import { Field, TextInput, NumberInput, SelectInput } from "./fields";

interface Props {
  tripId: string;
  existing?: Flight;
  onClose: () => void;
  onSaved: () => void;
}

export function FlightForm({ tripId, existing, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const defaultTz = guessTimezone();

  const [airline, setAirline] = useState(existing?.airline ?? "");
  const [flightNumber, setFlightNumber] = useState(existing?.flight_number ?? "");
  const [originIata, setOriginIata] = useState(existing?.origin_iata ?? "");
  const [destinationIata, setDestinationIata] = useState(existing?.destination_iata ?? "");
  const [departureLocal, setDepartureLocal] = useState(existing?.departure_local_time ?? "");
  const [departureTz, setDepartureTz] = useState(existing?.departure_timezone ?? defaultTz);
  const [arrivalLocal, setArrivalLocal] = useState(existing?.arrival_local_time ?? "");
  const [arrivalTz, setArrivalTz] = useState(existing?.arrival_timezone ?? defaultTz);
  const [cabinClass, setCabinClass] = useState(existing?.cabin_class ?? "");
  const [seat, setSeat] = useState(existing?.seat ?? "");
  const [bookingRef, setBookingRef] = useState(existing?.booking_ref ?? "");
  const [price, setPrice] = useState<number | null>(existing?.price ?? null);
  const [currency, setCurrency] = useState(existing?.currency ?? "USD");
  const [priceUsd, setPriceUsd] = useState<number | null>(existing?.price_usd ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!(
    airline.trim() &&
    flightNumber.trim() &&
    originIata.trim() &&
    destinationIata.trim() &&
    departureLocal &&
    arrivalLocal
  );

  async function handleSubmit() {
    if (!user || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const depUtc = localToUtcTimestamp(departureLocal, departureTz);
      const arrUtc = localToUtcTimestamp(arrivalLocal, arrivalTz);
      if (!depUtc || !arrUtc) throw new Error("Fechas inválidas");

      const data: Omit<Flight, "id"> = {
        trip_id: tripId,
        airline: airline.trim(),
        flight_number: flightNumber.trim(),
        origin_iata: originIata.trim().toUpperCase(),
        destination_iata: destinationIata.trim().toUpperCase(),
        departure_local_time: departureLocal,
        departure_timezone: departureTz,
        departure_utc: depUtc,
        arrival_local_time: arrivalLocal,
        arrival_timezone: arrivalTz,
        arrival_utc: arrUtc,
        duration_minutes: minutesBetween(depUtc, arrUtc),
        cabin_class: cabinClass.trim() || undefined,
        seat: seat.trim() || undefined,
        booking_ref: bookingRef.trim() || undefined,
        price: price ?? undefined,
        currency: price != null ? currency : undefined,
        price_usd: priceUsd ?? undefined,
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

  async function handleDelete() {
    if (!user || !existing) return;
    setSaving(true);
    setError(null);
    try {
      await deleteFlight(user.uid, tripId, existing.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  const tzOptions = COMMON_TIMEZONES.map((tz) => ({ value: tz, label: tz }));

  return (
    <FormSheet
      title={existing ? "Editar vuelo" : "Nuevo vuelo"}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={existing ? handleDelete : undefined}
      submitting={saving}
      canSubmit={canSubmit}
      error={error}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Aerolínea">
          <TextInput value={airline} onChange={setAirline} placeholder="Aerolíneas Arg." />
        </Field>
        <Field label="Número">
          <TextInput value={flightNumber} onChange={setFlightNumber} placeholder="AR1676" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Origen (IATA)">
          <TextInput value={originIata} onChange={setOriginIata} placeholder="EZE" />
        </Field>
        <Field label="Destino (IATA)">
          <TextInput value={destinationIata} onChange={setDestinationIata} placeholder="MAD" />
        </Field>
      </div>

      <Field label="Salida (local)">
        <TextInput
          value={departureLocal}
          onChange={setDepartureLocal}
          placeholder="2026-03-15T21:35"
          type="datetime-local"
        />
      </Field>
      <Field label="Timezone salida">
        <SelectInput value={departureTz} onChange={setDepartureTz} options={tzOptions} />
      </Field>

      <Field label="Llegada (local)">
        <TextInput
          value={arrivalLocal}
          onChange={setArrivalLocal}
          placeholder="2026-03-16T14:20"
          type="datetime-local"
        />
      </Field>
      <Field label="Timezone llegada">
        <SelectInput value={arrivalTz} onChange={setArrivalTz} options={tzOptions} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Clase">
          <TextInput value={cabinClass} onChange={setCabinClass} placeholder="Economy" />
        </Field>
        <Field label="Asiento">
          <TextInput value={seat} onChange={setSeat} placeholder="24A" />
        </Field>
      </div>

      <Field label="Booking ref">
        <TextInput value={bookingRef} onChange={setBookingRef} placeholder="ABC123" />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Precio">
          <NumberInput value={price} onChange={setPrice} placeholder="850" />
        </Field>
        <Field label="Moneda">
          <TextInput value={currency} onChange={setCurrency} placeholder="USD" />
        </Field>
        <Field label="USD">
          <NumberInput value={priceUsd} onChange={setPriceUsd} placeholder="850" />
        </Field>
      </div>
    </FormSheet>
  );
}
