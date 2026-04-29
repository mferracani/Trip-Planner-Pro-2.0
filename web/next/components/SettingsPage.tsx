"use client";

import { useState, useEffect } from "react";
import { GitBranch, LogOut, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/auth";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";

type AIProvider = "claude" | "gemini";
type Currency = "USD" | "EUR" | "ARS" | "BRL";

const AI_PROVIDER_KEY = "ai_provider_chat";
const CURRENCY_KEY = "preferred_currency";

function readLocalStorage<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const val = window.localStorage.getItem(key);
  return (val as T | null) ?? fallback;
}

export function SettingsPage() {
  const { user } = useAuth();

  const [aiProvider, setAIProvider] = useState<AIProvider>("claude");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [signingOut, setSigningOut] = useState(false);

  // Hydrate from localStorage after mount (client only)
  useEffect(() => {
    setAIProvider(readLocalStorage<AIProvider>(AI_PROVIDER_KEY, "claude"));
    setCurrency(readLocalStorage<Currency>(CURRENCY_KEY, "USD"));
  }, []);

  function handleAIProvider(val: AIProvider) {
    setAIProvider(val);
    localStorage.setItem(AI_PROVIDER_KEY, val);
  }

  function handleCurrency(val: Currency) {
    setCurrency(val);
    localStorage.setItem(CURRENCY_KEY, val);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  const initial = (user?.displayName?.[0] ?? user?.email?.[0] ?? "M").toUpperCase();
  const displayName = user?.displayName ?? null;
  const email = user?.email ?? null;

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 8% 0%, rgba(168,145,232,0.10), transparent 34%), radial-gradient(circle at 90% 90%, rgba(113,211,166,0.08), transparent 30%), #090806",
      }}
    >
      <TopNav active="settings" />

      {/* Mobile header */}
      <div className="md:hidden flex items-center px-6 pt-14 pb-6">
        <h1 className="text-[34px] font-bold text-white leading-tight tracking-tight">
          Ajustes
        </h1>
      </div>

      <div className="mx-auto max-w-6xl px-6 md:px-8 pt-0 md:pt-8 pb-32 md:pb-16 space-y-3">
        {/* Desktop heading */}
        <div className="hidden md:block mb-6">
          <p className="text-[#707070] text-[12px] uppercase tracking-[0.2em] font-semibold mb-2">
            Configuración
          </p>
          <h1 className="text-[34px] font-bold text-white leading-[1.1] tracking-tight">
            Ajustes
          </h1>
        </div>

        {/* ── Perfil ─────────────────────────────────────────── */}
        <section>
          <SectionLabel>Perfil</SectionLabel>
          <div className="bg-[#121212] rounded-[16px] border border-[#1E1E1E] overflow-hidden">
            {/* Avatar + info */}
            <div className="flex items-center gap-4 px-5 py-5">
              <div
                className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-[24px] font-bold"
                style={{ background: "#242018", color: "#F3ECE1" }}
              >
                {initial}
              </div>
              <div className="min-w-0">
                {displayName && (
                  <p className="text-white text-[17px] font-semibold leading-snug truncate">
                    {displayName}
                  </p>
                )}
                {email && (
                  <p
                    className="text-[14px] leading-snug truncate mt-0.5"
                    style={{ color: "#A0A0A0" }}
                  >
                    {email}
                  </p>
                )}
                {!displayName && !email && (
                  <p className="text-[#A0A0A0] text-[14px]">Sin información</p>
                )}
              </div>
            </div>

            <div className="border-t border-[#1E1E1E]" />

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1A1A1A] active:bg-[#222] disabled:opacity-50"
            >
              <LogOut size={17} strokeWidth={2.1} className="text-[#FF453A] flex-shrink-0" />
              <span className="text-[15px] font-medium text-[#FF453A]">
                {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </span>
            </button>
          </div>
        </section>

        {/* ── IA ────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Inteligencia Artificial</SectionLabel>
          <div className="bg-[#121212] rounded-[16px] border border-[#1E1E1E] px-5 py-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-white text-[15px] font-medium leading-snug">
                  Provider para chat
                </p>
                <p className="text-[#707070] text-[13px] mt-0.5 leading-snug">
                  Claude para texto y conversación. Gemini para archivos y multimodal.
                </p>
              </div>

              {/* Pill toggle */}
              <div
                className="flex gap-1 flex-shrink-0 rounded-[12px] p-1"
                style={{ background: "#0D0D0D", border: "1px solid #1E1E1E" }}
              >
                <ProviderPill
                  value="claude"
                  current={aiProvider}
                  label="Claude"
                  sublabel="Texto"
                  onSelect={handleAIProvider}
                />
                <ProviderPill
                  value="gemini"
                  current={aiProvider}
                  label="Gemini"
                  sublabel="Archivo"
                  onSelect={handleAIProvider}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Display ───────────────────────────────────────── */}
        <section>
          <SectionLabel>Visualización</SectionLabel>
          <div className="bg-[#121212] rounded-[16px] border border-[#1E1E1E] px-5 py-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-white text-[15px] font-medium leading-snug">
                  Moneda preferida
                </p>
                <p className="text-[#707070] text-[13px] mt-0.5 leading-snug">
                  Para mostrar totales y costos de los viajes.
                </p>
              </div>

              {/* Currency pills */}
              <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                {(["USD", "EUR", "ARS", "BRL"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => handleCurrency(c)}
                    className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
                    style={
                      currency === c
                        ? {
                            background: "#0A84FF",
                            color: "#FFFFFF",
                            border: "1px solid #0A84FF",
                          }
                        : {
                            background: "transparent",
                            color: "#A0A0A0",
                            border: "1px solid #262626",
                          }
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Documentos de viaje ───────────────────────────── */}
        <section>
          <SectionLabel>Documentos de viaje</SectionLabel>
          <div className="bg-[#121212] rounded-[16px] border border-[#1E1E1E] overflow-hidden">
            <Link
              href="/documents"
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[#1A1A1A] active:bg-[#222]"
            >
              <FileText size={17} strokeWidth={2} className="flex-shrink-0" style={{ color: "#4D96FF" }} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-[15px] font-medium">Pasaportes, visas y seguros</p>
                <p className="text-[#707070] text-[13px] mt-0.5">Accedé a tus documentos cuando viajás</p>
              </div>
              <ChevronRight size={16} strokeWidth={2} className="text-[#333] flex-shrink-0" />
            </Link>
          </div>
        </section>

        {/* ── Información ───────────────────────────────────── */}
        <section>
          <SectionLabel>Información</SectionLabel>
          <div className="bg-[#121212] rounded-[16px] border border-[#1E1E1E] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-white text-[15px] font-medium">Trip Planner Pro 2</p>
              <span
                className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: "#1A1A1A", color: "#707070", border: "1px solid #262626" }}
              >
                v2.0.0-mvp
              </span>
            </div>

            <div className="border-t border-[#1E1E1E]" />

            <a
              href="#"
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[#1A1A1A] active:bg-[#222]"
            >
              <GitBranch size={17} strokeWidth={2} className="text-[#A0A0A0] flex-shrink-0" />
              <span className="text-[15px] font-medium text-[#A0A0A0]">GitHub</span>
            </a>
          </div>
        </section>
      </div>

      <BottomNav
        active="settings"
        onAdd={() => {}}
        addIcon="plus"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[#707070] text-[11px] uppercase tracking-[0.16em] font-semibold px-1 mb-2">
      {children}
    </p>
  );
}

function ProviderPill({
  value,
  current,
  label,
  sublabel,
  onSelect,
}: {
  value: AIProvider;
  current: AIProvider;
  label: string;
  sublabel: string;
  onSelect: (v: AIProvider) => void;
}) {
  const isActive = value === current;
  return (
    <button
      onClick={() => onSelect(value)}
      className="flex flex-col items-center px-4 py-2 rounded-[9px] transition-all"
      style={
        isActive
          ? {
              background: "#1E1E1E",
              border: "1px solid #333",
              color: "#FFFFFF",
            }
          : {
              background: "transparent",
              border: "1px solid transparent",
              color: "#707070",
            }
      }
    >
      <span className="text-[13px] font-semibold leading-snug">{label}</span>
      <span className="text-[10px] leading-snug" style={{ color: isActive ? "#A0A0A0" : "#4D4D4D" }}>
        {sublabel}
      </span>
    </button>
  );
}
