"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { updateTrip, deleteTrip } from "@/lib/firestore";
import type { Trip } from "@/lib/types";
import { FormSheet } from "./FormSheet";
import { Field, TextInput } from "./fields";

interface Props {
  trip: Trip;
  onClose: () => void;
  onSaved: () => void;
}

export function TripForm({ trip, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(trip.start_date);
  const [endDate, setEndDate] = useState(trip.end_date);
  const [coverUrl, setCoverUrl] = useState(trip.cover_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!(name.trim() && startDate && endDate && endDate >= startDate);

  async function handleSubmit() {
    if (!user || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await updateTrip(user.uid, trip.id, {
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        cover_url: coverUrl.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await deleteTrip(user.uid, trip.id);
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

      <Field label="Portada (URL)" hint="Opcional — imagen de fondo para el hero card">
        <TextInput value={coverUrl} onChange={setCoverUrl} placeholder="https://…" />
      </Field>
    </FormSheet>
  );
}
