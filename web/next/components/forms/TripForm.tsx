"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { updateTrip, deleteTrip } from "@/lib/firestore";
import type { Trip } from "@/lib/types";
import { FormSheet } from "./FormSheet";
import { Field, TextInput } from "./fields";
import { TRIP_THEMES } from "@/lib/themes";
import type { TripTheme } from "@/lib/themes";

interface Props {
  trip: Trip;
  onClose: () => void;
  onSaved: () => void;
}

const NATURE_THEMES = TRIP_THEMES.filter(t => t.category === 'nature');
const CITY_THEMES   = TRIP_THEMES.filter(t => t.category === 'city');

function groupByFamily(themes: TripTheme[]): [string, TripTheme[]][] {
  const map = new Map<string, TripTheme[]>();
  for (const t of themes) {
    if (!map.has(t.groupId)) map.set(t.groupId, []);
    map.get(t.groupId)!.push(t);
  }
  return Array.from(map.entries());
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: TripTheme;
  selected: string;
  onSelect: (coverUrl: string) => void;
}) {
  const isSelected = selected === theme.coverUrl;
  // Extract roman numeral suffix or show base indicator
  const labelParts = theme.label.split(' ');
  const suffix = labelParts.length > 1 ? labelParts[labelParts.length - 1] : theme.emoji;

  return (
    <button
      type="button"
      onClick={() => onSelect(theme.coverUrl)}
      className="relative overflow-hidden rounded-[8px] aspect-video transition-all"
      style={{
        border: isSelected ? '2px solid #FFFFFF' : '2px solid transparent',
        opacity: isSelected ? 1 : 0.55,
      }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${theme.coverUrl})` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(160deg, ${theme.gradientFrom}, rgba(13,13,13,0.7) 100%)`,
        }}
      />
      <div className="relative flex flex-col items-center justify-end h-full pb-1">
        <span className="text-white text-[9px] font-bold leading-none opacity-90">{suffix}</span>
      </div>
    </button>
  );
}

function ThemeSection({
  themes,
  selected,
  onSelect,
}: {
  themes: TripTheme[];
  selected: string;
  onSelect: (coverUrl: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {groupByFamily(themes).map(([groupId, variants]) => {
        const baseLabel = variants[0].label.replace(/ (II|III|IV)$/, '');
        return (
          <div key={groupId}>
            <p className="text-[10px] text-[#555] uppercase tracking-wide mb-1">
              {baseLabel}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {variants.map(theme => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={selected}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TripForm({ trip, onClose, onSaved }: Props) {
  const { user, ownerUid } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(trip.start_date);
  const [endDate, setEndDate] = useState(trip.end_date);
  const [coverUrl, setCoverUrl] = useState(trip.cover_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsplashPhotos, setUnsplashPhotos] = useState<{ id: string; thumb: string; full: string }[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);

  useEffect(() => {
    const query = name.trim();
    if (query.length < 3) { setUnsplashPhotos([]); return; }
    const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    if (!key) return;
    const t = setTimeout(async () => {
      setUnsplashLoading(true);
      try {
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape&client_id=${key}`
        );
        const data = await res.json();
        setUnsplashPhotos(
          (data.results ?? []).map((r: { id: string; urls: { small: string; regular: string } }) => ({
            id: r.id,
            thumb: r.urls.small,
            full: r.urls.regular,
          }))
        );
      } catch {
        // silently ignore
      } finally {
        setUnsplashLoading(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [name]);

  const canSubmit = !!(name.trim() && startDate && endDate && endDate >= startDate);

  async function handleSubmit() {
    const uid = ownerUid ?? user?.uid;
    if (!uid || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await updateTrip(uid, trip.id, {
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        cover_url: coverUrl || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const uid = ownerUid ?? user?.uid;
    if (!uid) return;
    setSaving(true);
    setError(null);
    try {
      await deleteTrip(uid, trip.id);
      queryClient.invalidateQueries({ queryKey: ["trips", uid] });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <FormSheet
      title="Editar viaje"
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      submitting={saving}
      canSubmit={canSubmit}
      error={error}
    >
      <Field label="Nombre">
        <TextInput value={name} onChange={setName} placeholder="Europa 2026" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Inicio">
          <TextInput value={startDate} onChange={setStartDate} type="date" />
        </Field>
        <Field label="Fin">
          <TextInput value={endDate} onChange={setEndDate} type="date" />
        </Field>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-[#A0A0A0] uppercase tracking-wide mb-2">
          Portada
        </label>

        {/* Unsplash photo search */}
        {process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY && (
          <div className="mb-3">
            {unsplashLoading ? (
              <div className="flex items-center gap-2 text-[12px] text-[#4D4D4D] py-2">
                <span className="animate-spin inline-block w-3 h-3 border border-[#333] border-t-[#707070] rounded-full" />
                Buscando fotos…
              </div>
            ) : unsplashPhotos.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold text-[#707070] uppercase tracking-wide mb-1.5">
                  Fotos · {name}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {unsplashPhotos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setCoverUrl(photo.full)}
                      className="relative overflow-hidden rounded-[8px] aspect-video transition-all"
                      style={{
                        border: coverUrl === photo.full ? "2px solid #FFFFFF" : "2px solid transparent",
                        opacity: coverUrl === photo.full ? 1 : 0.6,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.thumb} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#3D3D3D] mt-1 text-right">Fotos: Unsplash</p>
              </div>
            ) : null}
          </div>
        )}

        <button
          type="button"
          onClick={() => setCoverUrl("")}
          className="mb-3 w-full rounded-[10px] border py-2 text-[13px] font-semibold transition-all"
          style={{
            border: coverUrl === "" ? "2px solid #FFFFFF" : "2px solid #333",
            color: coverUrl === "" ? "#FFFFFF" : "#707070",
            background: coverUrl === "" ? "#242424" : "transparent",
          }}
        >
          Sin tema
        </button>

        <p className="text-[11px] font-semibold text-[#707070] uppercase tracking-wide mb-1.5">
          Naturaleza
        </p>
        <ThemeSection themes={NATURE_THEMES} selected={coverUrl} onSelect={setCoverUrl} />

        <p className="text-[11px] font-semibold text-[#707070] uppercase tracking-wide mt-3 mb-1.5">
          Ciudades
        </p>
        <ThemeSection themes={CITY_THEMES} selected={coverUrl} onSelect={setCoverUrl} />
      </div>
    </FormSheet>
  );
}
