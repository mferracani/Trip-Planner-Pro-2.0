"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  canSubmit?: boolean;
  error?: string | null;
  children: ReactNode;
}

export function FormSheet({
  title,
  onClose,
  onSubmit,
  onDelete,
  submitLabel = "Guardar",
  submitting = false,
  canSubmit = true,
  error,
  children,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end md:items-stretch md:justify-end">
      <style>{`
        @keyframes _sheet-up  { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes _drawer-in { from { transform: translateX(100%) } to { transform: translateX(0) } }
        ._form-panel { animation: _sheet-up 0.32s cubic-bezier(0.32, 0.72, 0, 1) both }
        @media (min-width: 768px) {
          ._form-panel { animation: _drawer-in 0.28s cubic-bezier(0.32, 0.72, 0, 1) both }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — mobile: bottom sheet · desktop: right drawer */}
      <div
        className="
          relative flex flex-col bg-[#0D0D0D] overflow-hidden
          w-full max-h-[92vh] rounded-t-[20px]
          md:w-[460px] md:max-w-[48vw] md:h-full md:max-h-none md:rounded-none md:rounded-l-[20px]
          md:border-l md:border-[#262626]
          md:shadow-[-32px_0_80px_rgba(0,0,0,0.6)]
          _form-panel
        "
      >
        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#333]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-3 md:pt-5 pb-4 border-b border-[#1E1E1E]">
          <button
            onClick={onClose}
            className="text-[#0A84FF] md:text-[#A0A0A0] md:hover:text-white transition-colors text-[17px] md:text-[14px] font-medium"
          >
            Cancelar
          </button>
          <h2 className="text-[17px] md:text-[16px] font-semibold text-white tracking-tight">{title}</h2>
          <div className="w-16" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 md:px-7 py-5 space-y-4">
          {children}

          {error && (
            <p className="text-[#FF453A] text-[13px] text-center bg-[#FF453A]/10 rounded-[12px] py-3 px-4">
              {error}
            </p>
          )}

          {onDelete && (
            <button
              onClick={() => {
                if (confirmingDelete) {
                  onDelete();
                } else {
                  setConfirmingDelete(true);
                  setTimeout(() => setConfirmingDelete(false), 4000);
                }
              }}
              className={`w-full mt-4 rounded-[12px] py-3 text-[14px] font-semibold transition-colors ${
                confirmingDelete
                  ? "bg-[#FF453A] text-white border border-[#FF453A]"
                  : "text-[#FF453A] border border-[#FF453A]/40 hover:bg-[#FF453A]/10"
              }`}
            >
              {confirmingDelete ? "Tocá de nuevo para confirmar" : "Eliminar"}
            </button>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-6 md:px-7 pb-10 md:pb-6 pt-4 border-t border-[#1E1E1E]">
          <button
            onClick={onSubmit}
            disabled={!canSubmit || submitting}
            className="w-full text-white rounded-[12px] py-3.5 md:py-3 text-[16px] md:text-[14px] font-semibold disabled:opacity-40 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #0A84FF, #0670D9)",
              boxShadow: "0 4px 14px rgba(10,132,255,0.25)",
            }}
          >
            {submitting ? "Guardando…" : submitLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
