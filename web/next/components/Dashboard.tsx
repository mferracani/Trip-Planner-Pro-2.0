"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getTrips } from "@/lib/firestore";
import { Trip } from "@/lib/types";
import { signOut } from "@/lib/auth";
import { CreateTripModal } from "./CreateTripModal";
import { TripCard } from "./TripCard";
import Link from "next/link";

type Filter = "all" | "future" | "active" | "past";

function getContextualGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name.split(" ")[0];
  if (hour >= 5 && hour < 12) return `Buenos días, ${firstName} ☀️`;
  if (hour >= 12 && hour < 19) return `Buenas tardes, ${firstName} 👋`;
  return `Buenas noches, ${firstName} 🌙`;
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
  const greeting = getContextualGreeting(displayName);

  const activeTrip = trips.find((t) => classifyTrip(t) === "active");
  const nextTrip = trips.find((t) => classifyTrip(t) === "future");
  const heroTrip = activeTrip ?? nextTrip;

  const filteredTrips = trips.filter((t) => {
    if (filter === "all") return true;
    return classifyTrip(t) === filter;
  });

  // Annual stats
  const thisYear = new Date().getFullYear().toString();
  const yearTrips = trips.filter((t) => t.start_date.startsWith(thisYear));
  const totalUsd = yearTrips.reduce((sum, t) => sum + (t.total_usd ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-12 pb-6">
        <div>
          <p className="text-[#A0A0A0] text-[13px] mb-1">{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-[28px] font-bold text-white">{greeting}</h1>
        </div>
        <button
          onClick={() => signOut()}
          className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-[16px]"
          title="Cerrar sesión"
        >
          {(user?.displayName?.[0] ?? user?.email?.[0] ?? "M").toUpperCase()}
        </button>
      </div>

      <div className="px-8 space-y-8 pb-32">
        {/* Hero card — viaje activo o próximo */}
        {heroTrip ? (
          <HeroTripCard trip={heroTrip} status={classifyTrip(heroTrip)} />
        ) : (
          <EmptyHeroCard onCreateTrip={() => setCreateOpen(true)} />
        )}

        {/* Stats anuales */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Viajes este año" value={String(yearTrips.length)} />
          <StatCard label="Total gastado" value={`USD ${totalUsd.toLocaleString()}`} />
        </div>

        {/* Mis viajes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[22px] font-semibold text-white">Mis viajes</h2>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(["all", "future", "active", "past"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
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
                <div key={i} className="h-24 bg-[#1A1A1A] rounded-[16px] animate-pulse" />
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-12 text-[#707070] text-[15px]">
              {filter === "all" ? "Todavía no tenés viajes." : `No hay viajes ${filter === "future" ? "futuros" : filter === "active" ? "en curso" : "pasados"}.`}
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

      {/* FAB */}
      <button
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#0A84FF] rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.4)] text-white text-[28px] transition-transform active:scale-95"
        title="Crear viaje"
      >
        +
      </button>

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

  return (
    <Link href={`/trips/${trip.id}`}>
      <div className="relative bg-[#1A1A1A] rounded-[20px] overflow-hidden border border-[#333] h-44 flex flex-col justify-end p-5 cursor-pointer hover:border-[#0A84FF] transition-colors">
        {trip.cover_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${trip.cover_url})` }}
          />
        )}
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            {isActive && (
              <span className="text-[11px] font-semibold bg-[#30D158]/20 text-[#30D158] px-2 py-0.5 rounded-full uppercase">En curso</span>
            )}
          </div>
          <h3 className="text-[20px] font-semibold text-white">{trip.name}</h3>
          <p className="text-[#A0A0A0] text-[13px] mt-0.5">
            {isActive
              ? `Día ${dayNum} de ${totalDays}`
              : `Empieza en ${daysUntil} ${daysUntil === 1 ? "día" : "días"}`}
            {trip.total_usd > 0 && ` · USD ${trip.total_usd.toLocaleString()}`}
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyHeroCard({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <button
      onClick={onCreateTrip}
      className="w-full bg-[#1A1A1A] rounded-[20px] border border-dashed border-[#333] h-44 flex flex-col items-center justify-center gap-3 hover:border-[#0A84FF] transition-colors"
    >
      <span className="text-4xl">✈️</span>
      <div className="text-center">
        <p className="text-white text-[17px] font-semibold">Crear tu primer viaje</p>
        <p className="text-[#707070] text-[13px] mt-1">Tapá para empezar</p>
      </div>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1A1A1A] rounded-[16px] border border-[#333] px-4 py-4">
      <p className="text-[#A0A0A0] text-[12px] mb-1">{label}</p>
      <p className="text-white text-[22px] font-semibold">{value}</p>
    </div>
  );
}
