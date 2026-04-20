"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ParsedItem } from "@/lib/types";
import { createFlight, createHotel, createTransport } from "@/lib/firestore";

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
    if (!text.trim() || !user) return;
    setParsing(true);
    setParseMessage(PARSE_MESSAGES[0]);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(
        `https://us-east1-trip-planner-pro-2.cloudfunctions.net/parseWithAI`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ trip_id: tripId, mode: "chat", input: text }),
        }
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setParsedItems(data.items ?? []);
    } catch {
      setError("No se pudo parsear. Verificá que las Cloud Functions estén deployadas.");
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!parsedItems || !user) return;
    setConfirming(true);
    try {
      for (const item of parsedItems) {
        if (item.type === "flight") {
          await createFlight(user.uid, tripId, item.data as Parameters<typeof createFlight>[2]);
        } else if (item.type === "hotel") {
          await createHotel(user.uid, tripId, item.data as Parameters<typeof createHotel>[2]);
        } else if (item.type === "transport") {
          await createTransport(user.uid, tripId, item.data as Parameters<typeof createTransport>[2]);
        }
      }
      onConfirmed();
    } catch {
      setError("Error al guardar los items.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4 border-b border-[#262626]">
        <button onClick={onClose} className="text-[#0A84FF] text-[17px] font-medium">
          Cancelar
        </button>
        <h2 className="text-[17px] font-semibold text-white">Agregar al viaje</h2>
        <div className="w-16" />
      </div>

      {/* Mode tabs */}
      {!parsedItems && !parsing && (
        <div className="flex gap-1 mx-6 mt-4 bg-[#1A1A1A] p-1 rounded-full border border-[#262626]">
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
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {parsing ? (
          <ParseLoadingState message={parseMessage} />
        ) : parsedItems ? (
          <PreviewSection items={parsedItems} onEdit={() => setParsedItems(null)} />
        ) : mode === "chat" ? (
          <ChatMode text={text} onChange={setText} />
        ) : mode === "file" ? (
          <FileMode fileRef={fileRef} />
        ) : (
          <ManualMode />
        )}

        {error && (
          <p className="text-[#FF453A] text-[13px] mt-4 text-center bg-[#FF453A]/10 rounded-[12px] py-3 px-4">
            {error}
          </p>
        )}
      </div>

      {/* Footer CTA */}
      {!parsing && (
        <div className="px-6 pb-10 pt-4 border-t border-[#262626]">
          {parsedItems ? (
            <button
              onClick={handleConfirm}
              disabled={confirming || parsedItems.length === 0}
              className="w-full text-white rounded-[14px] py-4 text-[17px] font-semibold disabled:opacity-40 transition-opacity"
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
              className="w-full text-white rounded-[14px] py-4 text-[17px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
              style={{ background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)", boxShadow: "0 4px 20px rgba(191,90,242,0.35)" }}
            >
              <span className="text-[18px]">✨</span>
              Parsear con Claude
            </button>
          ) : mode === "file" ? (
            <button
              disabled
              className="w-full text-white rounded-[14px] py-4 text-[17px] font-semibold opacity-40 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)" }}
            >
              <span className="text-[18px]">✨</span>
              Parsear con Gemini
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-[#0A84FF] text-white rounded-[14px] py-4 text-[17px] font-semibold opacity-40"
            >
              Guardar
            </button>
          )}
        </div>
      )}
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

function FileMode({ fileRef }: { fileRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div>
      <p className="text-[#A0A0A0] text-[14px] mb-3">
        Subí el PDF del boarding pass o una foto de la confirmación.
      </p>
      <div
        className="border-2 border-dashed border-[#333] rounded-[16px] h-48 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#BF5AF2]/60 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <span className="text-4xl">📄</span>
        <p className="text-[15px] text-[#A0A0A0]">Tocá para elegir archivo</p>
        <p className="text-[12px] text-[#4D4D4D]">PDF · PNG · JPG · EML</p>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,.eml,image/*" className="hidden" />
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

function ManualMode() {
  return (
    <div className="text-center py-12 text-[#4D4D4D] text-[15px]">
      Formulario manual — próximamente
    </div>
  );
}

function PreviewSection({ items, onEdit }: { items: ParsedItem[]; onEdit: () => void }) {
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
      <div className="flex items-center justify-between mb-5">
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
      <div className="space-y-3">
        {items.map((item, i) => (
          <ParsedItemCard key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

function ParsedItemCard({ item }: { item: ParsedItem }) {
  const conf = item.confidence;
  // Thresholds from design handoff: ≥0.9 green, 0.7–0.9 orange, <0.7 red
  const confColor = conf >= 0.9 ? "#30D158" : conf >= 0.7 ? "#FF9F0A" : "#FF453A";
  const confLabel = conf >= 0.9 ? "Alta confianza" : conf >= 0.7 ? "Revisar" : "Baja confianza";

  const emoji = item.type === "flight" ? "✈️" : item.type === "hotel" ? "🏨" : "🚆";

  const d = item.data as Record<string, unknown>;
  const title =
    item.type === "flight"
      ? `${d.airline ?? ""} ${d.flight_number ?? ""} · ${d.origin_iata ?? ""}→${d.destination_iata ?? ""}`.trim()
      : item.type === "hotel"
      ? String(d.name ?? "Hotel")
      : `${d.origin ?? ""} → ${d.destination ?? ""}`.trim();

  return (
    <div
      className="bg-[#1A1A1A] rounded-[14px] px-4 py-4 flex items-start gap-3"
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
    </div>
  );
}
