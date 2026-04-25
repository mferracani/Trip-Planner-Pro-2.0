"use client";

import { Home, Briefcase, Library, Settings, Sparkles, Plus } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { Pressable } from "./ui/Pressable";

export type BottomNavTab = "home" | "trips" | "catalog" | "settings";

interface Props {
  active: BottomNavTab;
  onAdd: () => void;
  addIcon?: "plus" | "sparkles";
  onTabChange?: (tab: BottomNavTab) => void;
}

export function BottomNav({ active, onAdd, addIcon = "plus", onTabChange }: Props) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div
        className="mx-auto max-w-md pointer-events-auto relative"
        style={{
          background: "rgba(9,8,6,0.76)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          borderTop: "0.5px solid rgba(255,255,255,0.08)",
          boxShadow: "0 -12px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-stretch justify-around px-2 pt-2 pb-3">
          <NavItem
            label="Home"
            icon={<Home size={22} strokeWidth={2} />}
            active={active === "home"}
            onClick={onTabChange ? () => onTabChange("home") : undefined}
            href={onTabChange ? undefined : "/"}
          />
          <NavItem
            label="Viajes"
            icon={<Briefcase size={22} strokeWidth={active === "trips" ? 2.4 : 2} />}
            active={active === "trips"}
            onClick={onTabChange ? () => onTabChange("trips") : undefined}
            href={onTabChange ? undefined : "/"}
          />

          {/* Slot central — ocupa espacio, el FAB flota encima */}
          <div className="w-14 flex-shrink-0" aria-hidden />

          <NavItem
            label="Catálogo"
            icon={<Library size={22} strokeWidth={active === "catalog" ? 2.4 : 2} />}
            active={active === "catalog"}
            onClick={onTabChange ? () => onTabChange("catalog") : undefined}
            href={onTabChange ? undefined : "/catalog"}
          />
          <NavItem
            label="Ajustes"
            icon={<Settings size={22} strokeWidth={2} />}
            active={active === "settings"}
            onClick={onTabChange ? () => onTabChange("settings") : undefined}
            href={onTabChange ? undefined : "#"}
          />
        </div>

        {/* Central FAB — elevado */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-5">
          <Pressable
            onClick={onAdd}
            aria-label="Agregar"
            className="w-14 h-14 rounded-full flex items-center justify-center text-white animate-glow-pulse"
            style={{
              background: "linear-gradient(135deg, #A891E8, #7C5FCE)",
              boxShadow: "0 8px 24px rgba(168,145,232,0.48), 0 0 0 4px #090806",
            }}
          >
            {addIcon === "sparkles" ? (
              <Sparkles size={22} strokeWidth={2.2} />
            ) : (
              <Plus size={26} strokeWidth={2.4} />
            )}
          </Pressable>
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  label,
  icon,
  active,
  href,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const color = active ? "#FFD16A" : "#81786A";
  const content = (
    <>
      <div
        className="flex items-center justify-center w-11 h-7 rounded-full transition-colors"
        style={{
          color,
          backgroundColor: active ? "#FFD16A1F" : "transparent",
        }}
      >
        {icon}
      </div>
      <span
        className="text-[10px] font-semibold tracking-tight transition-colors"
        style={{ color }}
      >
        {label}
      </span>
    </>
  );

  const className = "flex flex-col items-center gap-0.5 flex-1 py-1 press-feedback min-w-0";

  if (onClick) {
    return (
      <button onClick={onClick} className={className} type="button">
        {content}
      </button>
    );
  }
  return (
    <Link href={href ?? "#"} className={className}>
      {content}
    </Link>
  );
}
