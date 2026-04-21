"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createCity, updateCity, deleteCity } from "@/lib/firestore";
import { CITY_COLORS, type City } from "@/lib/types";
import { COMMON_TIMEZONES } from "@/lib/datetime";
import { FormSheet } from "./FormSheet";
import { Field, TextInput, NumberInput, SelectInput } from "./fields";

interface Props {
  tripId: string;
  tripStart: string;
  tripEnd: string;
  usedColors: string[];
  existing?: City;
  initialDay?: string;
  onClose: () => void;
  onSaved: () => void;
}

function* dateRange(start: string, end: string): Generator<string> {
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    yield cur.toISOString().split("T")[0];
    cur.setDate(cur.getDate() + 1);
  }
}

export function CityForm({ tripId, tripStart, tripEnd, usedColors, existing, initialDay, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(existing?.name ?? "");
  const [lat, setLat] = useState<number | null>(existing?.lat ?? null);
  const [lng, setLng] = useState<number | null>(existing?.lng ?? null);
  const [timezone, setTimezone] = useState(existing?.timezone ?? "America/Argentina/Buenos_Aires");
  const [color, setColor] = useState(
    existing?.color ?? CITY_COLORS.find((c) => !usedColors.includes(c)) ?? CITY_COLORS[0]
  );
  const [days, setDays] = useState<string[]>(existing?.days ?? (initialDay ? [initialDay] : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleSubmit() {
    if (!user || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const data = {
        trip_id: tripId,
        name: name.trim(),
        lat: lat ?? 0,
        lng: lng ?? 0,
        color,
        timezone,
        days: [...days].sort(),
      };
      if (existing) {
        await updateCity(user.uid, tripId, existing.id, data);
      } else {
        await createCity(user.uid, tripId, data);
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
      await deleteCity(user.uid, tripId, existing.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  const allDates = Array.from(dateRange(tripStart, tripEnd));

  return (
    <FormSheet
      title={existing ? "Editar ciudad" : "Nueva ciudad"}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={existing ? handleDelete : undefined}
      submitting={saving}
      canSubmit={!!name.trim()}
      error={error}
    >
      <Field label="Nombre">
        <TextInput value={name} onChange={setName} placeholder="Buenos Aires" />
      </Field>

      <Field label="Color">
        <div className="flex flex-wrap gap-2">
          {CITY_COLORS.map((c) => {
            const taken = usedColors.includes(c) && c !== existing?.color;
            return (
              <button
                key={c}
                onClick={() => setColor(c)}
                disabled={taken}
                className="w-9 h-9 rounded-full transition-all disabled:opacity-30"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid white` : "none",
                  outlineOffset: 2,
                }}
              />
            );
          })}
        </div>
      </Field>

      <Field label="Timezone">
        <SelectInput
          value={timezone}
          onChange={setTimezone}
          options={COMMON_TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitud">
          <NumberInput value={lat} onChange={setLat} placeholder="-34.61" />
        </Field>
        <Field label="Longitud">
          <NumberInput value={lng} onChange={setLng} placeholder="-58.38" />
        </Field>
      </div>

      <Field label={`Días (${days.length})`} hint="Seleccioná los días que pasás en esta ciudad">
        <div className="grid grid-cols-7 gap-1">
          {allDates.map((d) => {
            const active = days.includes(d);
            const dayNum = parseInt(d.split("-")[2]);
            return (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className="aspect-square rounded-[8px] text-[12px] font-semibold transition-all"
                style={{
                  backgroundColor: active ? color : "#1A1A1A",
                  color: active ? "#000" : "#A0A0A0",
                  border: `1px solid ${active ? color : "#333"}`,
                }}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </Field>
    </FormSheet>
  );
}
