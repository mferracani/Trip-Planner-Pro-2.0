"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createCity, updateCity, deleteCity, getCitySettings, upsertCitySetting, getAllCities } from "@/lib/firestore";
import { CITY_COLORS, type City, type CitySetting } from "@/lib/types";
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
  initialDays?: string[];
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

function normalizeCity(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}


export function CityForm({ tripId, tripStart, tripEnd, usedColors, existing, initialDay, initialDays, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(existing?.name ?? "");
  const [lat, setLat] = useState<number | null>(existing?.lat ?? null);
  const [lng, setLng] = useState<number | null>(existing?.lng ?? null);
  const [timezone, setTimezone] = useState(existing?.timezone ?? "America/Argentina/Buenos_Aires");
  const [color, setColor] = useState(
    existing?.color ?? CITY_COLORS.find((c) => !usedColors.includes(c)) ?? CITY_COLORS[0]
  );
  const [days, setDays] = useState<string[]>(existing?.days ?? (initialDays?.length ? initialDays : initialDay ? [initialDay] : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catalog chips — cities from all user trips, shown as horizontal scrollable chips
  const [catalogCities, setCatalogCities] = useState<CitySetting[]>([]);

  useEffect(() => {
    if (!user || existing) return;
    Promise.all([getCitySettings(user.uid), getAllCities(user.uid)]).then(
      ([settings, tripCities]) => {
        const seen = new Map(settings.map((s) => [s.normalized_name, s]));
        const merged: CitySetting[] = [...settings];
        for (const c of tripCities) {
          const key = normalizeCity(c.name);
          if (!seen.has(key)) {
            seen.set(key, { normalized_name: key, name: c.name, color: c.color, country_code: c.country_code });
            merged.push({ normalized_name: key, name: c.name, color: c.color, country_code: c.country_code });
          }
        }
        merged.sort((a, b) => a.name.localeCompare(b.name));
        setCatalogCities(merged);
      }
    ).catch(() => {
      // Error silencioso — no mostrar sugerencias si falla la query
    });
  }, [user, existing]);

  function pickCatalogCity(cs: CitySetting) {
    setName(cs.name);
    if (cs.color) setColor(cs.color);
  }

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
      // Sync color to global city_settings — all trips show the same color
      await upsertCitySetting(user.uid, normalizeCity(name.trim()), {
        name: name.trim(),
        color,
      });
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
      {/* Catalog chips — only when creating new and there are previous cities */}
      {!existing && catalogCities.length > 0 && (
        <div className="mb-1">
          <p className="text-[11px] font-medium text-[#707070] uppercase tracking-wide mb-2">
            Mis ciudades
          </p>
          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
              {catalogCities.map((cs) => (
                <button
                  key={cs.normalized_name}
                  onClick={() => pickCatalogCity(cs)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors hover:border-[#555]"
                  style={{
                    background: cs.color ? `${cs.color}1A` : "#1A1A1A",
                    border: `1px solid ${cs.color ? `${cs.color}59` : "#333"}`,
                    color: "#A0A0A0",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#A0A0A0"; }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cs.color ?? "#555" }}
                  />
                  {cs.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
