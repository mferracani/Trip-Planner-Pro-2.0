"use client";

import { useEffect, useRef, useState } from "react";
import { Plane, Hotel as HotelIcon, Car } from "lucide-react";
import type { Flight, Hotel, Transport } from "@/lib/types";

interface Props {
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
  // rates from Firebase: { USD: 1, EUR: 0.92, ARS: 1050, ... } — 1 USD = N currency
  firebaseRates: Record<string, number>;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

function getHotelTotal(h: Hotel): number | null {
  if (h.total_price != null) return h.total_price;
  if (h.price_per_night != null) {
    const n = nightsBetween(h.check_in, h.check_out);
    return n > 0 ? h.price_per_night * n : null;
  }
  return null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", ARS: "$", BRL: "R$", GBP: "£",
};
const CURRENCY_LABELS: Record<string, string> = {
  USD: "USD", EUR: "€ EUR", ARS: "ARS", BRL: "BRL", GBP: "GBP",
};

function fmt(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? "";
  const rounded = Math.round(amount);
  return `${currency !== "USD" && currency !== "GBP" ? sym : ""}${rounded.toLocaleString("es-AR")}${currency === "USD" || currency === "GBP" ? " " + (sym + " ") : ""}`.trim()
    .replace("  ", " ");
}

function fmtUSD(amount: number): string {
  return `USD ${Math.round(amount).toLocaleString("es-AR")}`;
}

// ─── type ────────────────────────────────────────────────────────────────────

interface CostRow {
  id: string;
  label: string;
  type: "flight" | "hotel" | "transport";
  currency: string;
  total: number | null;
  paid: number;
}

// ─── FX rate controls ────────────────────────────────────────────────────────

interface RateControlProps {
  currency: string;
  autoRate: number;    // 1 X = autoRate USD
  locked: boolean;
  lockedRate: number;
  onLock: (rate: number) => void;
  onUnlock: () => void;
}

function RateControl({ currency, autoRate, locked, lockedRate, onLock, onUnlock }: RateControlProps) {
  const [inputVal, setInputVal] = useState(
    locked ? lockedRate.toFixed(4) : autoRate.toFixed(4)
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!locked) setInputVal(autoRate.toFixed(4));
  }, [autoRate, locked]);

  const displayRate = locked ? lockedRate : autoRate;

  return (
    <div className="flex items-center gap-2 bg-[#161616] border border-[#2A2A2A] rounded-[10px] px-3 py-2">
      <span className="text-[#707070] text-[12px] whitespace-nowrap">
        Tasa {currency === "EUR" ? "€" : currency}/USD:
        <span className="text-[#A0A0A0] ml-1">{displayRate.toFixed(4)}</span>
        {!locked && <span className="text-[#4D4D4D] ml-1">(auto)</span>}
      </span>
      <input
        ref={inputRef}
        type="number"
        step="0.0001"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        className="w-[80px] bg-[#0D0D0D] border border-[#333] rounded-[6px] px-2 py-1 text-white text-[12px] outline-none focus:border-[#BF5AF2]"
      />
      <button
        onClick={() => {
          if (locked) {
            onUnlock();
            setInputVal(autoRate.toFixed(4));
          } else {
            const v = parseFloat(inputVal);
            if (!isNaN(v) && v > 0) onLock(v);
          }
        }}
        className="text-[12px] font-semibold px-2.5 py-1 rounded-[6px] transition-colors"
        style={{
          background: locked ? "#FF453A20" : "#0A84FF20",
          color: locked ? "#FF453A" : "#0A84FF",
        }}
      >
        {locked ? "Liberar" : "Bloquear"}
      </button>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function CostView({ flights, hotels, transports, firebaseRates }: Props) {
  const [lockedRates, setLockedRates] = useState<Record<string, number>>({});
  const [lockedFlags, setLockedFlags] = useState<Record<string, boolean>>({});

  // Build cost rows
  const rows: CostRow[] = [
    ...flights.map((f): CostRow => ({
      id: f.id,
      label: `${f.origin_iata} → ${f.destination_iata}`,
      type: "flight",
      currency: f.currency ?? "USD",
      total: f.price ?? null,
      paid: f.paid_amount ?? 0,
    })),
    ...hotels.map((h): CostRow => ({
      id: h.id,
      label: h.name,
      type: "hotel",
      currency: h.currency ?? "USD",
      total: getHotelTotal(h),
      paid: h.paid_amount ?? 0,
    })),
    ...transports.map((t): CostRow => ({
      id: t.id,
      label: t.operator ? t.operator : `${t.origin} → ${t.destination}`,
      type: "transport",
      currency: t.currency ?? "USD",
      total: t.price ?? null,
      paid: t.paid_amount ?? 0,
    })),
  ].filter((r) => r.total != null || r.paid > 0);

  // Determine currencies shown (exclude USD — it gets its own fixed column)
  const nonUsdCurrencies = Array.from(
    new Set(rows.map((r) => r.currency).filter((c) => c !== "USD"))
  ).sort((a, b) => {
    const order = ["EUR", "ARS", "BRL", "GBP"];
    return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99);
  });
  const allCurrencies = [...nonUsdCurrencies, "USD"];

  // Convert amount to USD using Firebase rates (with optional lock override)
  function toUSD(amount: number, currency: string): number {
    if (currency === "USD") return amount;
    const rate = lockedFlags[currency] ? lockedRates[currency] : (1 / (firebaseRates[currency] ?? 1));
    return amount * rate;
  }

  // 1 X = ? USD (for display in RateControl)
  function autoRateToUSD(currency: string): number {
    return 1 / (firebaseRates[currency] ?? 1);
  }

  function lockRate(currency: string, rate: number) {
    setLockedRates((p) => ({ ...p, [currency]: rate }));
    setLockedFlags((p) => ({ ...p, [currency]: true }));
  }
  function unlockRate(currency: string) {
    setLockedFlags((p) => ({ ...p, [currency]: false }));
  }

  // Totals
  const totalUSDAll = rows.reduce((s, r) => s + (r.total != null ? toUSD(r.total, r.currency) : 0), 0);
  const paidUSDAll = rows.reduce((s, r) => s + toUSD(r.paid, r.currency), 0);
  const pendingUSDAll = totalUSDAll - paidUSDAll;

  const typeIcon = (type: CostRow["type"]) => {
    if (type === "flight") return <Plane size={13} className="text-[#4D96FF]" />;
    if (type === "hotel") return <HotelIcon size={13} className="text-[#FFD93D]" />;
    return <Car size={13} className="text-[#4ECDC4]" />;
  };
  const typeLabel = (type: CostRow["type"]) => {
    if (type === "flight") return "Vuelo";
    if (type === "hotel") return "Hotel";
    return "Transporte";
  };

  const DASH = <span className="text-[#333]">—</span>;

  function cellAmt(amount: number | null, pending = false) {
    if (amount == null || amount === 0) return DASH;
    return (
      <span style={{ color: pending ? "#FF6B6B" : "#E0E0E0" }}>
        {amount.toLocaleString("es-AR")}
      </span>
    );
  }

  function cellUSD(amount: number | null) {
    if (amount == null || amount === 0) return DASH;
    return <span className="text-[#30D158] font-semibold">{fmtUSD(amount)}</span>;
  }

  const COL_W = "w-[90px] min-w-[90px]";
  const HEADER_STYLE = "text-[11px] font-semibold text-[#4D4D4D] uppercase tracking-wide text-right";
  const CELL_STYLE = "text-[13px] text-right py-3 px-2";

  return (
    <div className="pb-8">
      {/* FX rate controls */}
      {nonUsdCurrencies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {nonUsdCurrencies.map((c) => (
            <RateControl
              key={c}
              currency={c}
              autoRate={autoRateToUSD(c)}
              locked={lockedFlags[c] ?? false}
              lockedRate={lockedRates[c] ?? autoRateToUSD(c)}
              onLock={(r) => lockRate(c, r)}
              onUnlock={() => unlockRate(c)}
            />
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-[#4D4D4D] text-[14px] py-8 text-center">
          No hay items con precio cargado.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full border-collapse" style={{ minWidth: `${300 + allCurrencies.length * 270}px` }}>
            <thead>
              {/* Currency group headers */}
              <tr>
                <th className="text-left pb-2 text-[#4D4D4D] text-[11px] font-semibold uppercase tracking-wide" style={{ width: 180 }}>Item</th>
                <th className="text-left pb-2 text-[#4D4D4D] text-[11px] font-semibold uppercase tracking-wide" style={{ width: 110 }}>Tipo</th>
                {allCurrencies.map((c) => (
                  <th key={c} colSpan={3} className="pb-2 text-center border-b border-[#1E1E1E]">
                    <span className="text-[12px] font-semibold" style={{ color: c === "USD" ? "#30D158" : "#A0A0A0" }}>
                      {CURRENCY_LABELS[c] ?? c}
                    </span>
                  </th>
                ))}
                <th className={`${HEADER_STYLE} pb-2`} style={{ width: 110 }}>Total USD</th>
              </tr>
              {/* Sub-column headers */}
              <tr className="border-b border-[#1E1E1E]">
                <th /><th />
                {allCurrencies.map((c) => (
                  <>
                    <th key={c + "_t"} className={`${HEADER_STYLE} ${COL_W} pb-2 px-2`}>Total</th>
                    <th key={c + "_p"} className={`${HEADER_STYLE} ${COL_W} pb-2 px-2`}>Pagado</th>
                    <th key={c + "_n"} className={`${HEADER_STYLE} ${COL_W} pb-2 px-2`}>Pendiente</th>
                  </>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pending = row.total != null ? row.total - row.paid : null;
                const rowUSD = row.total != null ? toUSD(row.total, row.currency) : null;
                return (
                  <tr key={row.id} className="border-b border-[#141414] hover:bg-[#111] transition-colors">
                    <td className="py-3 pr-3 text-[13px] text-white font-medium">{row.label}</td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-1.5">
                        {typeIcon(row.type)}
                        <span className="text-[12px] text-[#707070]">{typeLabel(row.type)}</span>
                      </div>
                    </td>
                    {allCurrencies.map((c) => {
                      const isThis = row.currency === c;
                      return (
                        <>
                          <td key={c + "_t"} className={`${CELL_STYLE} ${COL_W}`}>
                            {isThis ? cellAmt(row.total) : DASH}
                          </td>
                          <td key={c + "_p"} className={`${CELL_STYLE} ${COL_W}`}>
                            {isThis ? cellAmt(row.paid > 0 ? row.paid : null) : DASH}
                          </td>
                          <td key={c + "_n"} className={`${CELL_STYLE} ${COL_W}`}>
                            {isThis ? cellAmt(pending != null && pending > 0 ? pending : null, true) : DASH}
                          </td>
                        </>
                      );
                    })}
                    <td className={`${CELL_STYLE} text-right`}>{cellUSD(rowUSD)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#2A2A2A]">
                <td colSpan={2} className="py-3 text-[13px] font-bold text-white">Total</td>
                {allCurrencies.map((c) => {
                  const inCurrency = rows.filter((r) => r.currency === c);
                  const tot = inCurrency.reduce((s, r) => s + (r.total ?? 0), 0);
                  const paid = inCurrency.reduce((s, r) => s + r.paid, 0);
                  const pend = tot - paid;
                  return (
                    <>
                      <td key={c + "_t"} className={`${CELL_STYLE} ${COL_W} font-bold text-white`}>
                        {tot > 0 ? tot.toLocaleString("es-AR") : DASH}
                      </td>
                      <td key={c + "_p"} className={`${CELL_STYLE} ${COL_W} font-bold`} style={{ color: "#30D158" }}>
                        {paid > 0 ? paid.toLocaleString("es-AR") : DASH}
                      </td>
                      <td key={c + "_n"} className={`${CELL_STYLE} ${COL_W} font-bold`} style={{ color: "#FF6B6B" }}>
                        {pend > 0 ? pend.toLocaleString("es-AR") : DASH}
                      </td>
                    </>
                  );
                })}
                <td className={`${CELL_STYLE} text-right`}>
                  <div className="text-[#30D158] font-bold text-[14px]">{fmtUSD(totalUSDAll)}</div>
                  {paidUSDAll > 0 && (
                    <div className="text-[12px]" style={{ color: "#30D15880" }}>
                      Pago {fmtUSD(paidUSDAll)}
                    </div>
                  )}
                  {pendingUSDAll > 1 && (
                    <div className="text-[12px] text-[#FF6B6B]">
                      Pend. {fmtUSD(pendingUSDAll)}
                    </div>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
