"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getTrip, getCities, getFlights, getHotels, getTransports, recalcTripAggregates } from "@/lib/firestore";
import { BottomNav } from "../BottomNav";
import { TopNav } from "../TopNav";
import { CalendarView } from "./CalendarView";
import { ListView } from "./ListView";
import { ItemsView } from "./ItemsView";
import { AiParseModal } from "../AiParseModal";
import { TripForm } from "../forms/TripForm";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal } from "lucide-react";

type Tab = "calendar" | "list" | "items";
const TABS: Tab[] = ["calendar", "list", "items"];
const TAB_LABELS: Record<Tab, string> = { calendar: "Calendario", list: "Lista", items: "Items" };

interface Props {
  tripId: string;
}

export function TripDetailPage({ tripId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("calendar");
  const [parseOpen, setParseOpen] = useState(false);
  const [editTripOpen, setEditTripOpen] = useState(false);
  const prevTabIndexRef = useRef(0);

  const { data: trip, isLoading: loadingTrip, refetch: refetchTrip } = useQuery({
    queryKey: ["trip", user?.uid, tripId],
    queryFn: () => getTrip(user!.uid, tripId),
    enabled: !!user,
  });

  const { data: cities = [], refetch: refetchCities } = useQuery({
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

  async function refetchAll() {
    refetchCities();
    refetchFlights();
    refetchHotels();
    refetchTransports();
    if (user) {
      try {
        await recalcTripAggregates(user.uid, tripId);
        refetchTrip();
        queryClient.invalidateQueries({ queryKey: ["trips", user.uid] });
      } catch (e) {
        console.error("recalc failed", e);
      }
    }
  }

  if (authLoading || loadingTrip) {
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

  const dateRange = `${new Date(trip.start_date + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  })} – ${new Date(trip.end_date + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  const tabIndex = TABS.indexOf(tab);
  const direction = tabIndex >= prevTabIndexRef.current ? 1 : -1;
  prevTabIndexRef.current = tabIndex;

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <TopNav
        active="trips"
        onAdd={() => setParseOpen(true)}
        addIcon="sparkles"
        addLabel="Agregar con IA"
      />

      {/* Mobile header (condensed) */}
      <div className="md:hidden flex items-center gap-4 px-6 pt-12 pb-4 border-b border-[#1A1A1A] animate-fade-slide-up stagger-0">
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#333] text-[#0A84FF] text-[17px] press-feedback"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold text-white truncate leading-tight">{trip.name}</h1>
          <p className="text-[#707070] text-[12px] mt-0.5">{dateRange}</p>
        </div>
        <button
          onClick={() => setEditTripOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#333] text-[#A0A0A0] hover:text-white transition-colors press-feedback"
          aria-label="Editar viaje"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="mx-auto max-w-6xl pb-32 md:pb-16">
        {/* Desktop header block */}
        <div className="hidden md:flex items-end justify-between px-8 pt-10 pb-6 animate-fade-slide-up stagger-0">
          <div className="flex items-center gap-5 min-w-0">
            <Link
              href="/"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#161616] border border-[#262626] text-[#A0A0A0] hover:text-white hover:border-[#333] transition-colors flex-shrink-0"
              aria-label="Volver"
            >
              <ArrowLeft size={17} strokeWidth={2.2} />
            </Link>
            <div className="min-w-0">
              <p className="text-[#707070] text-[11px] uppercase tracking-[0.18em] font-semibold mb-1.5">
                Viaje
              </p>
              <h1 className="text-[38px] font-bold text-white truncate leading-[1.05] tracking-tight">
                {trip.name}
              </h1>
              <p className="text-[#A0A0A0] text-[14px] mt-1.5">{dateRange} · {totalDays} días</p>
            </div>
          </div>
          <button
            onClick={() => setEditTripOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#161616] border border-[#262626] text-[#A0A0A0] hover:text-white hover:border-[#333] transition-colors flex-shrink-0"
            aria-label="Editar viaje"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Summary card — mobile shows own copy; desktop inlines stats row */}
        <div className="px-6 md:px-8 pt-3 md:pt-0 pb-3 md:pb-6 animate-fade-slide-up stagger-2">
          <TripSummaryCard totalUsd={trip.total_usd} totalDays={totalDays} />
        </div>

        {/* Tabs */}
        <div className="px-6 md:px-8 animate-fade-slide-up stagger-3">
          <div className="relative flex gap-1 bg-[#141414] p-1 rounded-full border border-[#222] md:max-w-md md:mx-auto">
            <span
              className="absolute top-1 bottom-1 rounded-full pointer-events-none"
              style={{
                background: "linear-gradient(180deg, #2A2A2A, #1E1E1E)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
                width: "calc((100% - 8px) / 3)",
                left: `calc(4px + ${tabIndex} * (100% - 8px) / 3)`,
                transition: "left 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex-1 py-2 text-[13px] md:text-[14px] font-semibold rounded-full transition-colors duration-200 ${
                  tab === t ? "text-white" : "text-[#707070] hover:text-[#A0A0A0]"
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          key={tab}
          className={`mt-4 md:mt-6 ${direction > 0 ? "animate-slide-in-right" : "animate-slide-in-left"}`}
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
          {tab === "items" && (
            <ItemsView
              trip={trip}
              cities={cities}
              flights={flights}
              hotels={hotels}
              transports={transports}
              onChanged={refetchAll}
            />
          )}
        </div>
      </div>

      {/* Bottom nav con FAB central (mobile) */}
      <BottomNav active="trips" onAdd={() => setParseOpen(true)} addIcon="sparkles" />

      {parseOpen && (
        <AiParseModal
          tripId={tripId}
          onClose={() => setParseOpen(false)}
          onConfirmed={() => { setParseOpen(false); refetchAll(); }}
        />
      )}

      {editTripOpen && trip && (
        <TripForm
          trip={trip}
          onClose={() => setEditTripOpen(false)}
          onSaved={() => {
            setEditTripOpen(false);
            refetchTrip();
            queryClient.invalidateQueries({ queryKey: ["trips", user?.uid] });
          }}
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
      className="rounded-[18px] px-5 md:px-7 py-3.5 md:py-5 overflow-hidden relative"
      style={{
        background: "linear-gradient(180deg, #171717 0%, #121212 100%)",
        border: "1px solid #232323",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-end justify-between gap-4 md:gap-8">
        <Metric label="Presupuesto" value={`USD ${totalUsd.toLocaleString("es-AR")}`} accent="#0A84FF" />
        <div className="hidden md:block w-px self-stretch bg-[#242424]" />
        <Metric
          label="Duración"
          value={
            <>
              {totalDays}
              <span className="text-[14px] text-[#707070] font-semibold ml-0.5">d</span>
            </>
          }
          align="right"
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  align = "left",
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#707070] font-bold mb-1.5">
        {label}
      </p>
      <p
        className="text-[22px] md:text-[28px] font-bold text-white tabular-nums leading-none whitespace-nowrap tracking-tight"
        style={accent ? { color: "#FFFFFF" } : undefined}
      >
        {typeof value === "string" && accent ? (
          <>
            <span className="text-white">USD </span>
            <span style={{ color: accent }}>{value.replace("USD ", "")}</span>
          </>
        ) : (
          value
        )}
      </p>
    </div>
  );
}
