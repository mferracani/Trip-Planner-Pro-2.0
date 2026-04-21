"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createHotel, updateHotel, deleteHotel } from "@/lib/firestore";
import type { Hotel, City } from "@/lib/types";
import { FormSheet } from "./FormSheet";
import { Field, TextInput, NumberInput, SelectInput } from "./fields";

interface Props {
  tripId: string;
  cities: City[];
  existing?: Hotel;
  onClose: () => void;
  onSaved: () => void;
}

export function HotelForm({ tripId, cities, existing, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [cityId, setCityId] = useState(existing?.city_id ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [brand, setBrand] = useState(existing?.brand ?? "");
  const [checkIn, setCheckIn] = useState(existing?.check_in ?? "");
  const [checkOut, setCheckOut] = useState(existing?.check_out ?? "");
  const [roomType, setRoomType] = useState(existing?.room_type ?? "");
  const [bookingRef, setBookingRef] = useState(existing?.booking_ref ?? "");
  const [pricePerNight, setPricePerNight] = useState<number | null>(existing?.price_per_night ?? null);
  const [currency, setCurrency] = useState(existing?.currency ?? "USD");
  const [totalUsd, setTotalUsd] = useState<number | null>(existing?.total_price_usd ?? null);
  const [paidAmount, setPaidAmount] = useState<number | null>(existing?.paid_amount ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!(name.trim() && checkIn && checkOut);

  async function handleSubmit() {
    if (!user || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const nights = checkIn && checkOut
        ? Math.max(0, Math.round((new Date(checkOut + "T00:00:00").getTime() - new Date(checkIn + "T00:00:00").getTime()) / 86400000))
        : 0;
      const totalPrice = pricePerNight != null && nights > 0 ? pricePerNight * nights : undefined;

      const data: Omit<Hotel, "id"> = {
        trip_id: tripId,
        city_id: cityId,
        name: name.trim(),
        brand: brand.trim() || undefined,
        check_in: checkIn,
        check_out: checkOut,
        room_type: roomType.trim() || undefined,
        booking_ref: bookingRef.trim() || undefined,
        price_per_night: pricePerNight ?? undefined,
        total_price: totalPrice,
        currency: pricePerNight != null ? currency : undefined,
        total_price_usd: totalUsd ?? undefined,
        paid_amount: paidAmount ?? undefined,
      };
      if (existing) {
        await updateHotel(user.uid, tripId, existing.id, data);
      } else {
        await createHotel(user.uid, tripId, data);
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
      await deleteHotel(user.uid, tripId, existing.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <FormSheet
      title={existing ? "Editar hotel" : "Nuevo hotel"}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={existing ? handleDelete : undefined}
      submitting={saving}
      canSubmit={canSubmit}
      error={error}
    >
      <Field label="Nombre">
        <TextInput value={name} onChange={setName} placeholder="Park Hyatt" />
      </Field>
      <Field label="Cadena / marca">
        <TextInput value={brand} onChange={setBrand} placeholder="Hyatt" />
      </Field>

      {cities.length > 0 && (
        <Field label="Ciudad">
          <SelectInput
            value={cityId}
            onChange={setCityId}
            options={[{ value: "", label: "— sin ciudad —" }, ...cities.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Check-in">
          <TextInput value={checkIn} onChange={setCheckIn} type="date" />
        </Field>
        <Field label="Check-out">
          <TextInput value={checkOut} onChange={setCheckOut} type="date" />
        </Field>
      </div>

      <Field label="Tipo de habitación">
        <TextInput value={roomType} onChange={setRoomType} placeholder="King Suite" />
      </Field>
      <Field label="Booking ref">
        <TextInput value={bookingRef} onChange={setBookingRef} placeholder="ABC123" />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Precio/noche">
          <NumberInput value={pricePerNight} onChange={setPricePerNight} placeholder="180" />
        </Field>
        <Field label="Moneda">
          <TextInput value={currency} onChange={setCurrency} placeholder="USD" />
        </Field>
        <Field label="Total USD">
          <NumberInput value={totalUsd} onChange={setTotalUsd} placeholder="720" />
        </Field>
      </div>

      <Field label="Pagado" hint="Monto ya abonado en la misma moneda">
        <NumberInput value={paidAmount} onChange={setPaidAmount} placeholder="0" />
      </Field>
    </FormSheet>
  );
}
