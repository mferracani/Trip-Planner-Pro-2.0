"use client";

import { useEffect, useState } from "react";
import { Plane, Hotel as HotelIcon, Car, Receipt, Check, X, Trash2, Plus, Pencil } from "lucide-react";
import type { Expense, ExpenseCategory, Flight, Hotel, Transport } from "@/lib/types";
import {
  updateFlight,
  updateHotel,
  updateTransport,
  createExpense,
  updateExpense,
  deleteExpense,
  recalcTripAggregates,
} from "@/lib/firestore";

interface Props {
  tripId: string;
  userId: string;
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
  expenses: Expense[];
  firebaseRates: Record<string, number>;
  onChanged: () => void;
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
const CURRENCY_COLORS: Record<string, string> = {
  USD: "#34C759",
  EUR: "#5AC8FA",
  ARS: "#FFD93D",
  BRL: "#4ECDC4",
  GBP: "#BF5AF2",
};

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "food", label: "Comida" },
  { value: "activity", label: "Actividad" },
  { value: "shopping", label: "Compras" },
  { value: "transport", label: "Transporte" },
  { value: "hotel", label: "Hotel" },
  { value: "flight", label: "Vuelo" },
  { value: "other", label: "Otro" },
];

function fmtAmt(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? "";
  const n = Math.round(amount).toLocaleString("es-AR");
  return `${sym}${n}`;
}

function fmtUSD(amount: number): string {
  return `USD ${Math.round(amount).toLocaleString("es-AR")}`;
}

// ─── types ───────────────────────────────────────────────────────────────────

interface CostRow {
  id: string;
  label: string;
  type: "flight" | "hotel" | "transport" | "expense";
  currency: string;
  total: number | null;
  paid: number;
}

// ─── FX rate controls ────────────────────────────────────────────────────────

interface RateControlProps {
  currency: string;
  autoRate: number;
  locked: boolean;
  lockedRate: number;
  onLock: (rate: number) => void;
  onUnlock: () => void;
}

function RateControl({ currency, autoRate, locked, lockedRate, onLock, onUnlock }: RateControlProps) {
  const [inputVal, setInputVal] = useState(
    locked ? lockedRate.toFixed(4) : autoRate.toFixed(4)
  );

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

export function CostView({
  tripId, userId,
  flights, hotels, transports, expenses,
  firebaseRates, onChanged,
}: Props) {
  const [lockedRates, setLockedRates] = useState<Record<string, number>>({});
  const [lockedFlags, setLockedFlags] = useState<Record<string, boolean>>({});

  // Edit state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ total: "", paid: "" });
  const [saving, setSaving] = useState(false);

  // Add expense form
  const [addingExpense, setAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: "",
    amount: "",
    currency: "USD",
    category: "other" as ExpenseCategory,
  });

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
    ...expenses.map((e): CostRow => ({
      id: e.id,
      label: e.title,
      type: "expense",
      currency: e.currency,
      total: e.amount,
      paid: e.amount, // expenses are fully paid by definition
    })),
  ].filter((r) => r.total != null || r.paid > 0);

  const nonUsdCurrencies = Array.from(
    new Set(rows.map((r) => r.currency).filter((c) => c !== "USD"))
  ).sort((a, b) => {
    const order = ["EUR", "ARS", "BRL", "GBP"];
    return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99);
  });
  const allCurrencies = [...nonUsdCurrencies, "USD"];

  function toUSD(amount: number, currency: string): number {
    if (currency === "USD") return amount;
    const rate = lockedFlags[currency] ? lockedRates[currency] : (1 / (firebaseRates[currency] ?? 1));
    return amount * rate;
  }

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

  // Edit actions
  function startEdit(row: CostRow) {
    setEditingRowId(row.id);
    setEditValues({
      total: row.total != null ? String(row.total) : "",
      paid: row.type !== "expense" && row.paid > 0 ? String(row.paid) : "",
    });
  }

  function cancelEdit() {
    setEditingRowId(null);
    setEditValues({ total: "", paid: "" });
  }

  async function saveEdit(row: CostRow) {
    setSaving(true);
    try {
      const newTotal = parseFloat(editValues.total);
      const newPaid = parseFloat(editValues.paid);
      const hasTotal = !isNaN(newTotal) && editValues.total !== "";
      const hasPaid = !isNaN(newPaid) && editValues.paid !== "" && row.type !== "expense";

      if (!hasTotal && !hasPaid) {
        setEditingRowId(null);
        return;
      }

      if (row.type === "flight") {
        await updateFlight(userId, tripId, row.id, {
          ...(hasTotal && { price: newTotal, price_usd: toUSD(newTotal, row.currency) }),
          ...(hasPaid && { paid_amount: newPaid }),
        });
      } else if (row.type === "hotel") {
        await updateHotel(userId, tripId, row.id, {
          ...(hasTotal && { total_price: newTotal, total_price_usd: toUSD(newTotal, row.currency) }),
          ...(hasPaid && { paid_amount: newPaid }),
        });
      } else if (row.type === "transport") {
        await updateTransport(userId, tripId, row.id, {
          ...(hasTotal && { price: newTotal, price_usd: toUSD(newTotal, row.currency) }),
          ...(hasPaid && { paid_amount: newPaid }),
        });
      } else if (row.type === "expense") {
        if (hasTotal) {
          await updateExpense(userId, tripId, row.id, {
            amount: newTotal,
            amount_usd: toUSD(newTotal, row.currency),
          });
        }
      }

      await recalcTripAggregates(userId, tripId);
      onChanged();
      setEditingRowId(null);
    } catch (e) {
      console.error("saveEdit failed", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    try {
      await deleteExpense(userId, tripId, id);
      await recalcTripAggregates(userId, tripId);
      onChanged();
    } catch (e) {
      console.error("deleteExpense failed", e);
    }
  }

  async function saveNewExpense() {
    const amount = parseFloat(newExpense.amount);
    if (!newExpense.title.trim() || isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await createExpense(userId, tripId, {
        trip_id: tripId,
        title: newExpense.title.trim(),
        amount,
        currency: newExpense.currency,
        amount_usd: toUSD(amount, newExpense.currency),
        date: today,
        category: newExpense.category,
      });
      await recalcTripAggregates(userId, tripId);
      onChanged();
      setAddingExpense(false);
      setNewExpense({ title: "", amount: "", currency: "USD", category: "other" });
    } catch (e) {
      console.error("saveNewExpense failed", e);
    } finally {
      setSaving(false);
    }
  }

  // Renderers
  const typeIcon = (type: CostRow["type"]) => {
    if (type === "flight") return <Plane size={13} className="text-[#4D96FF]" />;
    if (type === "hotel") return <HotelIcon size={13} className="text-[#FFD93D]" />;
    if (type === "expense") return <Receipt size={13} className="text-[#FF9F0A]" />;
    return <Car size={13} className="text-[#4ECDC4]" />;
  };
  const typeLabel = (type: CostRow["type"]) => {
    if (type === "flight") return "Vuelo";
    if (type === "hotel") return "Hotel";
    if (type === "expense") return "Gasto";
    return "Transporte";
  };

  const DASH = <span className="text-[#333]">—</span>;

  function cellAmt(amount: number | null, currency: string, pending = false) {
    if (amount == null || amount === 0) return DASH;
    const color = pending ? "#FF6B6B" : (CURRENCY_COLORS[currency] ?? "#E0E0E0");
    return <span style={{ color }}>{fmtAmt(amount, currency)}</span>;
  }

  function cellUSD(amount: number | null) {
    if (amount == null || amount === 0) return DASH;
    return <span className="text-[#30D158] font-semibold">{fmtUSD(amount)}</span>;
  }

  const INPUT_CLASS =
    "w-full bg-[#0D0D0D] border border-[#BF5AF2] rounded-[4px] px-1.5 py-0.5 text-white text-[12px] outline-none text-right tabular-nums";

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

      {rows.length === 0 && !addingExpense ? (
        <p className="text-[#4D4D4D] text-[14px] py-8 text-center">
          No hay items con precio cargado.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table
            className="w-full border-collapse"
            style={{ minWidth: `${300 + allCurrencies.length * 270 + 60}px` }}
          >
            <thead>
              <tr>
                <th
                  className="text-left pb-2 text-[#4D4D4D] text-[11px] font-semibold uppercase tracking-wide"
                  style={{ width: 180 }}
                >
                  Item
                </th>
                <th
                  className="text-left pb-2 text-[#4D4D4D] text-[11px] font-semibold uppercase tracking-wide"
                  style={{ width: 110 }}
                >
                  Tipo
                </th>
                {allCurrencies.map((c) => (
                  <th key={c} colSpan={3} className="pb-2 text-center border-b border-[#1E1E1E]">
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: c === "USD" ? "#30D158" : "#A0A0A0" }}
                    >
                      {CURRENCY_LABELS[c] ?? c}
                    </span>
                  </th>
                ))}
                <th className={`${HEADER_STYLE} pb-2`} style={{ width: 110 }}>
                  Total USD
                </th>
                <th style={{ width: 60 }} />
              </tr>
              <tr className="border-b border-[#1E1E1E]">
                <th />
                <th />
                {allCurrencies.map((c) => (
                  <>
                    <th key={c + "_t"} className={`${HEADER_STYLE} ${COL_W} pb-2 px-2`}>
                      Total
                    </th>
                    <th key={c + "_p"} className={`${HEADER_STYLE} ${COL_W} pb-2 px-2`}>
                      Pagado
                    </th>
                    <th key={c + "_n"} className={`${HEADER_STYLE} ${COL_W} pb-2 px-2`}>
                      Pendiente
                    </th>
                  </>
                ))}
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEditing = editingRowId === row.id;
                const displayTotal = isEditing && editValues.total !== ""
                  ? (parseFloat(editValues.total) || null)
                  : row.total;
                const displayPaid = isEditing && row.type !== "expense" && editValues.paid !== ""
                  ? (parseFloat(editValues.paid) || 0)
                  : row.paid;
                const pending = displayTotal != null ? displayTotal - displayPaid : null;
                const rowUSD = displayTotal != null ? toUSD(displayTotal, row.currency) : null;

                return (
                  <tr
                    key={row.id}
                    className="group border-b border-[#141414] hover:bg-[#111] transition-colors"
                  >
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
                            {isThis ? (
                              isEditing ? (
                                <input
                                  type="number"
                                  value={editValues.total}
                                  onChange={(e) =>
                                    setEditValues((p) => ({ ...p, total: e.target.value }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(row);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                  className={INPUT_CLASS}
                                  autoFocus
                                  placeholder="0"
                                />
                              ) : (
                                cellAmt(row.total, c)
                              )
                            ) : (
                              DASH
                            )}
                          </td>
                          <td key={c + "_p"} className={`${CELL_STYLE} ${COL_W}`}>
                            {isThis ? (
                              isEditing && row.type !== "expense" ? (
                                <input
                                  type="number"
                                  value={editValues.paid}
                                  onChange={(e) =>
                                    setEditValues((p) => ({ ...p, paid: e.target.value }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(row);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                  className={INPUT_CLASS}
                                  placeholder="0"
                                />
                              ) : (
                                cellAmt(row.paid > 0 ? row.paid : null, c)
                              )
                            ) : (
                              DASH
                            )}
                          </td>
                          <td key={c + "_n"} className={`${CELL_STYLE} ${COL_W}`}>
                            {isThis
                              ? cellAmt(pending != null && pending > 0 ? pending : null, c, true)
                              : DASH}
                          </td>
                        </>
                      );
                    })}
                    <td className={`${CELL_STYLE} text-right`}>{cellUSD(rowUSD)}</td>
                    <td className="py-3 pl-2 pr-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => saveEdit(row)}
                            disabled={saving}
                            className="w-6 h-6 flex items-center justify-center rounded-[4px] bg-[#30D15820] text-[#30D158] hover:bg-[#30D15840] transition-colors disabled:opacity-50"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="w-6 h-6 flex items-center justify-center rounded-[4px] bg-[#FF453A20] text-[#FF453A] hover:bg-[#FF453A40] transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(row)}
                            className="w-6 h-6 flex items-center justify-center rounded-[4px] bg-[#1E1E1E] text-[#707070] hover:text-white hover:bg-[#2A2A2A] transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          {row.type === "expense" && (
                            <button
                              onClick={() => handleDeleteExpense(row.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-[4px] bg-[#1E1E1E] text-[#707070] hover:text-[#FF453A] hover:bg-[#FF453A20] transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#2A2A2A]">
                <td colSpan={2} className="py-3 text-[13px] font-bold text-white">
                  Total
                </td>
                {allCurrencies.map((c) => {
                  const inCurrency = rows.filter((r) => r.currency === c);
                  const tot = inCurrency.reduce((s, r) => s + (r.total ?? 0), 0);
                  const paid = inCurrency.reduce((s, r) => s + r.paid, 0);
                  const pend = tot - paid;
                  const cColor = CURRENCY_COLORS[c] ?? "#E0E0E0";
                  return (
                    <>
                      <td
                        key={c + "_t"}
                        className={`${CELL_STYLE} ${COL_W} font-bold`}
                        style={{ color: cColor }}
                      >
                        {tot > 0 ? fmtAmt(tot, c) : DASH}
                      </td>
                      <td
                        key={c + "_p"}
                        className={`${CELL_STYLE} ${COL_W} font-bold`}
                        style={{ color: cColor, opacity: 0.75 }}
                      >
                        {paid > 0 ? fmtAmt(paid, c) : DASH}
                      </td>
                      <td
                        key={c + "_n"}
                        className={`${CELL_STYLE} ${COL_W} font-bold`}
                        style={{ color: "#FF6B6B" }}
                      >
                        {pend > 0 ? fmtAmt(pend, c) : DASH}
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
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add expense */}
      {addingExpense ? (
        <div className="mt-4 bg-[#141414] border border-[#2A2A2A] rounded-[14px] p-4">
          <p className="text-[12px] font-semibold text-[#707070] uppercase tracking-wide mb-3">
            Nuevo gasto
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-1">
              <input
                type="text"
                placeholder="Descripción"
                value={newExpense.title}
                onChange={(e) => setNewExpense((p) => ({ ...p, title: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") saveNewExpense(); if (e.key === "Escape") setAddingExpense(false); }}
                autoFocus
                className="w-full bg-[#0D0D0D] border border-[#333] rounded-[8px] px-3 py-2 text-white text-[13px] outline-none focus:border-[#BF5AF2] placeholder:text-[#3D3D3D]"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Monto"
                value={newExpense.amount}
                onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") saveNewExpense(); if (e.key === "Escape") setAddingExpense(false); }}
                className="w-full bg-[#0D0D0D] border border-[#333] rounded-[8px] px-3 py-2 text-white text-[13px] outline-none focus:border-[#BF5AF2] placeholder:text-[#3D3D3D]"
              />
            </div>
            <div>
              <select
                value={newExpense.currency}
                onChange={(e) => setNewExpense((p) => ({ ...p, currency: e.target.value }))}
                className="w-full bg-[#0D0D0D] border border-[#333] rounded-[8px] px-3 py-2 text-white text-[13px] outline-none focus:border-[#BF5AF2]"
              >
                {["USD", "EUR", "ARS", "BRL", "GBP"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={newExpense.category}
                onChange={(e) =>
                  setNewExpense((p) => ({ ...p, category: e.target.value as ExpenseCategory }))
                }
                className="w-full bg-[#0D0D0D] border border-[#333] rounded-[8px] px-3 py-2 text-white text-[13px] outline-none focus:border-[#BF5AF2]"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveNewExpense}
              disabled={saving || !newExpense.title.trim() || !newExpense.amount}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-colors disabled:opacity-40"
              style={{ background: "#30D15820", color: "#30D158" }}
            >
              <Check size={14} />
              Guardar
            </button>
            <button
              onClick={() => {
                setAddingExpense(false);
                setNewExpense({ title: "", amount: "", currency: "USD", category: "other" });
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[#1E1E1E] text-[#707070] hover:text-white transition-colors"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingExpense(true)}
          className="mt-4 flex items-center gap-2 text-[13px] text-[#707070] hover:text-[#A0A0A0] transition-colors"
        >
          <div className="w-6 h-6 flex items-center justify-center rounded-full border border-[#2A2A2A] bg-[#161616]">
            <Plus size={13} />
          </div>
          Agregar gasto
        </button>
      )}
    </div>
  );
}
