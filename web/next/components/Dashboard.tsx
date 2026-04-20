"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getTrips } from "@/lib/firestore";
import { Trip } from "@/lib/types";
import { signOut } from "@/lib/auth";
import { useCountUp } from "@/lib/hooks";
import { Pressable } from "./ui/Pressable";
import { BottomNav } from "./BottomNav";
import { CreateTripModal } from "./CreateTripModal";
import { TripCard } from "./TripCard";
import { Plane, MapPin, DollarSign, CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";

type Filter = "all" | "future" | "active" | "past";

function getContextualGreeting(name: string): { line1: string; line2: string } {
  const hour = new Date().getHours();
  const firstName = name.split(" ")[0];
  if (hour >= 5 && hour < 12) return { line1: `Buenos días,`, line2: firstName };
  if (hour >= 12 && hour < 19) return { line1: `Buenas tardes,`, line2: firstName };
  return { line1: `Buenas noches,`, line2: firstName };
}

function classifyTrip(trip: Trip): "active" | "future" | "past" {
  const today = new Date().toISOString().split("T")[0];
  if (trip.end_date < today) return "past";
  if (trip.start_date > today) return "future";
  return "active";
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function getActiveDayNumber(trip: Trip): number {
  const today = new Date().toISOString().split("T")[0];
  const start = new Date(trip.start_date + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  return Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
}

function getTotalDays(trip: Trip): number {
  const start = new Date(trip.start_date + "T00:00:00");
  const end = new Date(trip.end_date + "T00:00:00");
  return Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function Dashboard() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: trips = [], isLoading, refetch } = useQuery({
    queryKey: ["trips", user?.uid],
    queryFn: () => getTrips(user!.uid),
    enabled: !!user,
  });

  const displayName = user?.displayName || user?.email || "Mati";
  const { line1, line2 } = getContextualGreeting(displayName);

  const activeTrip = trips.find((t) => classifyTrip(t) === "active");
  const nextTrip = trips
    .filter((t) => classifyTrip(t) === "future")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  const heroTrip = activeTrip ?? nextTrip;

  const filteredTrips = trips.filter((t) => {
    if (filter === "all") return true;
    return classifyTrip(t) === filter;
  });

  const thisYear = new Date().getFullYear().toString();
  const yearTrips = trips.filter((t) => t.start_date.startsWith(thisYear));
  const totalUsd = yearTrips.reduce((sum, t) => sum + (t.total_usd ?? 0), 0);
  const totalCities = yearTrips.length;
  const totalDaysThisYear = yearTrips.reduce((sum, t) => sum + getTotalDays(t), 0);

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-14 pb-6 md:px-8 animate-fade-slide-up stagger-0">
        <div>
          <p className="text-[#A0A0A0] text-[13px] mb-0.5">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-[28px] font-bold text-white leading-tight">
            {line1} <span className="text-[#BF5AF2]">{line2}</span>
          </h1>
        </div>
        <button
          onClick={() => signOut()}
          className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-[15px] font-semibold text-white press-feedback"
          title="Cerrar sesión"
        >
          {(user?.displayName?.[0] ?? user?.email?.[0] ?? "M").toUpperCase()}
        </button>
      </div>

      <div className="px-6 md:px-8 space-y-6 pb-32">
        {/* Hero card */}
        <div className="animate-spring-up stagger-2">
          {heroTrip ? (
            <HeroTripCard trip={heroTrip} status={classifyTrip(heroTrip)} />
          ) : (
            <EmptyHeroCard onCreateTrip={() => setCreateOpen(true)} />
          )}
        </div>

        {/* Stats 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Viajes"
            sublabel="este año"
            value={String(yearTrips.length)}
            numericValue={yearTrips.length}
            color="#0A84FF"
            icon={<Plane size={16} strokeWidth={2.2} />}
            staggerDelay={200}
          />
          <StatCard
            label="Ciudades"
            sublabel="visitadas"
            value={String(totalCities)}
            numericValue={totalCities}
            color="#BF5AF2"
            icon={<MapPin size={16} strokeWidth={2.2} />}
            staggerDelay={260}
          />
          <StatCard
            label="Total"
            sublabel="gastado"
            value={`USD ${totalUsd.toLocaleString("es-AR")}`}
            numericValue={totalUsd}
            currencyPrefix="USD "
            color="#FF9F0A"
            icon={<DollarSign size={16} strokeWidth={2.2} />}
            staggerDelay={320}
          />
          <StatCard
            label="Días"
            sublabel="viajando"
            value={String(totalDaysThisYear)}
            numericValue={totalDaysThisYear}
            color="#30D158"
            icon={<CalendarDays size={16} strokeWidth={2.2} />}
            staggerDelay={380}
          />
        </div>

        {/* Mis viajes */}
        <div className="animate-fade-slide-up stagger-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-semibold text-white">Mis viajes</h2>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar ios-scroll pb-1 -mx-1 px-1">
            {(["all", "future", "active", "past"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors flex-shrink-0 press-feedback ${
                  filter === f
                    ? "bg-[#0A84FF] text-white"
                    : "bg-[#1A1A1A] text-[#A0A0A0] border border-[#333]"
                }`}
              >
                {f === "all" ? "Todos" : f === "future" ? "Futuros" : f === "active" ? "En curso" : "Pasados"}
              </button>
            ))}
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-[16px] skeleton" />
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-12 text-[#4D4D4D] text-[15px]">
              {filter === "all"
                ? "Todavía no tenés viajes."
                : `No hay viajes ${filter === "future" ? "futuros" : filter === "active" ? "en curso" : "pasados"}.`}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} status={classifyTrip(trip)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav con FAB central */}
      <BottomNav active="trips" onAdd={() => setCreateOpen(true)} addIcon="plus" />

      {createOpen && (
        <CreateTripModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); refetch(); }}
        />
      )}
    </div>
  );
}

function HeroTripCard({ trip, status }: { trip: Trip; status: "active" | "future" | "past" }) {
  const isActive = status === "active";
  const dayNum = isActive ? getActiveDayNumber(trip) : null;
  const totalDays = getTotalDays(trip);
  const daysUntil = !isActive ? getDaysUntil(trip.start_date) : null;

  const tintColor = (trip as Trip & { primary_color?: string }).primary_color ?? "#BF5AF2";
  const progress = isActive && dayNum ? Math.min(dayNum / totalDays, 1) : 0;

  const [pressed, setPressed] = useState(false);

  return (
    <Link href={`/trips/${trip.id}`}>
      <div
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="relative rounded-[24px] overflow-hidden h-52 flex flex-col p-5 cursor-pointer"
        style={{
          background: "#141414",
          border: `1px solid ${tintColor}35`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)`,
          transform: pressed ? "scale(0.985)" : "scale(1)",
          transition: "transform 200ms cubic-bezier(0.2, 0.7, 0.3, 1)",
        }}
      >
        {/* Mesh gradient background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 15% 0%, ${tintColor}40 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 90% 100%, ${tintColor}25 0%, transparent 55%),
              radial-gradient(ellipse 40% 30% at 50% 50%, ${tintColor}10 0%, transparent 70%)
            `,
          }}
        />

        {/* Living drift layer */}
        <div
          className="absolute inset-0 pointer-events-none animate-gradient-drift opacity-60"
          style={{
            background: `linear-gradient(115deg, ${tintColor}18 0%, transparent 40%, ${tintColor}0A 80%, ${tintColor}15 100%)`,
            backgroundSize: "220% 220%",
          }}
        />

        {/* Noise/grain subtle */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Cover image (if any) */}
        {trip.cover_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url(${trip.cover_url})` }}
          />
        )}

        {/* Header row: status pill + chevron */}
        <div className="relative flex items-start justify-between">
          {isActive ? (
            <div className="flex items-center gap-1.5 bg-[#30D158]/18 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-soft-pulse" />
              <span className="text-[10px] font-bold text-[#30D158] uppercase tracking-wider">En curso</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#0A84FF]/18 px-2.5 py-1 rounded-full">
              <span className="text-[10px] font-bold text-[#0A84FF] uppercase tracking-wider">Próximo</span>
            </div>
          )}

          <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/60 backdrop-blur-sm">
            <ChevronRight size={16} strokeWidth={2.4} />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Title + info */}
        <div className="relative">
          <h3 className="text-[28px] font-bold text-white leading-[1.05] tracking-tight">
            {trip.name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-white/75 text-[13px] font-medium">
              {isActive ? `Día ${dayNum} de ${totalDays}` : `En ${daysUntil} ${daysUntil === 1 ? "día" : "días"}`}
            </p>
            {trip.total_usd > 0 && (
              <>
                <span className="text-white/25 text-[11px]">·</span>
                <p className="text-white/75 text-[13px] font-mono tabular-nums">
                  USD {trip.total_usd.toLocaleString("es-AR")}
                </p>
              </>
            )}
          </div>

          {/* Progress bar (solo si active) */}
          {isActive && (
            <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress * 100}%`,
                  background: `linear-gradient(90deg, ${tintColor}, ${tintColor}CC)`,
                  boxShadow: `0 0 12px ${tintColor}88`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyHeroCard({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <button
      onClick={onCreateTrip}
      className="w-full bg-[#1A1A1A] rounded-[20px] border border-dashed border-[#333] h-44 flex flex-col items-center justify-center gap-3 transition-all hover:border-[#BF5AF2]/50 press-feedback"
    >
      <span className="text-4xl">✈️</span>
      <div className="text-center">
        <p className="text-white text-[17px] font-semibold">Tu primer viaje empieza acá</p>
        <p className="text-[#707070] text-[13px] mt-1">Tocá para crear</p>
      </div>
    </button>
  );
}

function StatCard({
  label,
  sublabel,
  value,
  numericValue,
  currencyPrefix,
  color,
  icon,
  staggerDelay = 0,
}: {
  label: string;
  sublabel?: string;
  value: string;
  numericValue?: number;
  currencyPrefix?: string;
  color: string;
  icon?: React.ReactNode;
  staggerDelay?: number;
}) {
  const animated = useCountUp(numericValue ?? 0, 1200, staggerDelay + 80);
  const displayValue =
    numericValue !== undefined
      ? `${currencyPrefix ?? ""}${animated.toLocaleString("es-AR")}`
      : value;

  return (
    <div
      className="relative rounded-[18px] px-4 py-4 animate-pop-in overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${color}12 0%, #161616 100%)`,
        border: `1px solid ${color}22`,
        animationDelay: `${staggerDelay}ms`,
        boxShadow: `inset 0 1px 0 ${color}15`,
      }}
    >
      {/* Icon chip */}
      {icon && (
        <div
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {icon}
        </div>
      )}

      <div className="flex flex-col gap-1 pr-8">
        <div className="flex items-baseline gap-1">
          <span className="text-[11px] font-semibold text-[#A0A0A0] uppercase tracking-wider">{label}</span>
          {sublabel && <span className="text-[10px] text-[#4D4D4D] font-medium">{sublabel}</span>}
        </div>
        <p
          className={`font-bold leading-none tracking-tight whitespace-nowrap ${currencyPrefix ? "text-[20px]" : "text-[26px]"}`}
          style={{ color, textShadow: `0 0 24px ${color}22` }}
        >
          {displayValue}
        </p>
      </div>
    </div>
  );
}
