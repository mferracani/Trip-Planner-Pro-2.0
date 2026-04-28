"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateCity } from "@/lib/firestore";
import { City, CITY_COLORS, COUNTRY_COLORS } from "@/lib/types";

// ── helpers (same as CalendarView) ───────────────────────────────────────────

import { CITY_TO_COUNTRY } from "@/lib/types";

function normalizeCity(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectCountryCode(city: City): string | undefined {
  if (city.country_code) return city.country_code;
  return CITY_TO_COUNTRY[normalizeCity(city.name)];
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

function cityColor(city: City): string {
  const code = detectCountryCode(city);
  if (code && COUNTRY_COLORS[code]) return COUNTRY_COLORS[code];
  return city.color;
}

// ── country quick-pick list ───────────────────────────────────────────────────

const QUICK_COUNTRIES: { code: string; name: string }[] = [
  { code: "AR", name: "Argentina" },
  { code: "ES", name: "España" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
  { code: "IT", name: "Italia" },
  { code: "PT", name: "Portugal" },
  { code: "CH", name: "Suiza" },
  { code: "AT", name: "Austria" },
  { code: "GB", name: "Reino Unido" },
  { code: "NL", name: "Países Bajos" },
  { code: "BE", name: "Bélgica" },
  { code: "GR", name: "Grecia" },
  { code: "HR", name: "Croacia" },
  { code: "CZ", name: "Rep. Checa" },
  { code: "HU", name: "Hungría" },
  { code: "PL", name: "Polonia" },
  { code: "TR", name: "Turquía" },
  { code: "US", name: "EEUU" },
  { code: "CA", name: "Canadá" },
  { code: "MX", name: "México" },
  { code: "BR", name: "Brasil" },
  { code: "CL", name: "Chile" },
  { code: "UY", name: "Uruguay" },
  { code: "JP", name: "Japón" },
  { code: "TH", name: "Tailandia" },
  { code: "AU", name: "Australia" },
  { code: "SG", name: "Singapur" },
  { code: "MA", name: "Marruecos" },
  { code: "AE", name: "Emiratos" },
  { code: "ZA", name: "Sudáfrica" },
  { code: "SCO", name: "Escocia" },
  { code: "CU", name: "Cuba" },
];

// Color palette: 8 generic + top country colors
const COLOR_PALETTE = [
  ...CITY_COLORS,
  "#C60B1E", "#74ACDF", "#009246", "#0055A4",
  "#DD0000", "#BC002D", "#0D5EAF", "#169B62",
  "#006AA7", "#E30A17", "#C60C30", "#006600",
];

// ── CityRow ───────────────────────────────────────────────────────────────────

function CityRow({
  city,
  tripId,
  onChanged,
}: {
  city: City;
  tripId: string;
  onChanged: () => void;
}) {
  const { user, ownerUid } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const resolvedCode = detectCountryCode(city);
  const resolvedColor = cityColor(city);

  async function saveField(data: Partial<Omit<City, "id">>) {
    const uid = ownerUid ?? user?.uid;
    if (!uid) return;
    setSaving(true);
    try {
      await updateCity(uid, tripId, city.id, data);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function selectColor(hex: string) {
    await saveField({ color: hex });
  }

  async function selectCountry(code: string) {
    const color = COUNTRY_COLORS[code] ?? city.color;
    await saveField({ country_code: code, color });
  }

  async function clearCountry() {
    await saveField({ country_code: undefined });
  }

  return (
    <div
      className="rounded-[14px] overflow-hidden transition-all"
      style={{
        backgroundColor: `${resolvedColor}12`,
        border: `1px solid ${resolvedColor}35`,
      }}
    >
      {/* ── collapsed row ── */}
      <button
        className="w-full flex items-center gap-2.5 px-3 py-3 press-feedback"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Flag or dot */}
        <span className="text-[20px] leading-none w-7 text-center flex-shrink-0">
          {resolvedCode ? countryFlag(resolvedCode) : (
            <span
              className="inline-block w-4 h-4 rounded-full"
              style={{ backgroundColor: resolvedColor }}
            />
          )}
        </span>

        {/* Name + days */}
        <div className="flex-1 text-left">
          <p className="text-[13px] font-bold text-white uppercase tracking-wide leading-none">
            {city.name}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: `${resolvedColor}99` }}>
            {city.days.length} día{city.days.length === 1 ? "" : "s"}
            {resolvedCode ? ` · ${resolvedCode}` : " · sin país asignado"}
          </p>
        </div>

        {/* Color swatch */}
        <div
          className="w-5 h-5 rounded-full border-2 border-white/10 flex-shrink-0"
          style={{ backgroundColor: resolvedColor }}
        />

        {/* Chevron */}
        <span
          className="text-[#4D4D4D] text-[16px] flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ⌄
        </span>
      </button>

      {/* ── expanded panel ── */}
      {open && (
        <div className="px-3 pb-4 space-y-4 border-t border-white/5">
          {/* Country picker */}
          <div className="pt-3">
            <p className="text-[10px] text-[#707070] uppercase tracking-wider font-semibold mb-2">
              País
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_COUNTRIES.map(({ code, name }) => {
                const active = resolvedCode === code;
                const c = COUNTRY_COLORS[code] ?? "#4D96FF";
                return (
                  <button
                    key={code}
                    onClick={() => active ? clearCountry() : selectCountry(code)}
                    disabled={saving}
                    title={name}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all press-feedback"
                    style={{
                      backgroundColor: active ? `${c}35` : "#1A1A1A",
                      border: `1px solid ${active ? c : "#333"}`,
                      color: active ? c : "#A0A0A0",
                    }}
                  >
                    <span className="text-[12px]">{countryFlag(code)}</span>
                    <span>{code}</span>
                  </button>
                );
              })}
            </div>
            {resolvedCode && (
              <p className="text-[10px] text-[#707070] mt-1.5">
                Tocá el país seleccionado para quitar la asignación.
              </p>
            )}
          </div>

          {/* Color picker */}
          <div>
            <p className="text-[10px] text-[#707070] uppercase tracking-wider font-semibold mb-2">
              Color personalizado
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((hex) => {
                const active = city.color === hex;
                return (
                  <button
                    key={hex}
                    onClick={() => selectColor(hex)}
                    disabled={saving}
                    className="w-8 h-8 rounded-full transition-all press-feedback flex-shrink-0"
                    style={{
                      backgroundColor: hex,
                      boxShadow: active
                        ? `0 0 0 2px #0D0D0D, 0 0 0 4px ${hex}`
                        : undefined,
                      transform: active ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-[#4D4D4D] mt-1.5">
              Si hay un país asignado, el color del país toma prioridad en el calendario.
            </p>
          </div>

          {saving && (
            <p className="text-[10px] text-[#707070] text-center">Guardando…</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── CitiesPanel ───────────────────────────────────────────────────────────────

export function CitiesPanel({
  cities,
  tripId,
  onChanged,
}: {
  cities: City[];
  tripId: string;
  onChanged: () => void;
}) {
  if (cities.length === 0) return null;

  return (
    <div className="mt-6 px-1">
      <p className="text-[10px] text-[#4D4D4D] uppercase tracking-wider font-semibold mb-3">
        Editar ciudades
      </p>
      <div className="space-y-2">
        {cities.map((city) => (
          <CityRow
            key={city.id}
            city={city}
            tripId={tripId}
            onChanged={onChanged}
          />
        ))}
      </div>
    </div>
  );
}
