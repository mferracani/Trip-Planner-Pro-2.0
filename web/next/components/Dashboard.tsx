"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getTrips } from "@/lib/firestore";
import { Trip } from "@/lib/types";
import { signOut } from "@/lib/auth";
import { useCountUp } from "@/lib/hooks";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";
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
  const { user, loading: authLoading } = useAuth();
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
  const totalCities = yearTrips.reduce((sum, t) => sum + (t.cities_count ?? 0), 0);
  const totalDaysThisYear = yearTrips.reduce((sum, t) => sum + getTotalDays(t), 0);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 8% 0%, rgba(168,145,232,0.12), transparent 34%), radial-gradient(circle at 90% 90%, rgba(113,211,166,0.10), transparent 30%), #090806",
      }}
    >
      <TopNav
        active="trips"
        onAdd={() => setCreateOpen(true)}
        addIcon="plus"
        addLabel="Nuevo viaje"
      />

      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between px-6 pt-14 pb-6 animate-fade-slide-up stagger-0">
        <div>
          <p className="text-[#81786A] text-[20px] mb-1">
            Buen día
          </p>
          <h1 className="text-[38px] font-bold text-white leading-tight tracking-tight">
            {activeTrip ? `Día ${getActiveDayNumber(activeTrip)} de tu viaje` : `${line1} ${line2}`}
          </h1>
        </div>
        <button
          onClick={() => signOut()}
          className="w-16 h-16 rounded-full bg-[#242018] flex items-center justify-center text-[18px] font-bold text-[#F3ECE1] press-feedback"
          title="Cerrar sesión"
        >
          {(user?.displayName?.[0] ?? user?.email?.[0] ?? "M").toUpperCase()}
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-6 md:px-8 space-y-6 pb-32 md:pb-16 md:pt-8">
        {/* Desktop greeting — inline, editorial feel */}
        <div className="hidden md:flex items-baseline justify-between animate-fade-slide-up stagger-0">
          <div>
            <p className="text-[#707070] text-[12px] uppercase tracking-[0.2em] font-semibold mb-2">
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-[34px] font-bold text-white leading-[1.1] tracking-tight">
              {line1} <span className="text-[#FFD16A]">{line2}</span>
            </h1>
          </div>
          <p className="text-[#4D4D4D] text-[13px] font-mono tabular-nums">
            {trips.length} viaje{trips.length === 1 ? "" : "s"} · {totalCities} ciudades
          </p>
        </div>

        {/* Hero + stats */}
        <div className="grid md:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)] gap-4 md:gap-5 animate-spring-up stagger-2">
          <div className="md:h-full">
            {heroTrip ? (
              <HeroTripCard
                trip={heroTrip}
                status={classifyTrip(heroTrip)}
                tripsThisYear={yearTrips.length}
                totalCities={totalCities}
                totalDaysThisYear={totalDaysThisYear}
                totalUsd={totalUsd}
              />
            ) : (
              <EmptyHeroCard onCreateTrip={() => setCreateOpen(true)} />
            )}
          </div>

          {/* Desktop supporting stats */}
          <div className="hidden md:grid grid-cols-2 gap-3 md:content-stretch md:h-full">
          <StatCard
            label="Viajes"
            sublabel="este año"
            value={String(yearTrips.length)}
            numericValue={yearTrips.length}
            color="#71D3A6"
            icon={<Plane size={16} strokeWidth={2.2} />}
            staggerDelay={200}
          />
          <StatCard
            label="Ciudades"
            sublabel="visitadas"
            value={String(totalCities)}
            numericValue={totalCities}
            color="#A891E8"
            icon={<MapPin size={16} strokeWidth={2.2} />}
            staggerDelay={260}
          />
          <StatCard
            label="Total"
            sublabel="gastado"
            value={`USD ${totalUsd.toLocaleString("es-AR")}`}
            numericValue={totalUsd}
            currencyPrefix="USD "
            color="#FFD16A"
            icon={<DollarSign size={16} strokeWidth={2.2} />}
            staggerDelay={320}
          />
          <StatCard
            label="Días"
            sublabel="viajando"
            value={String(totalDaysThisYear)}
            numericValue={totalDaysThisYear}
            color="#6CAFE8"
            icon={<CalendarDays size={16} strokeWidth={2.2} />}
            staggerDelay={380}
          />
          </div>
        </div>

        {/* Mis viajes */}
        <div className="animate-fade-slide-up stagger-7">
          <div className="flex items-end justify-between mb-4 md:mb-5">
            <div>
              <h2 className="text-[20px] md:text-[22px] font-semibold text-white tracking-tight">Mis viajes</h2>
              <p className="hidden md:block text-[#707070] text-[12px] mt-1">
                {filteredTrips.length} {filter === "all" ? "total" : filter === "future" ? "próximos" : filter === "active" ? "en curso" : "pasados"}
              </p>
            </div>

            {/* Filtros */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar ios-scroll pb-1">
              {(["all", "future", "active", "past"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] md:text-[13px] font-medium whitespace-nowrap transition-colors flex-shrink-0 press-feedback ${
                    filter === f
                      ? "bg-white text-black"
                      : "bg-[#171512] text-[#C6BDAE] border border-[#252119] hover:border-[#332E25] hover:text-white"
                  }`}
                >
                  {f === "all" ? "Todos" : f === "future" ? "Futuros" : f === "active" ? "En curso" : "Pasados"}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          {authLoading || isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-[16px] skeleton" />
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-16 md:py-24 text-[#81786A] text-[15px] border border-dashed border-[#252119] rounded-[18px]">
              {filter === "all"
                ? "Todavía no tenés viajes."
                : `No hay viajes ${filter === "future" ? "futuros" : filter === "active" ? "en curso" : "pasados"}.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

function HeroTripCard({
  trip,
  status,
  tripsThisYear,
  totalCities,
  totalDaysThisYear,
  totalUsd,
}: {
  trip: Trip;
  status: "active" | "future" | "past";
  tripsThisYear: number;
  totalCities: number;
  totalDaysThisYear: number;
  totalUsd: number;
}) {
  const isActive = status === "active";
  const dayNum = isActive ? getActiveDayNumber(trip) : null;
  const totalDays = getTotalDays(trip);
  const daysUntil = !isActive ? getDaysUntil(trip.start_date) : null;

  const progress = isActive && dayNum ? Math.min(dayNum / totalDays, 1) : status === "future" ? 0.11 : 1;

  const [pressed, setPressed] = useState(false);

  return (
    <Link href={`/trips/${trip.id}`}>
      <div
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="relative rounded-[32px] overflow-hidden min-h-[620px] md:min-h-[520px] flex flex-col cursor-pointer"
        style={{
          background: "#171512",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 48px rgba(0,0,0,0.36)",
          transform: pressed ? "scale(0.985)" : "scale(1)",
          transition: "transform 200ms cubic-bezier(0.2, 0.7, 0.3, 1)",
        }}
      >
        <div className="relative min-h-[320px] md:min-h-[280px] p-6 md:p-7 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 82% 60% at 12% 0%, rgba(113,211,166,0.78), transparent 64%), linear-gradient(135deg, #71D3A6 0%, #244437 52%, #090806 100%)",
            }}
          />
          <div className="absolute inset-0 opacity-[0.08] text-white text-[136px] md:text-[150px] font-black flex items-center justify-center rotate-[-18deg]">
            ✈
          </div>

          {trip.cover_url && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-18 mix-blend-overlay"
              style={{ backgroundImage: `url(${trip.cover_url})` }}
            />
          )}

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full">
              <span className="text-[11px] font-black text-[#FFD16A] uppercase tracking-[0.28em]">
                {isActive ? "En curso" : status === "future" ? "Próximo" : "Pasado"}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-black/24 flex items-center justify-center text-white">
              <ChevronRight size={22} strokeWidth={2.6} />
            </div>
          </div>

          <div className="relative h-24 md:h-16" />

          <div className="relative">
            <h3 className="text-[48px] md:text-[56px] font-bold text-white leading-[1.02] tracking-tight line-clamp-2">
              {trip.name}
            </h3>
            <p className="text-white/88 text-[20px] font-bold mt-3">
              {isActive ? `Día ${dayNum}` : `En ${daysUntil} ${daysUntil === 1 ? "día" : "días"}`}
            </p>
          </div>
        </div>

        <div className="relative grid md:grid-cols-[160px_1fr] gap-6 p-6 md:p-7">
          <div className="relative w-32 h-32 md:w-30 md:h-30">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,209,106,0.13)" strokeWidth="12" />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#FFD16A"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="302"
                strokeDashoffset={302 - 302 * Math.max(progress, 0.11)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white text-[26px] font-black">{Math.round(Math.max(progress, 0.11) * 100)}%</span>
              <span className="text-[#81786A] text-[11px] font-bold tracking-widest">Progreso</span>
            </div>
          </div>
          <div className="space-y-3">
            <HeroStat icon="✈" value={String(tripsThisYear)} label="Viajes este año" />
            <HeroStat icon="⚓" value={String(totalCities)} label="Ciudades" />
            <HeroStat icon="▦" value={String(totalDaysThisYear)} label="Días viajando" />
          </div>
        </div>

        <div className="border-t border-[#252119] px-6 md:px-7 py-6">
          <p className="text-[#81786A] text-[12px] font-bold uppercase tracking-wider">Total gastado</p>
          <p className="mt-1 text-[#FFD16A] text-[46px] md:text-[52px] leading-none font-black tabular-nums">
            <span className="text-[#81786A] text-[18px] mr-2">USD</span>
            {(totalUsd || trip.total_usd || 0).toLocaleString("es-AR")}
          </p>
        </div>
      </div>
    </Link>
  );
}

function HeroStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-[11px] bg-[#FFD16A]/12 text-[#FFD16A] flex items-center justify-center text-[16px]">
        {icon}
      </span>
      <span className="text-white text-[22px] font-black tabular-nums">{value}</span>
      <span className="text-[#C6BDAE] text-[17px] font-medium truncate">{label}</span>
    </div>
  );
}

function EmptyHeroCard({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <button
      onClick={onCreateTrip}
      className="w-full bg-[#171512] rounded-[20px] border border-dashed border-[#332E25] h-44 flex flex-col items-center justify-center gap-3 transition-all hover:border-[#71D3A6]/50 press-feedback"
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
