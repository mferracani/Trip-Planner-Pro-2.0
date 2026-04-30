"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getTrips, getCities, getFlights, getHotels } from "@/lib/firestore";
import { useStatsData } from "@/lib/useStatsData";
import { TravelGlobe } from "./TravelGlobe";
import { CountUpNumber } from "./CountUpNumber";
import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";
import { CreateTripModal } from "@/components/CreateTripModal";
import Link from "next/link";
import type { City, Flight, Hotel, Trip } from "@/lib/types";
import { Globe, PlaneTakeoff, Building2, CalendarDays, Bed, MapPin, ChevronRight, Sparkles } from "lucide-react";

function classifyTrip(trip: Trip): "draft" | "active" | "future" | "past" {
  if (trip.status === "draft") return "draft";
  const today = new Date().toISOString().split("T")[0];
  if (!trip.end_date || trip.end_date < today) return "past";
  if (!trip.start_date || trip.start_date > today) return "future";
  return "active";
}

function getCountdownText(dateStr: string): string {
  const today = new Date();
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

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  delay: number;
  visible: boolean;
  accentColor?: string;
}

function StatCard({ icon, label, value, suffix = "", delay, visible, accentColor = "#A0A0A0" }: StatCardProps) {
  return (
    <div
      className="rounded-[14px] p-3 md:p-4 flex flex-col gap-2 hover:scale-[1.02] hover:-translate-y-0.5 transition-transform duration-200"
      style={{
        background: "#1A1A1A",
        border: "1px solid #2A2A2A",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 400ms ease ${delay}ms, transform 400ms ease ${delay}ms`,
      }}
    >
      <div
        className="w-8 h-8 rounded-[9px] flex items-center justify-center"
        style={{ background: `${accentColor}18` }}
      >
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      <div>
        <div
          className="text-[20px] md:text-[24px] font-bold leading-none tracking-tight text-white tabular-nums"
        >
          {value === 0 ? (
            <span className="text-[#333333]">--</span>
          ) : (
            <CountUpNumber value={value} suffix={suffix} />
          )}
        </div>
        <div className="text-[#707070] text-[10px] md:text-[11px] font-medium mt-1 uppercase tracking-[0.08em]">
          {label}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-[14px] p-3 md:p-4 animate-pulse"
      style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
    >
      <div className="w-8 h-8 rounded-[9px] bg-[#242424] mb-3" />
      <div className="h-6 w-12 rounded-md bg-[#242424] mb-2" />
      <div className="h-3 w-12 rounded bg-[#1E1E1E]" />
    </div>
  );
}

export function StatsPage() {
  const { ownerUid, user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: trips = [], isLoading: tripsLoading, refetch } = useQuery({
    queryKey: ["trips", ownerUid],
    queryFn: () => getTrips(ownerUid!),
    enabled: !!ownerUid,
  });

  const { data: subcollections, isLoading: subLoading } = useQuery({
    queryKey: ["stats-subcollections", ownerUid, trips.map((t) => t.id).join(",")],
    queryFn: async () => {
      if (!ownerUid || trips.length === 0) {
        return { cities: [] as City[], flights: [] as Flight[], hotels: [] as Hotel[] };
      }
      const [citiesArrays, flightsArrays, hotelsArrays] = await Promise.all([
        Promise.all(trips.map((t) => getCities(ownerUid, t.id))),
        Promise.all(trips.map((t) => getFlights(ownerUid, t.id))),
        Promise.all(trips.map((t) => getHotels(ownerUid, t.id))),
      ]);
      return {
        cities: citiesArrays.flat(),
        flights: flightsArrays.flat(),
        hotels: hotelsArrays.flat(),
      };
    },
    enabled: !!ownerUid && !tripsLoading,
  });

  const hotelNights = (subcollections?.hotels ?? []).reduce((sum, h) => {
    if (!h.check_in || !h.check_out) return sum;
    const cin = new Date(h.check_in + "T00:00:00");
    const cout = new Date(h.check_out + "T00:00:00");
    const nights = Math.ceil((cout.getTime() - cin.getTime()) / 86400000);
    return sum + (nights > 0 ? nights : 0);
  }, 0);

  const stats = useStatsData({
    trips,
    cities: subcollections?.cities ?? [],
    flights: subcollections?.flights ?? [],
    hotelNights,
  });

  const isLoading = tripsLoading || subLoading;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const nonDraftTrips = trips.filter((t) => classifyTrip(t) !== "draft");
  const activeTrip = nonDraftTrips.find((t) => classifyTrip(t) === "active");
  const nextTrip = nonDraftTrips
    .filter((t) => classifyTrip(t) === "future")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  const heroTrip = activeTrip ?? nextTrip;

  const displayName = user?.displayName || user?.email || "Mati";
  const firstName = displayName.split(" ")[0];

  const continentsCount = estimateContinents(stats.countries);

  const statCards: StatCardProps[] = [
    {
      icon: <Building2 size={18} />,
      label: "Ciudades",
      value: stats.cities,
      delay: 0,
      visible,
      accentColor: "#4ECDC4",
    },
    {
      icon: <PlaneTakeoff size={18} />,
      label: "Vuelos",
      value: stats.flights,
      delay: 80,
      visible,
      accentColor: "#0A84FF",
    },
    {
      icon: <CalendarDays size={18} />,
      label: "Días",
      value: stats.days,
      delay: 160,
      visible,
      accentColor: "#FFD93D",
    },
    {
      icon: <Globe size={18} />,
      label: "Kilómetros",
      value: Math.round(stats.kmTraveled / 1000),
      suffix: "k",
      delay: 240,
      visible,
      accentColor: "#30D158",
    },
    {
      icon: <Bed size={18} />,
      label: "Noches",
      value: stats.hotelNights,
      delay: 320,
      visible,
      accentColor: "#FF9F0A",
    },
    {
      icon: <MapPin size={18} />,
      label: "Países",
      value: stats.countries,
      delay: 400,
      visible,
      accentColor: "#BF5AF2",
    },
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 64% 18%, rgba(10,132,255,0.18), transparent 34%), radial-gradient(circle at 14% 8%, rgba(168,145,232,0.17), transparent 30%), radial-gradient(circle at 10% 80%, rgba(48,209,88,0.06), transparent 40%), #05070D",
      }}
    >
      <TopNav active="home" onAdd={() => setCreateOpen(true)} addIcon="plus" addLabel="Nuevo viaje" />

      <div className="mx-auto max-w-6xl px-5 pb-32 md:px-8 md:pb-16 md:pt-8">
        <section
          className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#06101F] px-5 py-5 shadow-[0_20px_70px_rgba(0,0,0,0.38)] md:px-7 md:py-6 lg:px-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 600ms ease, transform 600ms ease",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_64%_34%,rgba(10,132,255,0.26),transparent_34%),radial-gradient(circle_at_0%_0%,rgba(168,145,232,0.25),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_36%)]" />

          <div className="relative z-10 grid gap-3 md:grid-cols-[0.88fr_1.12fr] md:items-center">
            <div className="pt-1 md:pt-0">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#BF5AF2]">
                Explora sin límites
              </p>
              <p className="mb-1 text-[#707070] text-[11px] uppercase tracking-[0.22em] font-semibold">
                {firstName}
              </p>
              <h1 className="text-[42px] font-black leading-[0.94] tracking-tight text-white md:text-[58px]">
                Tu mundo
              </h1>
              <p className="mt-3 max-w-[360px] text-[14px] font-medium leading-6 text-[#C6CBD7]">
                Revive cada viaje, lugar y recuerdo desde un mapa vivo de todo lo que ya conocés.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <button
                  onClick={() => setCreateOpen(true)}
                  className="rounded-full bg-white px-4 py-2.5 text-[12px] font-black text-black transition-transform hover:-translate-y-0.5 press-feedback"
                >
                  Nuevo viaje
                </button>
                <Link
                  href="/trips"
                  className="rounded-full border border-white/15 bg-white/8 px-4 py-2.5 text-[12px] font-black text-white transition-colors hover:bg-white/12 press-feedback"
                >
                  Ver viajes
                </Link>
              </div>
            </div>

            <div className="relative min-h-[245px] md:min-h-[330px]">
              {isLoading ? (
                <div
                  className="mx-auto animate-pulse rounded-full"
                  style={{
                    width: "min(58vw, 330px)",
                    aspectRatio: "1 / 1",
                    background: "radial-gradient(circle at 40% 35%, #1A2A3A, #05070D)",
                  }}
                />
              ) : (
                <TravelGlobe markers={stats.countryMarkers} />
              )}

              <div className="absolute bottom-1 left-1/2 flex max-w-[92vw] -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[12px] font-bold text-white shadow-[0_14px_38px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                <Sparkles size={14} className="text-[#71D3A6]" />
                {isLoading ? "Cargando países" : `${stats.countries} ${stats.countries === 1 ? "país visitado" : "países visitados"}`}
                {!isLoading && continentsCount > 0 && (
                  <span className="text-[#8F9AAD]">· {continentsCount} continente{continentsCount > 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-3 gap-2.5 md:grid-cols-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : statCards.map((card, i) => <StatCard key={i} {...card} />)}
          </div>

          <div className="relative z-10 mt-3">
            <Link
              href={heroTrip ? `/trips/${heroTrip.id}` : "/trips"}
              className="group grid gap-3 overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.06] p-3 backdrop-blur-xl transition-transform hover:-translate-y-0.5 md:grid-cols-[96px_1fr_auto] md:items-center"
            >
              <div
                className="h-[72px] rounded-[12px] bg-cover bg-center"
                style={{
                  backgroundImage: heroTrip?.cover_url
                    ? `linear-gradient(135deg, rgba(10,132,255,0.18), rgba(168,145,232,0.16)), url(${heroTrip.cover_url})`
                    : "linear-gradient(135deg, rgba(10,132,255,0.42), rgba(168,145,232,0.22)), radial-gradient(circle at 20% 80%, rgba(113,211,166,0.35), transparent 36%)",
                }}
              />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#71D3A6]">
                  {heroTrip && classifyTrip(heroTrip) === "active" ? "Viaje en curso" : "Tu próxima aventura te espera"}
                </p>
                <h2 className="mt-1 text-[17px] font-bold leading-tight text-white truncate">
                  {heroTrip ? heroTrip.name : "Creá un nuevo viaje y seguí escribiendo tu historia."}
                </h2>
                {heroTrip?.start_date && (
                  <p className="mt-0.5 text-[12px] font-medium text-[#A0A0A0]">
                    {classifyTrip(heroTrip) === "active" ? "En curso ahora" : getCountdownText(heroTrip.start_date)}
                  </p>
                )}
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7C5FCE] text-white shadow-[0_10px_28px_rgba(124,95,206,0.42)] transition-transform group-hover:translate-x-1">
                <ChevronRight size={18} strokeWidth={2.6} />
              </span>
            </Link>
          </div>
        </section>
      </div>

      <BottomNav active="home" onAdd={() => setCreateOpen(true)} />
      {createOpen && (
        <CreateTripModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); refetch(); }}
        />
      )}
    </div>
  );
}

// Rough continent estimation by country
function estimateContinents(countryCount: number): number {
  if (countryCount === 0) return 0;
  if (countryCount <= 2) return 1;
  if (countryCount <= 6) return 2;
  if (countryCount <= 12) return 3;
  if (countryCount <= 20) return 4;
  if (countryCount <= 35) return 5;
  return 6;
}
