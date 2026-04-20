"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createTrip } from "@/lib/firestore";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTripModal({ onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!user || !name.trim() || !startDate || !endDate) return;
    if (endDate < startDate) {
      setError("La fecha de fin no puede ser antes del inicio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTrip(user.uid, {
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        total_usd: 0,
      });
      onCreated();
    } catch (e) {
      setError("Error al crear el viaje. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-[#1A1A1A] rounded-t-[20px] p-6 pb-10 animate-slide-up">
        {/* Handle */}
        <div className="w-9 h-1 bg-[#333] rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[22px] font-semibold text-white">Nuevo viaje</h2>
          <button onClick={onClose} className="text-[#A0A0A0] text-[15px]">Cancelar</button>
        </div>

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-[13px] text-[#A0A0A0] mb-1.5 block">Nombre del viaje</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Europa 2026"
              className="w-full bg-[#242424] border border-[#333] rounded-[12px] px-4 py-3 text-white text-[17px] placeholder-[#707070] outline-none focus:border-[#0A84FF] transition-colors"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] text-[#A0A0A0] mb-1.5 block">Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#242424] border border-[#333] rounded-[12px] px-4 py-3 text-white text-[15px] outline-none focus:border-[#0A84FF] transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-[13px] text-[#A0A0A0] mb-1.5 block">Fin</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#242424] border border-[#333] rounded-[12px] px-4 py-3 text-white text-[15px] outline-none focus:border-[#0A84FF] transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {error && <p className="text-[#FF453A] text-[13px]">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={!name.trim() || !startDate || !endDate || saving}
            className="w-full bg-[#0A84FF] text-white rounded-[12px] py-4 text-[17px] font-semibold mt-2 disabled:opacity-40 transition-opacity"
          >
            {saving ? "Creando..." : "Crear viaje"}
          </button>
        </div>
      </div>
    </div>
  );
}
