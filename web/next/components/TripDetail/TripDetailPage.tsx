"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getTrip, getCities, getFlights, getHotels, getTransports } from "@/lib/firestore";
import { BottomNav } from "../BottomNav";
import { CalendarView } from "./CalendarView";
import { ListView } from "./ListView";
import { AiParseModal } from "../AiParseModal";
import Link from "next/link";

type Tab = "calendar" | "list" | "map";
const TABS: Tab[] = ["calendar", "list", "map"];

interface Props {
  tripId: string;
}

export function TripDetailPage({ tripId }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("calendar");
  const [parseOpen, setParseOpen] = useState(false);

  const { data: trip, isLoading: loadingTrip } = useQuery({
    queryKey: ["trip", user?.uid, tripId],
    queryFn: () => getTrip(user!.uid, tripId),
    enabled: !!user,
  });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities", user?.uid, tripId],
    queryFn: () => getCities(user!.uid, tripId),
    enabled: !!user,
  });

  const { data: flights = [], refetch: refetchFlights } = useQuery({
    queryKey: ["flights", user?.uid, tripId],
    queryFn: () => getFlights(user!.uid, tripId),
    enabled: !!user,
  });

  const { data: hotels = [], refetch: refetchHotels } = useQuery({
    queryKey: ["hotels", user?.uid, tripId],
    queryFn: () => getHotels(user!.uid, tripId),
    enabled: !!user,
  });

  const { data: transports = [], refetch: refetchTransports } = useQuery({
    queryKey: ["transports", user?.uid, tripId],
    queryFn: () => getTransports(user!.uid, tripId),
    enabled: !!user,
  });

  function refetchAll() {
    refetchFlights();
    refetchHotels();
    refetchTransports();
  }

  if (loadingTrip) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-[#707070] text-[15px]">Cargando…</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center gap-4">
        <p className="text-[#A0A0A0]">Viaje no encontrado.</p>
        <Link href="/" className="text-[#0A84FF] text-[15px]">← Volver</Link>
      </div>
    );
  }

  const totalDays =
    Math.ceil(
      (new Date(trip.end_date + "T00:00:00").getTime() -
        new Date(trip.start_date + "T00:00:00").getTime()) /
        86400000
    ) + 1;

  const tabIndex = TABS.indexOf(tab);
  const prevTabIndex = useRef(tabIndex);
  const direction = tabIndex >= prevTabIndex.current ? 1 : -1;
  prevTabIndex.current = tabIndex;

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12 pb-4 border-b border-[#1A1A1A] animate-fade-slide-up stagger-0">
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#333] text-[#0A84FF] text-[17px] press-feedback"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold text-white truncate leading-tight">{trip.name}</h1>
          <p className="text-[#707070] text-[12px] mt-0.5">
            {new Date(trip.start_date + "T00:00:00").toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
            })}
            {" – "}
            {new Date(trip.end_date + "T00:00:00").toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <button className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#333] text-[#A0A0A0] press-feedback">
          ⋯
        </button>
      </div>

      {/* Summary card — presupuesto + duración */}
      <div className="px-6 pt-3 pb-3 animate-fade-slide-up stagger-2">
        <TripSummaryCard totalUsd={trip.total_usd} totalDays={totalDays} />
      </div>

      {/* Tabs — sliding indicator */}
      <div className="relative flex gap-1 mx-6 mb-4 mt-1 bg-[#1A1A1A] p-1 rounded-full border border-[#262626] animate-fade-slide-up stagger-3">
        {/* Sliding pill */}
        <span
          className="absolute top-1 bottom-1 rounded-full bg-[#242424] pointer-events-none"
          style={{
            boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
            width: "calc((100% - 8px) / 3)",
            left: `calc(4px + ${tabIndex} * (100% - 8px) / 3)`,
            transition: "left 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative flex-1 py-2 text-[14px] font-semibold rounded-full transition-colors duration-200 ${
              tab === t ? "text-white" : "text-[#707070]"
            }`}
          >
            {t === "calendar" ? "Calendario" : t === "list" ? "Lista" : "Mapa"}
          </button>
        ))}
      </div>

      {/* Content — slides horizontally based on tab direction */}
      <div
        key={tab}
        className={direction > 0 ? "animate-slide-in-right" : "animate-slide-in-left"}
      >
        {tab === "calendar" && (
          <CalendarView
            trip={trip}
            cities={cities}
            flights={flights}
            hotels={hotels}
            transports={transports}
          />
        )}
        {tab === "list" && (
          <ListView
            trip={trip}
            cities={cities}
            flights={flights}
            hotels={hotels}
            transports={transports}
          />
        )}
        {tab === "map" && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
            <span className="text-5xl">🗺️</span>
            <p className="text-[#A0A0A0] text-[17px] font-semibold">Mapa disponible en v1.1</p>
            <p className="text-[#4D4D4D] text-[14px]">Estamos trabajando en eso.</p>
          </div>
        )}
      </div>

      {/* Bottom nav con FAB central (sparkles) */}
      <BottomNav active="trips" onAdd={() => setParseOpen(true)} addIcon="sparkles" />

      {parseOpen && (
        <AiParseModal
          tripId={tripId}
          onClose={() => setParseOpen(false)}
          onConfirmed={() => { setParseOpen(false); refetchAll(); }}
        />
      )}
    </div>
  );
}

function TripSummaryCard({
  totalUsd,
  totalDays,
}: {
  totalUsd: number;
  totalDays: number;
}) {
  return (
    <div
      className="rounded-[18px] px-5 py-3.5 overflow-hidden relative"
      style={{
        background: "linear-gradient(180deg, #1A1A1A 0%, #141414 100%)",
        border: "1px solid #262626",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[#707070] font-bold mb-1">
            Presupuesto
          </p>
          <p className="text-[24px] font-bold text-white tabular-nums leading-none whitespace-nowrap">
            USD <span className="text-[#0A84FF]">{totalUsd.toLocaleString("es-AR")}</span>
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-[#707070] font-bold mb-1">
            Duración
          </p>
          <p className="text-[24px] font-bold text-white tabular-nums leading-none">
            {totalDays}<span className="text-[14px] text-[#707070] font-semibold ml-0.5">d</span>
          </p>
        </div>
      </div>
    </div>
  );
}
