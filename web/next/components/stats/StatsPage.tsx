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
import Link from "next/link";
import type { City, Flight, Hotel, Trip } from "@/lib/types";
import { Globe, PlaneTakeoff, Building2, CalendarDays, Bed, MapPin } from "lucide-react";

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
      className="rounded-[18px] p-5 flex flex-col gap-3 hover:scale-[1.02] hover:-translate-y-1 transition-transform duration-200"
      style={{
        background: "#1A1A1A",
        border: "1px solid #2A2A2A",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 400ms ease ${delay}ms, transform 400ms ease ${delay}ms`,
      }}
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center"
        style={{ background: `${accentColor}18` }}
      >
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      <div>
        <div
          className="text-[28px] font-bold leading-none tracking-tight text-white tabular-nums"
        >
          {value === 0 ? (
            <span className="text-[#333333]">--</span>
          ) : (
            <CountUpNumber value={value} suffix={suffix} />
          )}
        </div>
        <div className="text-[#707070] text-[12px] font-medium mt-1.5 uppercase tracking-[0.08em]">
          {label}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-[18px] p-5 animate-pulse"
      style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
    >
      <div className="w-9 h-9 rounded-[10px] bg-[#242424] mb-3" />
      <div className="h-8 w-16 rounded-md bg-[#242424] mb-2" />
      <div className="h-3 w-12 rounded bg-[#1E1E1E]" />
    </div>
  );
}

export function StatsPage() {
  const { ownerUid, user } = useAuth();
  const [visible, setVisible] = useState(false);

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
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
          "radial-gradient(circle at 50% 0%, rgba(10,132,255,0.08), transparent 50%), radial-gradient(circle at 10% 80%, rgba(48,209,88,0.06), transparent 40%), #0D0D0D",
      }}
    >
      <TopNav active="stats" onAdd={() => {}} addIcon="plus" addLabel="Nuevo viaje" />

      <div className="mx-auto max-w-2xl px-5 pb-32 md:pb-16 md:pt-8">
        {/* Header */}
        <div
          className="pt-14 md:pt-6 mb-2"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 500ms ease, transform 500ms ease",
          }}
        >
          <p className="text-[#707070] text-[12px] uppercase tracking-[0.2em] font-semibold mb-1">
            {firstName}
          </p>
          <h1 className="text-[32px] md:text-[38px] font-bold text-white leading-tight tracking-tight">
            Tu mundo
          </h1>
        </div>

        {/* Globe */}
        <div
          className="relative my-6 md:my-8"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 800ms ease 200ms",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: 340, width: "100%" }}>
            {isLoading ? (
              <div
                className="w-full animate-pulse rounded-full"
                style={{
                  aspectRatio: "1 / 1",
                  background: "radial-gradient(circle at 40% 35%, #1A2A3A, #0D0D0D)",
                }}
              />
            ) : (
              <TravelGlobe markers={stats.countryMarkers} />
            )}
          </div>

          {/* Country count overlay */}
          <div className="text-center mt-4">
            {isLoading ? (
              <div className="h-10 w-32 rounded-lg bg-[#1A1A1A] animate-pulse mx-auto" />
            ) : (
              <div>
                <span className="text-[42px] md:text-[52px] font-bold text-white tabular-nums leading-none">
                  {stats.countries === 0 ? (
                    <span className="text-[#333333]">0</span>
                  ) : (
                    <CountUpNumber value={stats.countries} duration={1400} />
                  )}
                </span>
                <span className="text-[#A0A0A0] text-[16px] ml-2">
                  {stats.countries === 1 ? "país" : "países"}
                  {continentsCount > 0 && (
                    <> · {continentsCount} continente{continentsCount > 1 ? "s" : ""}</>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 md:mb-8">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : statCards.map((card, i) => <StatCard key={i} {...card} />)}
        </div>

        {/* Próximo viaje */}
        {!isLoading && heroTrip && (
          <div
            className="mb-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 400ms ease 500ms, transform 400ms ease 500ms",
            }}
          >
            <p className="text-[#707070] text-[11px] uppercase tracking-[0.15em] font-semibold mb-3">
              {classifyTrip(heroTrip) === "active" ? "Viaje en curso" : "Próximo viaje"}
            </p>
            <Link href={`/trips/${heroTrip.id}`}>
              <div
                className="rounded-[18px] p-5 flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200"
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
              >
                {heroTrip.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroTrip.cover_url}
                    alt={heroTrip.name}
                    className="w-14 h-14 rounded-[12px] object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-[12px] flex-shrink-0 flex items-center justify-center text-[24px]"
                    style={{ background: "#242424" }}
                  >
                    ✈
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-[16px] truncate">{heroTrip.name}</p>
                  {heroTrip.start_date && (
                    <p className="text-[#A0A0A0] text-[13px] mt-0.5">
                      {classifyTrip(heroTrip) === "active"
                        ? "En curso ahora"
                        : getCountdownText(heroTrip.start_date)}
                    </p>
                  )}
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-[#4D4D4D]">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 400ms ease 600ms",
          }}
        >
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-[14px] text-[14px] font-semibold text-[#A0A0A0] hover:text-white transition-colors"
            style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
          >
            Ver todos mis viajes
          </Link>
        </div>
      </div>

      <BottomNav active="stats" onAdd={() => {}} />
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
