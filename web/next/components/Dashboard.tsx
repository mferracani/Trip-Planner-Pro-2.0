"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getTrips } from "@/lib/firestore";
import { Trip } from "@/lib/types";
import { signOut } from "@/lib/auth";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";
import { CreateTripModal } from "./CreateTripModal";
import { TripCard } from "./TripCard";
import { MapPin, CalendarDays } from "lucide-react";
import Link from "next/link";
import { getTheme } from "@/lib/themes";

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
  const totalCities = yearTrips.reduce((sum, t) => sum + (t.cities_count ?? 0), 0);

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

        {/* Hero */}
        <div className="animate-spring-up stagger-2">
          {heroTrip ? (
            <HeroTripCard trip={heroTrip} status={classifyTrip(heroTrip)} />
          ) : (
            <EmptyHeroCard onCreateTrip={() => setCreateOpen(true)} />
          )}
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

function HeroTripCard({ trip, status }: { trip: Trip; status: "active" | "future" | "past" }) {
  const isActive = status === "active";
  const dayNum = isActive ? getActiveDayNumber(trip) : null;
  const totalDays = getTotalDays(trip);
  const daysUntil = !isActive ? getDaysUntil(trip.start_date) : null;

  const theme = getTheme(trip.cover_url);
  const gradFrom = theme?.gradientFrom ?? "rgba(113,211,166,0.78)";
  const gradMid  = theme?.gradientMid  ?? "rgba(36,68,55,0.72)";
  const heroImage = trip.cover_url || "/travel-hero.svg";

  const dateRange = `${new Date(trip.start_date + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short",
  })} – ${new Date(trip.end_date + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  })}`;

  const [pressed, setPressed] = useState(false);

  return (
    <Link href={`/trips/${trip.id}`}>
      <section
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="relative overflow-hidden rounded-[20px] cursor-pointer"
        style={{
          border: "1px solid rgba(255,255,255,0.07)",
          background: "#15130F",
          boxShadow: "0 18px 70px rgba(0,0,0,0.34)",
          transform: pressed ? "scale(0.994)" : "scale(1)",
          transition: "transform 200ms cubic-bezier(0.2, 0.7, 0.3, 1)",
        }}
      >
        <div className="grid md:grid-cols-[240px_1fr]">
          {/* Image column — desktop only */}
          <div
            className="hidden bg-cover bg-center md:block"
            style={{ backgroundImage: `url(${heroImage})` }}
          />

          {/* Content */}
          <div className="relative overflow-hidden">
            {/* Mobile SVG background */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-50 md:hidden"
              style={{ backgroundImage: `url(${heroImage})` }}
            />
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(115deg, ${gradFrom}, ${gradMid} 34%, rgba(13,13,13,0.98) 100%)`,
              }}
            />

            {/* Metrics grid */}
            <div className="relative grid min-h-[200px] items-center gap-y-4 p-5 md:min-h-[180px] md:grid-cols-[minmax(200px,1.4fr)_repeat(2,minmax(100px,130px))_minmax(150px,180px)] md:gap-y-0 md:p-0">
              {/* Trip name + badge + subtitle */}
              <div className="md:px-7">
                <span className="rounded-full bg-[#FFD16A]/18 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#FFD16A]">
                  {isActive ? "En curso" : "Próximo"}
                </span>
                <h2 className="mt-4 line-clamp-2 text-[34px] font-black leading-none tracking-tight text-white md:text-[26px]">
                  {trip.name}
                </h2>
                <p className="mt-1.5 text-[14px] font-semibold text-white/70">
                  {isActive
                    ? `Día ${dayNum} de ${totalDays} · ${dateRange}`
                    : `En ${daysUntil} ${daysUntil === 1 ? "día" : "días"} · ${dateRange}`}
                </p>
              </div>

              {/* Ciudades */}
              <HeroMetric icon={<MapPin size={20} />} value={String(trip.cities_count ?? 0)} label="Ciudades" />

              {/* Días */}
              <HeroMetric icon={<CalendarDays size={20} />} value={String(totalDays)} label="Días" />

              {/* Total USD */}
              <div className="border-t border-white/10 pt-4 md:border-l md:border-t-0 md:px-6 md:pt-0">
                <p className="text-[12px] font-semibold text-[#C6BDAE]">USD</p>
                <p className="mt-0.5 text-[36px] font-black leading-none text-[#FFD16A] tabular-nums md:text-[32px]">
                  {(trip.total_usd ?? 0).toLocaleString("es-AR")}
                </p>
                <p className="mt-1 text-[11px] font-medium text-[#707070]">total</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Link>
  );
}

function HeroMetric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 md:border-l md:border-white/8 md:py-6">
      <div className="text-[#FFD16A]/70">{icon}</div>
      <p className="text-[28px] font-black leading-none text-white tabular-nums md:text-[26px]">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#707070]">{label}</p>
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

