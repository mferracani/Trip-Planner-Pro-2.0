"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getCitySettings, getAllCities, upsertCitySetting, type CityWithTrip } from "@/lib/firestore";
import { CITY_COLORS, COUNTRY_COLORS, CITY_TO_COUNTRY, type CitySetting } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function normalizeCity(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

function resolveColor(setting: CitySetting | undefined, fallbackColor: string): string {
  if (setting?.color) return setting.color;
  const code = setting?.country_code;
  if (code && COUNTRY_COLORS[code]) return COUNTRY_COLORS[code];
  return fallbackColor;
}

function resolveCountryCode(name: string, setting: CitySetting | undefined): string | undefined {
  return setting?.country_code ?? CITY_TO_COUNTRY[normalizeCity(name)];
}

// ── country quick-pick ────────────────────────────────────────────────────────

const QUICK_COUNTRIES: { code: string; name: string }[] = [
  { code: "AR", name: "Argentina" }, { code: "ES", name: "España" },
  { code: "FR", name: "Francia" },   { code: "DE", name: "Alemania" },
  { code: "IT", name: "Italia" },    { code: "PT", name: "Portugal" },
  { code: "CH", name: "Suiza" },     { code: "AT", name: "Austria" },
  { code: "GB", name: "R. Unido" },  { code: "NL", name: "P. Bajos" },
  { code: "BE", name: "Bélgica" },   { code: "GR", name: "Grecia" },
  { code: "HR", name: "Croacia" },   { code: "CZ", name: "R. Checa" },
  { code: "HU", name: "Hungría" },   { code: "PL", name: "Polonia" },
  { code: "TR", name: "Turquía" },   { code: "US", name: "EEUU" },
  { code: "CA", name: "Canadá" },    { code: "MX", name: "México" },
  { code: "BR", name: "Brasil" },    { code: "CL", name: "Chile" },
  { code: "UY", name: "Uruguay" },   { code: "JP", name: "Japón" },
  { code: "TH", name: "Tailandia" }, { code: "AU", name: "Australia" },
  { code: "SG", name: "Singapur" },  { code: "MA", name: "Marruecos" },
  { code: "AE", name: "Emiratos" },  { code: "ZA", name: "Sudáfrica" },
  { code: "SCO", name: "Escocia" },   { code: "CU", name: "Cuba" },
];

const COLOR_PALETTE = [
  ...CITY_COLORS,
  "#C60B1E", "#74ACDF", "#009246", "#0055A4",
  "#DD0000", "#BC002D", "#0D5EAF", "#169B62",
  "#006AA7", "#E30A17", "#C60C30", "#006600",
];

// ── CityRow ───────────────────────────────────────────────────────────────────

function CityRow({
  cityName,
  trips,
  setting,
  fallbackColor,
  onSaved,
}: {
  cityName: string;
  trips: CityWithTrip[];
  setting: CitySetting | undefined;
  fallbackColor: string;
  onSaved: () => void;
}) {
  const { user, ownerUid } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const countryCode = resolveCountryCode(cityName, setting);
  const color = resolveColor(setting, fallbackColor);
  const normalizedName = normalizeCity(cityName);

  async function save(data: Partial<Omit<CitySetting, "normalized_name">>) {
    const uid = ownerUid ?? user?.uid;
    if (!uid) return;
    setSaving(true);
    try {
      await upsertCitySetting(uid, normalizedName, { name: cityName, ...data });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function selectCountry(code: string) {
    const newColor = COUNTRY_COLORS[code] ?? setting?.color ?? fallbackColor;
    await save({ country_code: code, color: newColor });
  }

  async function clearCountry() {
    await save({ country_code: undefined });
  }

  async function selectColor(hex: string) {
    await save({ color: hex });
  }

  const tripLabels = trips
    .slice(0, 3)
    .map((t) => t.trip_name)
    .join(", ");
  const extraTrips = trips.length > 3 ? ` +${trips.length - 3}` : "";

  return (
    <div
      className="rounded-[14px] overflow-hidden transition-all"
      style={{
        backgroundColor: `${color}12`,
        border: `1px solid ${color}35`,
      }}
    >
      {/* collapsed */}
      <button
        className="w-full flex items-center gap-3 px-3.5 py-3 press-feedback text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[22px] leading-none w-8 text-center flex-shrink-0">
          {countryCode ? (
            countryFlag(countryCode)
          ) : (
            <span
              className="inline-block w-5 h-5 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white uppercase tracking-wide leading-none truncate">
            {cityName}
          </p>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: `${color}99` }}>
            {tripLabels}{extraTrips}
            {countryCode ? ` · ${countryCode}` : " · sin país"}
          </p>
        </div>

        <div
          className="w-5 h-5 rounded-full border-2 border-white/10 flex-shrink-0"
          style={{ backgroundColor: color }}
        />

        <span
          className="text-[#4D4D4D] text-[16px] flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ⌄
        </span>
      </button>

      {/* expanded */}
      {open && (
        <div className="px-3.5 pb-4 space-y-4 border-t border-white/5">
          {/* Country */}
          <div className="pt-3">
            <p className="text-[10px] text-[#707070] uppercase tracking-wider font-semibold mb-2">
              País
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_COUNTRIES.map(({ code, name }) => {
                const active = countryCode === code;
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
            {countryCode && (
              <p className="text-[10px] text-[#707070] mt-1.5">
                Tocá el país seleccionado para quitar la asignación.
              </p>
            )}
          </div>

          {/* Color */}
          <div>
            <p className="text-[10px] text-[#707070] uppercase tracking-wider font-semibold mb-2">
              Color personalizado
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((hex) => {
                const active = (setting?.color ?? color) === hex;
                return (
                  <button
                    key={hex}
                    onClick={() => selectColor(hex)}
                    disabled={saving}
                    className="w-8 h-8 rounded-full press-feedback flex-shrink-0 transition-all"
                    style={{
                      backgroundColor: hex,
                      boxShadow: active ? `0 0 0 2px #0D0D0D, 0 0 0 4px ${hex}` : undefined,
                      transform: active ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-[#4D4D4D] mt-1.5">
              Si hay un país asignado, el color del país se usa en el calendario.
              El color personalizado es el fallback.
            </p>
          </div>

          {saving && (
            <p className="text-[10px] text-[#707070] text-center animate-pulse">
              Guardando…
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── CitiesCatalog ─────────────────────────────────────────────────────────────

export function CitiesCatalog() {
  const { ownerUid } = useAuth();
  const qc = useQueryClient();

  const { data: allCities = [], isLoading: loadingCities } = useQuery({
    queryKey: ["allCities", ownerUid],
    queryFn: () => getAllCities(ownerUid!),
    enabled: !!ownerUid,
  });

  const { data: settings = [], isLoading: loadingSettings } = useQuery({
    queryKey: ["citySettings", ownerUid],
    queryFn: () => getCitySettings(ownerUid!),
    enabled: !!ownerUid,
  });

  const settingsMap = useMemo(
    () => Object.fromEntries(settings.map((s) => [s.normalized_name, s])),
    [settings]
  );

  // Deduplicate by normalized name, group trips per city
  const uniqueCities = useMemo(() => {
    const map = new Map<string, { name: string; trips: CityWithTrip[]; fallbackColor: string }>();
    for (const c of allCities) {
      const key = normalizeCity(c.name);
      if (!map.has(key)) {
        map.set(key, { name: c.name, trips: [], fallbackColor: c.color });
      }
      map.get(key)!.trips.push(c);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allCities]);

  const isLoading = loadingCities || loadingSettings;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["citySettings", ownerUid] });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 rounded-full border-2 border-[#0A84FF] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (uniqueCities.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="text-[42px] mb-3">🌍</div>
        <p className="text-[#707070] text-[14px]">Todavía no hay ciudades.</p>
        <p className="text-[#4D4D4D] text-[12px] mt-1">
          Agregá ciudades en tus viajes y aparecerán acá.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 pb-32">
      <p className="text-[11px] text-[#4D4D4D] mb-4 leading-relaxed">
        Configurá el color y país de cada ciudad una sola vez.
        Se aplica en todos los viajes donde aparece.
      </p>
      {uniqueCities.map(({ name, trips, fallbackColor }) => (
        <CityRow
          key={normalizeCity(name)}
          cityName={name}
          trips={trips}
          setting={settingsMap[normalizeCity(name)]}
          fallbackColor={fallbackColor}
          onSaved={invalidate}
        />
      ))}
    </div>
  );
}
