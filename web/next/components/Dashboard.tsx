"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getTrips, updateTripStatus } from "@/lib/firestore";
import { Trip } from "@/lib/types";
import { signOut } from "@/lib/auth";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";
import { CreateTripModal } from "./CreateTripModal";
import { TripCard } from "./TripCard";
import { MapPin, CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTheme } from "@/lib/themes";
import { createDemoTrip } from "@/lib/demo";

type Filter = "all" | "future" | "active" | "past" | "draft";

function getContextualGreeting(name: string): { line1: string; line2: string } {
  const hour = new Date().getHours();
  const firstName = name.split(" ")[0];
  if (hour >= 5 && hour < 12) return { line1: `Buenos días,`, line2: firstName };
  if (hour >= 12 && hour < 19) return { line1: `Buenas tardes,`, line2: firstName };
  return { line1: `Buenas noches,`, line2: firstName };
}

function classifyTrip(trip: Trip): "draft" | "active" | "future" | "past" {
  if (trip.status === "draft") return "draft";
  const today = new Date().toISOString().split("T")[0];
  if (!trip.end_date || trip.end_date < today) return "past";
  if (!trip.start_date || trip.start_date > today) return "future";
  return "active";
}

function getCountdownText(dateStr: string): string {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);

  if (diffDays <= 0) return "Empieza hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays <= 6) return `En ${diffDays} días`;
  if (diffDays <= 13) return `En 1 semana`;
  if (diffDays < 60) return `En ${Math.round(diffDays / 7)} semanas`;
  return `En ${Math.round(diffDays / 30)} meses`;
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

function DraftConfirmButton({
  tripId,
  userId,
  onConfirmed,
}: {
  tripId: string;
  userId: string;
  onConfirmed: () => void;
}) {
  const [loading, setLoading] = useState(false);
  async function confirm() {
    setLoading(true);
    try {
      await updateTripStatus(userId, tripId, "planned");
      onConfirmed();
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      onClick={confirm}
      disabled={loading}
      className="w-full mt-1.5 py-2 rounded-[12px] text-[13px] font-semibold text-[#FFD16A] border border-[#FFD16A]/30 bg-[#FFD16A]/8 press-feedback hover:bg-[#FFD16A]/15 transition-colors disabled:opacity-50"
    >
      {loading ? "Confirmando..." : "Confirmar viaje →"}
    </button>
  );
}

export function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: trips = [], isLoading, refetch } = useQuery({
    queryKey: ["trips", user?.uid],
    queryFn: () => getTrips(user!.uid),
    enabled: !!user,
  });

  const displayName = user?.displayName || user?.email || "Mati";
  const { line1, line2 } = getContextualGreeting(displayName);

  async function handleLoadDemo() {
    if (!user || loadingDemo) return;
    setLoadingDemo(true);
    try {
      await createDemoTrip(user.uid);
      await refetch();
    } finally {
      setLoadingDemo(false);
    }
  }

  // Exclude drafts from hero
  const nonDraftTrips = trips.filter((t) => classifyTrip(t) !== "draft");
  const activeTrip = nonDraftTrips.find((t) => classifyTrip(t) === "active");
  const nextTrip = nonDraftTrips
    .filter((t) => classifyTrip(t) === "future")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  const heroTrip = activeTrip ?? nextTrip;

  const filteredTrips = trips.filter((t) => {
    const s = classifyTrip(t);
    if (filter === "all") return s !== "draft";
    return s === filter;
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
            {line1}
          </p>
          <h1 className="text-[38px] font-bold text-white leading-tight tracking-tight">
            {activeTrip
              ? `Día ${getActiveDayNumber(activeTrip)} · ${activeTrip.name}`
              : `${line2}`}
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
        {/* Desktop greeting */}
        <div className="hidden md:flex items-baseline justify-between animate-fade-slide-up stagger-0">
          <div>
            <p className="text-[#707070] text-[12px] uppercase tracking-[0.2em] font-semibold mb-2">
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-[34px] font-bold text-white leading-[1.1] tracking-tight">
              {activeTrip ? (
                <>Día <span className="text-[#FFD16A]">{getActiveDayNumber(activeTrip)}</span> · {activeTrip.name}</>
              ) : (
                <>{line1} <span className="text-[#FFD16A]">{line2}</span></>
              )}
            </h1>
          </div>
          <p className="text-[#4D4D4D] text-[13px] font-mono tabular-nums">
            {trips.length} viaje{trips.length === 1 ? "" : "s"} · {totalCities} ciudades
          </p>
        </div>

        {/* Hero */}
        <div className="animate-spring-up stagger-2">
          {heroTrip ? (
            <HeroTripCard trip={heroTrip} status={classifyTrip(heroTrip) as "active" | "future" | "past"} />
          ) : (
            <EmptyHeroCard onCreateTrip={() => setCreateOpen(true)} onLoadDemo={handleLoadDemo} loadingDemo={loadingDemo} />
          )}
        </div>

        {/* Mis viajes */}
        <div className="animate-fade-slide-up stagger-7">
          <div className="flex items-end justify-between mb-4 md:mb-5">
            <div>
              <h2 className="text-[20px] md:text-[22px] font-semibold text-white tracking-tight">Mis viajes</h2>
              <p className="hidden md:block text-[#707070] text-[12px] mt-1">
                {filteredTrips.length}{" "}
                {filter === "all"
                  ? "total"
                  : filter === "future"
                  ? "próximos"
                  : filter === "active"
                  ? "en curso"
                  : filter === "past"
                  ? "pasados"
                  : "borradores"}
              </p>
            </div>

            {/* Filtros */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar ios-scroll pb-1">
              {(["all", "future", "active", "past", "draft"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] md:text-[13px] font-medium whitespace-nowrap transition-colors flex-shrink-0 press-feedback ${
                    filter === f
                      ? "bg-white text-black"
                      : "bg-[#171512] text-[#C6BDAE] border border-[#252119] hover:border-[#332E25] hover:text-white"
                  }`}
                >
                  {f === "all"
                    ? "Todos"
                    : f === "future"
                    ? "Futuros"
                    : f === "active"
                    ? "En curso"
                    : f === "past"
                    ? "Pasados"
                    : "Borradores"}
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
                : filter === "future"
                ? "No hay viajes futuros."
                : filter === "active"
                ? "No hay viajes en curso."
                : filter === "past"
                ? "No hay viajes pasados."
                : "No tenés borradores."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTrips.map((trip) => {
                const tripStatus = classifyTrip(trip);
                return (
                  <div key={trip.id}>
                    <TripCard trip={trip} status={tripStatus} />
                    {tripStatus === "draft" && (
                      <DraftConfirmButton
                        tripId={trip.id}
                        userId={user!.uid}
                        onConfirmed={() => refetch()}
                      />
                    )}
                  </div>
                );
              })}
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
  const countdownText = !isActive ? getCountdownText(trip.start_date) : null;

  const theme = getTheme(trip.cover_url);
  const accentRaw = theme?.gradientFrom ?? "rgba(255,209,106,0.9)";
  const bgTint = theme?.gradientFrom.replace(/[\d.]+\)$/, "0.06)") ?? "rgba(255,209,106,0.06)";

  const dateRange = `${new Date(trip.start_date + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short",
  })} – ${new Date(trip.end_date + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  })}`;

  const [pressed, setPressed] = useState(false);

  return (
    <Link href={`/trips/${trip.id}`}>
      <div
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="flex items-center gap-4 rounded-[14px] px-4 py-3.5 cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${bgTint}, rgba(23,21,18,0.0) 60%), #171512`,
          border: "1px solid #252119",
          borderLeft: `3px solid ${accentRaw}`,
          transform: pressed ? "scale(0.993)" : "scale(1)",
          transition: "transform 180ms cubic-bezier(0.2, 0.7, 0.3, 1)",
        }}
      >
        {/* Badge */}
        <span
          className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em]"
          style={{ background: "rgba(255,209,106,0.12)", color: "#FFD16A" }}
        >
          {isActive ? "En curso" : "Próximo"}
        </span>

        {/* Name + context */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white truncate leading-snug">{trip.name}</p>
          <p className="text-[12px] text-[#707070] leading-snug mt-0.5">
            {isActive
              ? `Día ${dayNum} de ${totalDays} · ${dateRange}`
              : `${countdownText} · ${dateRange}`}
          </p>
        </div>

        {/* Pills — desktop */}
        <div className="hidden md:flex items-center gap-4 flex-shrink-0">
          <BannerPill icon={<MapPin size={13} />} value={String(trip.cities_count ?? 0)} label="ciudades" />
          <BannerPill icon={<CalendarDays size={13} />} value={String(totalDays)} label="días" />
          <span className="text-[#333]">·</span>
          <span className="text-[15px] font-bold text-[#FFD16A] tabular-nums">
            USD {(trip.total_usd ?? 0).toLocaleString("es-AR")}
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight size={16} className="flex-shrink-0 text-[#444]" />
      </div>
    </Link>
  );
}

function BannerPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#707070]">
      {icon}
      <span className="text-[13px] font-semibold text-[#C6BDAE] tabular-nums">{value}</span>
      <span className="text-[12px]">{label}</span>
    </div>
  );
}

function EmptyHeroCard({
  onCreateTrip,
  onLoadDemo,
  loadingDemo,
}: {
  onCreateTrip: () => void;
  onLoadDemo: () => void;
  loadingDemo: boolean;
}) {
  return (
    <div className="w-full bg-[#171512] rounded-[20px] border border-dashed border-[#332E25] py-10 flex flex-col items-center justify-center gap-4">
      <span className="text-4xl">✈️</span>
      <div className="text-center">
        <p className="text-white text-[17px] font-semibold">Tu próximo viaje empieza acá</p>
        <p className="text-[#707070] text-[13px] mt-1">Creá uno o explorá la app con un viaje de ejemplo</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs px-4">
        <button
          onClick={onCreateTrip}
          className="flex-1 py-2.5 rounded-[12px] text-[14px] font-semibold text-white transition-colors"
          style={{ background: "linear-gradient(135deg, #0A84FF, #0670D9)" }}
        >
          + Nuevo viaje
        </button>
        <button
          onClick={onLoadDemo}
          disabled={loadingDemo}
          className="flex-1 py-2.5 rounded-[12px] text-[14px] font-semibold text-[#A0A0A0] border border-[#2A2A2A] hover:border-[#444] hover:text-white transition-colors disabled:opacity-50"
        >
          {loadingDemo ? "Cargando…" : "Ver demo"}
        </button>
      </div>
    </div>
  );
}
