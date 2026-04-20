"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { ParsedItem } from "@/lib/types";
import { createFlight, createHotel, createTransport } from "@/lib/firestore";

type Mode = "chat" | "file" | "manual";

interface Props {
  tripId: string;
  onClose: () => void;
  onConfirmed: () => void;
}

export function AiParseModal({ tripId, onClose, onConfirmed }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("chat");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleParse() {
    if (!text.trim() || !user) return;
    setParsing(true);
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
    } catch (e) {
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
      <div className="flex items-center justify-between px-6 pt-12 pb-4 border-b border-[#333]">
        <button onClick={onClose} className="text-[#0A84FF] text-[17px]">Cancelar</button>
        <h2 className="text-[17px] font-semibold text-white">Agregar al viaje</h2>
        <div className="w-16" />
      </div>

      {/* Mode tabs */}
      {!parsedItems && (
        <div className="flex gap-1 mx-6 mt-4 bg-[#1A1A1A] p-1 rounded-full border border-[#333]">
          {(["chat", "file", "manual"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2 text-[14px] font-medium rounded-full transition-colors ${
                mode === m ? "bg-[#BF5AF2] text-white" : "text-[#A0A0A0]"
              }`}
            >
              {m === "chat" ? "💬 Chat" : m === "file" ? "📄 Archivo" : "✏️ Manual"}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {parsedItems ? (
          <PreviewSection items={parsedItems} onEdit={() => setParsedItems(null)} />
        ) : mode === "chat" ? (
          <ChatMode text={text} onChange={setText} />
        ) : mode === "file" ? (
          <FileMode fileRef={fileRef} />
        ) : (
          <ManualMode />
        )}

        {error && (
          <p className="text-[#FF453A] text-[13px] mt-3 text-center">{error}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-10 pt-4 border-t border-[#333]">
        {parsedItems ? (
          <button
            onClick={handleConfirm}
            disabled={confirming || parsedItems.length === 0}
            className="w-full bg-[#30D158] text-white rounded-[12px] py-4 text-[17px] font-semibold disabled:opacity-40"
          >
            {confirming ? "Guardando..." : `Confirmar y agregar (${parsedItems.length} items)`}
          </button>
        ) : mode === "chat" ? (
          <button
            onClick={handleParse}
            disabled={!text.trim() || parsing}
            className="w-full bg-[#BF5AF2] text-white rounded-[12px] py-4 text-[17px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {parsing ? (
              <>
                <SparklesIcon spinning />
                Claude está entendiendo tu viaje…
              </>
            ) : (
              <>
                <SparklesIcon />
                Parsear con Claude
              </>
            )}
          </button>
        ) : mode === "file" ? (
          <button
            disabled
            className="w-full bg-[#BF5AF2] text-white rounded-[12px] py-4 text-[17px] font-semibold opacity-40 flex items-center justify-center gap-2"
          >
            <SparklesIcon />
            Parsear con Gemini
          </button>
        ) : (
          <button
            disabled
            className="w-full bg-[#0A84FF] text-white rounded-[12px] py-4 text-[17px] font-semibold opacity-40"
          >
            Guardar
          </button>
        )}
      </div>
    </div>
  );
}

function ChatMode({ text, onChange }: { text: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[#A0A0A0] text-[13px] mb-3">
        Pegá el email de confirmación o escribí los datos del vuelo, hotel o transporte.
      </p>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ej: Mi vuelo Iberia IB6844 sale el 15/03 a las 21:35 de Buenos Aires a Madrid, clase Business, asiento 24A, USD 850…"
        className="w-full h-56 bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 text-white text-[16px] placeholder-[#707070] outline-none focus:border-[#BF5AF2] transition-colors resize-none"
      />
      {/* Quick chips */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {["Vuelo", "Hotel", "Tren"].map((chip) => (
          <button
            key={chip}
            onClick={() => onChange(text + (text ? "\n" : "") + `[${chip}] `)}
            className="px-3 py-1.5 bg-[#242424] border border-[#333] rounded-full text-[13px] text-[#A0A0A0]"
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
      <p className="text-[#A0A0A0] text-[13px] mb-3">
        Subí el PDF del boarding pass o una foto de la confirmación.
      </p>
      <div
        className="border-2 border-dashed border-[#333] rounded-[16px] h-48 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#BF5AF2] transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <span className="text-4xl">📄</span>
        <p className="text-[15px] text-[#A0A0A0]">Tocá para elegir archivo</p>
        <p className="text-[12px] text-[#707070]">PDF · PNG · JPG</p>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <button className="bg-[#1A1A1A] border border-[#333] rounded-[12px] py-3 text-[14px] text-[#A0A0A0] flex items-center justify-center gap-2">
          📷 Tomar foto
        </button>
        <button className="bg-[#1A1A1A] border border-[#333] rounded-[12px] py-3 text-[14px] text-[#A0A0A0] flex items-center justify-center gap-2">
          📋 Pegar portapapeles
        </button>
      </div>
    </div>
  );
}

function ManualMode() {
  return (
    <div className="text-center py-12 text-[#707070] text-[15px]">
      Formulario manual — próximamente
    </div>
  );
}

function PreviewSection({ items, onEdit }: { items: ParsedItem[]; onEdit: () => void }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#A0A0A0] text-[17px] mb-2">No se detectaron items</p>
        <p className="text-[#707070] text-[14px]">Intentá con más detalles.</p>
        <button onClick={onEdit} className="mt-4 text-[#0A84FF] text-[15px]">← Volver a editar</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[20px] font-semibold text-white">{items.length} item{items.length !== 1 ? "s" : ""} detectado{items.length !== 1 ? "s" : ""}</h3>
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
  const confColor = conf >= 0.85 ? "#30D158" : conf >= 0.6 ? "#FF9F0A" : "#FF453A";
  const confLabel = conf >= 0.85 ? "Alto" : conf >= 0.6 ? "Medio" : "Bajo";
  const emoji = item.type === "flight" ? "✈️" : item.type === "hotel" ? "🏨" : "🚆";

  const d = item.data as Record<string, unknown>;
  const title =
    item.type === "flight"
      ? `${d.airline ?? ""} ${d.flight_number ?? ""} · ${d.origin_iata ?? ""}→${d.destination_iata ?? ""}`
      : item.type === "hotel"
      ? String(d.name ?? "Hotel")
      : `${d.origin ?? ""} → ${d.destination ?? ""}`;

  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-4 flex items-start gap-3">
      <span className="text-2xl">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white truncate">{title}</p>
        <p className="text-[12px] text-[#A0A0A0] mt-0.5 capitalize">{item.type}</p>
      </div>
      <div
        className="flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full"
        style={{ color: confColor, backgroundColor: `${confColor}20` }}
      >
        {confLabel} {Math.round(conf * 100)}%
      </div>
    </div>
  );
}

function SparklesIcon({ spinning }: { spinning?: boolean }) {
  return (
    <span className={`text-[18px] ${spinning ? "animate-pulse" : ""}`}>✨</span>
  );
}
