"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { createExpense, updateExpense, deleteExpense } from "@/lib/firestore";
import type { Expense, ExpenseCategory } from "@/lib/types";
import { FormSheet } from "./FormSheet";
import { Field, TextInput, NumberInput, SelectInput } from "./fields";

interface Props {
  tripId: string;
  existing?: Expense;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "flight", label: "✈️ Vuelo" },
  { value: "hotel", label: "🏨 Hotel" },
  { value: "transport", label: "🚆 Transporte" },
  { value: "food", label: "🍽️ Comida" },
  { value: "activity", label: "🎫 Actividad" },
  { value: "shopping", label: "🛍️ Shopping" },
  { value: "other", label: "📌 Otro" },
];

export function ExpenseForm({ tripId, existing, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [amount, setAmount] = useState<number | null>(existing?.amount ?? null);
  const [currency, setCurrency] = useState(existing?.currency ?? "USD");
  const [amountUsd, setAmountUsd] = useState<number | null>(existing?.amount_usd ?? null);
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? "other");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!(title.trim() && amount != null && date);

  async function handleSubmit() {
    if (!user || !canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const data: Omit<Expense, "id"> = {
        trip_id: tripId,
        title: title.trim(),
        amount: amount!,
        currency: currency.trim() || "USD",
        amount_usd: amountUsd ?? (currency.trim().toUpperCase() === "USD" ? amount! : 0),
        date,
        category,
        notes: notes.trim() || undefined,
      };
      if (existing) {
        await updateExpense(user.uid, tripId, existing.id, data);
      } else {
        await createExpense(user.uid, tripId, data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !existing) return;
    setSaving(true);
    setError(null);
    try {
      await deleteExpense(user.uid, tripId, existing.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <FormSheet
      title={existing ? "Editar gasto" : "Nuevo gasto"}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={existing ? handleDelete : undefined}
      submitting={saving}
      canSubmit={canSubmit}
      error={error}
    >
      <Field label="Título">
        <TextInput value={title} onChange={setTitle} placeholder="Cena en restaurante" />
      </Field>

      <Field label="Categoría">
        <SelectInput value={category} onChange={setCategory} options={CATEGORIES} />
      </Field>

      <Field label="Fecha">
        <TextInput value={date} onChange={setDate} type="date" />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Monto">
          <NumberInput value={amount} onChange={setAmount} placeholder="50" />
        </Field>
        <Field label="Moneda">
          <TextInput value={currency} onChange={setCurrency} placeholder="USD" />
        </Field>
        <Field label="USD">
          <NumberInput value={amountUsd} onChange={setAmountUsd} placeholder="50" />
        </Field>
      </div>

      <Field label="Notas">
        <TextInput value={notes} onChange={setNotes} placeholder="Opcional" />
      </Field>
    </FormSheet>
  );
}
