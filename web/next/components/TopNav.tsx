"use client";

import Link from "next/link";
import { Home, Briefcase, Map, Settings, Plus, Sparkles, LogOut } from "lucide-react";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/auth";

export type TopNavTab = "home" | "trips" | "map" | "settings";

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
        background: "rgba(13,13,13,0.82)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-6xl px-8 h-16 flex items-center gap-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white text-[14px] font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #BF5AF2 0%, #7B3DDB 100%)",
              boxShadow: "0 2px 8px rgba(191,90,242,0.35), inset 0 1px 0 rgba(255,255,255,0.22)",
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
          <NavItem href="/" active={active === "home"} icon={<Home size={16} strokeWidth={2.2} />} label="Home" />
          <NavItem href="/" active={active === "trips"} icon={<Briefcase size={16} strokeWidth={2.2} />} label="Viajes" />
          <NavItem href="#" active={active === "map"} icon={<Map size={16} strokeWidth={2.2} />} label="Mapa" muted />
          <NavItem href="#" active={active === "settings"} icon={<Settings size={16} strokeWidth={2.2} />} label="Ajustes" muted />
        </nav>

        {/* Right side: action + avatar */}
        <div className="flex items-center gap-3">
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #BF5AF2, #9B3FD6)",
                boxShadow: "0 4px 14px rgba(191,90,242,0.35)",
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
  muted,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[13px] font-medium transition-colors ${
        active
          ? "text-white bg-[#1A1A1A] border border-[#262626]"
          : muted
          ? "text-[#4D4D4D] hover:text-[#707070]"
          : "text-[#A0A0A0] hover:text-white hover:bg-[#161616]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
