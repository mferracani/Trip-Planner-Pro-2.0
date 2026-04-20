"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getTrip, getCities, getFlights, getHotels, getTransports } from "@/lib/firestore";
import { CalendarView } from "./CalendarView";
import { ListView } from "./ListView";
import { AiParseModal } from "../AiParseModal";
import Link from "next/link";

type Tab = "calendar" | "list" | "map";

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
        <div className="text-[#A0A0A0] text-[15px]">Cargando...</div>
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

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-10 pb-4">
        <Link href="/" className="text-[#0A84FF] text-[17px]">←</Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-semibold text-white truncate">{trip.name}</h1>
          <p className="text-[#A0A0A0] text-[13px]">
            {new Date(trip.start_date + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
            {" – "}
            {new Date(trip.end_date + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 px-6 mb-4 overflow-x-auto pb-1">
        <StatPill label="Total" value={`USD ${trip.total_usd.toLocaleString()}`} />
        <StatPill label="Ciudades" value={String(cities.length)} />
        <StatPill label="Vuelos" value={String(flights.length)} />
        <StatPill label="Hoteles" value={String(hotels.length)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-6 mb-4 bg-[#1A1A1A] p-1 rounded-full border border-[#333]">
        {(["calendar", "list"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[15px] font-medium rounded-full transition-colors ${
              tab === t ? "bg-[#0A84FF] text-white" : "text-[#A0A0A0]"
            }`}
          >
            {t === "calendar" ? "Calendario" : t === "list" ? "Lista" : "Mapa"}
          </button>
        ))}
        <button
          onClick={() => setTab("map")}
          className={`flex-1 py-2 text-[15px] font-medium rounded-full transition-colors ${
            tab === "map" ? "bg-[#0A84FF] text-white" : "text-[#A0A0A0]"
          }`}
        >
          Mapa
        </button>
      </div>

      {/* Content */}
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
        <div className="flex items-center justify-center py-20 text-[#707070] text-[15px]">
          Mapa disponible en v1.1
        </div>
      )}

      {/* FAB sparkles */}
      <button
        onClick={() => setParseOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#BF5AF2] rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.4)] text-white text-[22px] transition-transform active:scale-95"
        title="Agregar con IA"
      >
        ✨
      </button>

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

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-shrink-0 bg-[#1A1A1A] border border-[#333] rounded-full px-4 py-1.5 flex items-center gap-2">
      <span className="text-[#A0A0A0] text-[12px]">{label}</span>
      <span className="text-white text-[13px] font-semibold">{value}</span>
    </div>
  );
}
