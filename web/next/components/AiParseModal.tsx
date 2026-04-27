"use client";

import { useState, useRef, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { useAuth } from "@/context/AuthContext";
import type { ParsedItem, ParsedFlight, ParsedHotel, ParsedTransport } from "@/lib/types";
import { guessTimezone } from "@/lib/datetime";
import { createFlight, createHotel, createTransport, getCities, createCity } from "@/lib/firestore";
import { CITY_COLORS } from "@/lib/types";
import { getFirebaseStorage } from "@/lib/firebase";
import {
  ManualTypePicker,
  ManualHotelForm,
  ManualTransportForm,
  ManualCityForm,
  type ManualType,
} from "./ManualItemForms";
import { FlightForm } from "./forms/FlightForm";

type Mode = "chat" | "file" | "manual";

interface Props {
  tripId: string;
  onClose: () => void;
  onConfirmed: () => void;
}

const PARSE_MESSAGES = [
  "Claude está leyendo…",
  "Identificando entidades…",
  "Estructurando datos…",
  "Calculando confianza…",
];

export function AiParseModal({ tripId, onClose, onConfirmed }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("chat");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState(PARSE_MESSAGES[0]);
  const [parsedItems, setParsedItems] = useState<ParsedItem[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseElapsed, setParseElapsed] = useState<number | null>(null);
  const [usedProvider, setUsedProvider] = useState<"claude" | "gemini" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Rotate parse messages during loading
  useEffect(() => {
    if (!parsing) return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % PARSE_MESSAGES.length;
      setParseMessage(PARSE_MESSAGES[idx]);
    }, 900);
    return () => clearInterval(interval);
  }, [parsing]);

  async function handleParse() {
    if (!user) return;
    if (mode === "chat" && !text.trim()) return;
    if (mode === "file" && !selectedFile) return;
    setParsing(true);
    setParseMessage(PARSE_MESSAGES[0]);
    setError(null);
    const startMs = Date.now();
    try {
      const idToken = await user.getIdToken();
      let body: Record<string, unknown>;

      if (mode === "file" && selectedFile) {
        // Upload to Firebase Storage first
        const path = `users/${user.uid}/parse_attachments/${Date.now()}_${selectedFile.name}`;
        const fileRef2 = storageRef(getFirebaseStorage(), path);
        await uploadBytes(fileRef2, selectedFile, { contentType: selectedFile.type });
        body = { tripId, inputType: "attachment", input: "", attachmentRef: path, provider: "gemini" };
      } else {
        body = { tripId, inputType: "text", input: text, provider: "claude" };
      }

      const res = await fetch(
        `https://parsewithai-onxomw4ntq-ue.a.run.app`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();
      setParsedItems(data.items ?? []);
      setParseElapsed((Date.now() - startMs) / 1000);
      setUsedProvider(mode === "file" ? "gemini" : "claude");
    } catch (err) {
      setError(String(err));
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!parsedItems || !user) return;
    setConfirming(true);
    const toTs = (v: unknown): Timestamp => {
      if (!v || typeof v !== "object") return Timestamp.now();
      const o = v as { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number };
      const s = o.seconds ?? o._seconds;
      const n = o.nanoseconds ?? o._nanoseconds ?? 0;
      return typeof s === "number" ? new Timestamp(s, n) : Timestamp.now();
    };

    // Cache de ciudades para no refetchear en cada item
    let citiesCache: Awaited<ReturnType<typeof getCities>> | null = null;
    async function ensureCity(uid: string, tid: string, cityName: string): Promise<string> {
      const trimmed = cityName.trim();
      if (!trimmed) return "";
      if (!citiesCache) citiesCache = await getCities(uid, tid);
      const match = citiesCache.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (match) return match.id;
      const usedColors = citiesCache.map((c) => c.color);
      const color = CITY_COLORS.find((c) => !usedColors.includes(c)) ?? CITY_COLORS[0];
      const id = await createCity(uid, tid, {
        trip_id: tid,
        name: trimmed,
        lat: 0,
        lng: 0,
        color,
        timezone: guessTimezone(),
        days: [],
      });
      citiesCache.push({
        id,
        trip_id: tid,
        name: trimmed,
        lat: 0,
        lng: 0,
        color,
        timezone: guessTimezone(),
        days: [],
      });
      return id;
    }
    try {
      for (const item of parsedItems) {
        if (item.type === "flight") {
          const f = item as ParsedFlight;
          const depUtc = toTs(f.departure_utc);
          const arrUtc = toTs(f.arrival_utc);
          await createFlight(user.uid, tripId, {
            trip_id: tripId,
            airline: f.airline ?? "",
            flight_number: f.flight_number ?? "",
            origin_iata: f.origin_iata ?? "",
            destination_iata: f.destination_iata ?? "",
            departure_local_time: f.departure_local_time ?? "",
            departure_timezone: f.departure_timezone ?? "",
            departure_utc: depUtc,
            arrival_local_time: f.arrival_local_time ?? "",
            arrival_timezone: f.arrival_timezone ?? "",
            arrival_utc: arrUtc,
            duration_minutes: f.duration_minutes ?? 0,
            ...(f.booking_ref ? { booking_ref: f.booking_ref } : {}),
          });
        } else if (item.type === "hotel") {
          const h = item as ParsedHotel;
          const cityId = h.city ? await ensureCity(user.uid, tripId, h.city) : "";
          await createHotel(user.uid, tripId, {
            trip_id: tripId,
            city_id: cityId,
            name: h.name ?? "",
            check_in: h.check_in ?? "",
            check_out: h.check_out ?? "",
            ...(h.booking_ref ? { booking_ref: h.booking_ref } : {}),
          });
        } else if (item.type === "transport") {
          const t = item as ParsedTransport;
          const depUtc = toTs(t.departure_utc);
          await createTransport(user.uid, tripId, {
            trip_id: tripId,
            type: (t.mode as "train" | "bus" | "ferry" | "car" | "car_rental" | "other") ?? "other",
            origin: t.origin ?? "",
            destination: t.destination ?? "",
            departure_local_time: t.departure_local_time ?? "",
            departure_timezone: t.departure_timezone ?? "",
            departure_utc: depUtc,
            ...(t.booking_ref ? { booking_ref: t.booking_ref } : {}),
          });
        }
      }
      onConfirmed();
    } catch (err) {
      console.error("Error guardando items:", err);
      setError(`Error al guardar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center">
      {/* Backdrop (desktop) */}
      <div
        className="hidden md:block absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="
          relative flex flex-col bg-[#0D0D0D]
          w-full h-full
          md:w-[92vw] md:max-w-[620px] md:h-auto md:max-h-[86vh]
          md:rounded-[20px] md:border md:border-[#262626]
          md:shadow-[0_24px_64px_rgba(0,0,0,0.55)]
          md:overflow-hidden
        "
      >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 md:pt-5 pb-4 border-b border-[#1E1E1E]">
        <button onClick={onClose} className="text-[#0A84FF] md:text-[#A0A0A0] md:hover:text-white md:transition-colors text-[17px] md:text-[14px] font-medium">
          Cancelar
        </button>
        <h2 className="text-[17px] md:text-[16px] font-semibold text-white tracking-tight">Agregar al viaje</h2>
        <div className="w-16" />
      </div>

      {/* Mode tabs */}
      {!parsedItems && !parsing && (
        <div className="flex gap-1 mx-6 md:mx-7 mt-4 bg-[#1A1A1A] p-1 rounded-full border border-[#262626]">
          {(["chat", "file", "manual"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-full transition-all ${
                mode === m
                  ? "text-white shadow-sm"
                  : "text-[#707070]"
              }`}
              style={
                mode === m
                  ? { background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)" }
                  : undefined
              }
            >
              {m === "chat" ? "💬 Chat" : m === "file" ? "📄 Archivo" : "✏️ Manual"}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 md:px-7 py-5">
        {parsing ? (
          <ParseLoadingState message={parseMessage} />
        ) : parsedItems ? (
          <PreviewSection
            items={parsedItems}
            onEdit={() => setParsedItems(null)}
            onRemove={(idx) => setParsedItems((prev) => prev ? prev.filter((_, i) => i !== idx) : prev)}
            elapsed={parseElapsed}
            provider={usedProvider}
          />
        ) : mode === "chat" ? (
          <ChatMode text={text} onChange={setText} />
        ) : mode === "file" ? (
          <FileMode fileRef={fileRef} selectedFile={selectedFile} onFileSelect={setSelectedFile} />
        ) : (
          <ManualMode tripId={tripId} onCreated={onConfirmed} />
        )}

        {error && (
          <p className="text-[#FF453A] text-[13px] mt-4 text-center bg-[#FF453A]/10 rounded-[12px] py-3 px-4">
            {error}
          </p>
        )}
      </div>

      {/* Footer CTA — hidden en manual (los forms tienen su propio submit) */}
      {!parsing && mode !== "manual" && (
        <div className="px-6 md:px-7 pb-10 md:pb-5 pt-4 border-t border-[#1E1E1E]">
          {parsedItems ? (
            <button
              onClick={handleConfirm}
              disabled={confirming || parsedItems.length === 0}
              className="w-full text-white rounded-[14px] md:rounded-[12px] py-4 md:py-3 text-[17px] md:text-[14px] font-semibold disabled:opacity-40 transition-opacity"
              style={{ background: "linear-gradient(135deg, #30D158, #25A244)" }}
            >
              {confirming
                ? "Guardando…"
                : `Confirmar y agregar (${parsedItems.length} ${parsedItems.length === 1 ? "item" : "items"})`}
            </button>
          ) : mode === "chat" ? (
            <button
              onClick={handleParse}
              disabled={!text.trim()}
              className="w-full text-white rounded-[14px] md:rounded-[12px] py-4 md:py-3 text-[17px] md:text-[14px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
              style={{ background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)", boxShadow: "0 4px 20px rgba(191,90,242,0.35)" }}
            >
              <span className="text-[18px]">✨</span>
              Parsear con Claude
            </button>
          ) : mode === "file" ? (
            <button
              onClick={handleParse}
              disabled={!selectedFile}
              className="w-full text-white rounded-[14px] md:rounded-[12px] py-4 md:py-3 text-[17px] md:text-[14px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
              style={{ background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)", boxShadow: selectedFile ? "0 4px 20px rgba(191,90,242,0.35)" : undefined }}
            >
              <span className="text-[18px]">✨</span>
              Parsear con Gemini
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-[#0A84FF] text-white rounded-[14px] md:rounded-[12px] py-4 md:py-3 text-[17px] md:text-[14px] font-semibold opacity-40"
            >
              Guardar
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function ParseLoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      {/* Floating sparkles */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <span className="animate-sparkle-1 absolute top-0 left-4 text-[28px]">✨</span>
        <span className="animate-sparkle-2 absolute top-2 right-2 text-[20px]">⭐</span>
        <span className="animate-sparkle-3 absolute bottom-4 left-0 text-[22px]">✨</span>
        <span className="animate-sparkle-4 absolute bottom-2 right-4 text-[16px]">⭐</span>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-[28px]"
          style={{ background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)" }}
        >
          ✨
        </div>
      </div>

      {/* Rotating message */}
      <div className="text-center space-y-2">
        <p className="text-white text-[17px] font-semibold transition-all duration-300">
          {message}
        </p>
        <p className="text-[#707070] text-[13px]">Esto tarda unos segundos</p>
      </div>

      {/* Shimmer progress bar */}
      <div className="w-48 h-1 rounded-full overflow-hidden bg-[#242424]">
        <div
          className="h-full rounded-full"
          style={{
            width: "60%",
            background: "linear-gradient(90deg, transparent, #BF5AF2, transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.2s infinite",
          }}
        />
      </div>
    </div>
  );
}

function ChatMode({ text, onChange }: { text: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[#A0A0A0] text-[14px] mb-3 leading-relaxed">
        Pegá el email de confirmación o escribí los datos del vuelo, hotel o transporte.
      </p>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ej: Mi vuelo Iberia IB6844 sale el 15/03 a las 21:35 de Buenos Aires a Madrid, clase Business, asiento 24A, USD 850…"
        className="w-full h-52 bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3.5 text-white text-[15px] placeholder-[#4D4D4D] outline-none focus:border-[#BF5AF2] transition-colors resize-none"
      />
      <div className="flex gap-2 mt-3 flex-wrap">
        {["✈️ Vuelo", "🏨 Hotel", "🚆 Tren"].map((chip) => (
          <button
            key={chip}
            onClick={() => onChange(text + (text ? "\n" : "") + `[${chip.split(" ")[1]}] `)}
            className="px-3 py-1.5 bg-[#242424] border border-[#333] rounded-full text-[13px] text-[#A0A0A0] hover:border-[#BF5AF2]/50 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

function FileMode({
  fileRef,
  selectedFile,
  onFileSelect,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  onFileSelect: (f: File | null) => void;
}) {
  return (
    <div>
      <p className="text-[#A0A0A0] text-[14px] mb-3">
        Subí el PDF del boarding pass o una foto de la confirmación.
      </p>
      <div
        className={`border-2 border-dashed rounded-[16px] h-48 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
          selectedFile ? "border-[#BF5AF2]/60 bg-[#BF5AF2]/05" : "border-[#333] hover:border-[#BF5AF2]/60"
        }`}
        onClick={() => fileRef.current?.click()}
      >
        {selectedFile ? (
          <>
            <span className="text-4xl">{selectedFile.type.includes("pdf") ? "📄" : "🖼️"}</span>
            <p className="text-[15px] text-white font-medium text-center px-4 truncate max-w-full">{selectedFile.name}</p>
            <p className="text-[12px] text-[#707070]">{(selectedFile.size / 1024).toFixed(0)} KB · Tocá para cambiar</p>
          </>
        ) : (
          <>
            <span className="text-4xl">📄</span>
            <p className="text-[15px] text-[#A0A0A0]">Tocá para elegir archivo</p>
            <p className="text-[12px] text-[#4D4D4D]">PDF · PNG · JPG · EML</p>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.eml,image/*"
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
      />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <button className="bg-[#1A1A1A] border border-[#333] rounded-[12px] py-3 text-[14px] text-[#A0A0A0] flex items-center justify-center gap-2 hover:border-[#333] transition-colors">
          📷 Tomar foto
        </button>
        <button className="bg-[#1A1A1A] border border-[#333] rounded-[12px] py-3 text-[14px] text-[#A0A0A0] flex items-center justify-center gap-2 hover:border-[#333] transition-colors">
          📋 Pegar portapapeles
        </button>
      </div>
    </div>
  );
}

function ManualMode({ tripId, onCreated }: { tripId: string; onCreated: () => void }) {
  const [type, setType] = useState<ManualType | null>(null);

  if (!type) {
    return (
      <div>
        <p className="text-[#A0A0A0] text-[13px] mb-4">
          Elegí qué querés agregar al viaje:
        </p>
        <ManualTypePicker onSelect={setType} />
      </div>
    );
  }

  const back = () => setType(null);
  if (type === "flight") return <FlightForm tripId={tripId} onClose={back} onSaved={onCreated} />;
  if (type === "hotel") return <ManualHotelForm tripId={tripId} onCreated={onCreated} onBack={back} />;
  if (type === "city") return <ManualCityForm tripId={tripId} onCreated={onCreated} onBack={back} />;
  return <ManualTransportForm tripId={tripId} mode={type} onCreated={onCreated} onBack={back} />;
}

function PreviewSection({
  items,
  onEdit,
  onRemove,
  elapsed,
  provider,
}: {
  items: ParsedItem[];
  onEdit: () => void;
  onRemove: (idx: number) => void;
  elapsed?: number | null;
  provider?: "claude" | "gemini" | null;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[40px] mb-4">🤔</p>
        <p className="text-white text-[17px] font-semibold mb-2">No se detectaron items</p>
        <p className="text-[#707070] text-[14px] mb-5">Intentá con más detalles o un formato diferente.</p>
        <button onClick={onEdit} className="text-[#0A84FF] text-[15px]">← Volver a editar</button>
      </div>
    );
  }

  const avgConf = items.reduce((s, i) => s + i.confidence, 0) / items.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[20px] font-semibold text-white">
            {items.length} {items.length === 1 ? "item" : "items"} detectados
          </h3>
          <p className="text-[#707070] text-[13px] mt-0.5">
            Confianza promedio {Math.round(avgConf * 100)}%
          </p>
        </div>
        <button onClick={onEdit} className="text-[#0A84FF] text-[15px]">Editar</button>
      </div>
      {elapsed !== null && elapsed !== undefined && (
        <div
          className="flex items-center gap-2 rounded-[10px] px-3 py-2 mb-4 text-[12px] font-semibold"
          style={{ background: "rgba(191,90,242,0.10)", color: "#BF5AF2" }}
        >
          <span>✓</span>
          <span>
            Parseado en {elapsed.toFixed(1)}s con {provider === "gemini" ? "Gemini" : "Claude"}
          </span>
        </div>
      )}
      <div className="space-y-3">
        {items.map((item, i) => (
          <ParsedItemCard key={i} item={item} onRemove={() => onRemove(i)} />
        ))}
      </div>
    </div>
  );
}

function ParsedItemCard({ item, onRemove }: { item: ParsedItem; onRemove: () => void }) {
  const conf = item.confidence;
  // Thresholds from design handoff: ≥0.9 green, 0.7–0.9 orange, <0.7 red
  const confColor = conf >= 0.9 ? "#30D158" : conf >= 0.7 ? "#FF9F0A" : "#FF453A";
  const confLabel = conf >= 0.9 ? "Alta confianza" : conf >= 0.7 ? "Revisar" : "Baja confianza";

  const emoji = item.type === "flight" ? "✈️" : item.type === "hotel" ? "🏨" : "🚆";

  const title =
    item.type === "flight"
      ? `${item.airline ?? ""} ${item.flight_number ?? ""} · ${item.origin_iata ?? ""}→${item.destination_iata ?? ""}`.trim()
      : item.type === "hotel"
      ? (item.name ?? "Hotel")
      : `${item.origin ?? ""} → ${item.destination ?? ""}`.trim();

  return (
    <div
      className="group bg-[#1A1A1A] rounded-[14px] px-4 py-4 flex items-start gap-3 relative"
      style={{ border: `1px solid ${confColor}30` }}
    >
      <span className="text-[24px] flex-shrink-0 mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white truncate">{title}</p>
        <p className="text-[12px] text-[#707070] mt-0.5 capitalize">{item.type}</p>
      </div>
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <div
          className="text-[11px] font-bold px-2 py-1 rounded-full"
          style={{ color: confColor, backgroundColor: `${confColor}18` }}
        >
          {Math.round(conf * 100)}%
        </div>
        <p className="text-[10px]" style={{ color: confColor }}>
          {confLabel}
        </p>
      </div>
      <button
        onClick={onRemove}
        aria-label="Quitar item"
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#242424] text-[#707070] hover:bg-[#FF453A]/20 hover:text-[#FF453A] transition-colors flex items-center justify-center text-[14px] leading-none opacity-0 group-hover:opacity-100 md:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
