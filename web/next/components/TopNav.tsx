"use client";

import Link from "next/link";
import { Briefcase, Map, Settings, Plus, Sparkles, LogOut, Library } from "lucide-react";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/auth";

export type TopNavTab = "home" | "trips" | "catalog" | "map" | "settings";

interface Props {
  active: TopNavTab;
  onAdd?: () => void;
  addIcon?: "plus" | "sparkles";
  addLabel?: string;
}

export function TopNav({ active, onAdd, addIcon = "plus", addLabel = "Nuevo viaje" }: Props) {
  const { user } = useAuth();
  const initial = (user?.displayName?.[0] ?? user?.email?.[0] ?? "M").toUpperCase();

  return (
    <header
      className="hidden md:block sticky top-0 z-30"
      style={{
        background: "rgba(9,8,6,0.84)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="mx-auto max-w-6xl px-8 h-16 flex items-center gap-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white text-[14px] font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #71D3A6 0%, #244437 100%)",
              boxShadow: "0 2px 12px rgba(113,211,166,0.28), inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          >
            ✈
          </div>
          <span className="text-white font-semibold text-[15px] tracking-tight">
            Trip Planner <span className="text-[#707070] font-normal">Pro</span>
          </span>
        </Link>

        {/* Nav items */}
        <nav className="flex items-center gap-1 flex-1">
          <NavItem href="/" active={active === "trips"} icon={<Briefcase size={16} strokeWidth={2.2} />} label="Viajes" />
          <NavItem href="/catalog" active={active === "catalog"} icon={<Library size={16} strokeWidth={2.2} />} label="Catálogo" />
          <DisabledNavItem icon={<Map size={16} strokeWidth={2.2} />} label="Mapa" />
          <NavItem href="/settings" active={active === "settings"} icon={<Settings size={16} strokeWidth={2.2} />} label="Ajustes" />
        </nav>

        {/* Right side: action + avatar */}
        <div className="flex items-center gap-3">
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #A891E8, #7C5FCE)",
                boxShadow: "0 4px 14px rgba(168,145,232,0.32)",
              }}
            >
              {addIcon === "sparkles" ? <Sparkles size={15} strokeWidth={2.3} /> : <Plus size={16} strokeWidth={2.4} />}
              <span>{addLabel}</span>
            </button>
          )}

          <button
            onClick={() => signOut()}
            title="Cerrar sesión"
            className="group relative w-9 h-9 rounded-full border border-[#262626] bg-[#161616] flex items-center justify-center text-white text-[13px] font-semibold hover:border-[#333] transition-colors"
          >
            <span className="group-hover:opacity-0 transition-opacity">{initial}</span>
            <LogOut
              size={15}
              strokeWidth={2.2}
              className="absolute opacity-0 group-hover:opacity-100 transition-opacity text-[#A0A0A0]"
            />
          </button>
        </div>
      </div>
    </header>
  );
}

function NavItem({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[13px] font-medium transition-colors ${
        active
          ? "text-white bg-[#1A1A1A] border border-[#262626]"
          : "text-[#A0A0A0] hover:text-white hover:bg-[#161616]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function DisabledNavItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span
      className="flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[13px] font-medium text-[#3D3D3D] cursor-not-allowed"
      title="Disponible en v1.1"
    >
      {icon}
      <span>{label}</span>
      <span className="ml-0.5 text-[9px] font-bold text-[#4D4D4D] uppercase tracking-wider">· v1.1</span>
    </span>
  );
}
