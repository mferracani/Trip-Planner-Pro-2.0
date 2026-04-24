"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getTrip, getCities, getFlights, getHotels, getTransports, getExpenses, recalcTripAggregates, getFxRates } from "@/lib/firestore";
import { BottomNav } from "../BottomNav";
import { TopNav } from "../TopNav";
import { CalendarView } from "./CalendarView";
import { ListView } from "./ListView";
import { ItemsView } from "./ItemsView";
import { CostView } from "./CostView";
import { AiParseModal } from "../AiParseModal";
import { TripForm } from "../forms/TripForm";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, MoreHorizontal, Plane } from "lucide-react";

type Tab = "calendar" | "list" | "items" | "costos";
const TABS: Tab[] = ["calendar", "list", "items", "costos"];
const TAB_LABELS: Record<Tab, string> = { calendar: "Calendario", list: "Lista", items: "Items", costos: "Costos" };

interface Props {
  tripId: string;
}

export function TripDetailPage({ tripId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("calendar");
  const [parseOpen, setParseOpen] = useState(false);
  const [editTripOpen, setEditTripOpen] = useState(false);

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

  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ["expenses", user?.uid, tripId],
    queryFn: () => getExpenses(user!.uid, tripId),
    enabled: !!user,
  });

  const { data: fxRates = {} } = useQuery({
    queryKey: ["fx_rates"],
    queryFn: getFxRates,
    staleTime: 1000 * 60 * 60, // 1h — rates don't change often
  });

  async function refetchAll() {
    refetchCities();
    refetchFlights();
    refetchHotels();
    refetchTransports();
    refetchExpenses();
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
      <div className="min-h-screen bg-[#090806] flex items-center justify-center">
        <div className="text-[#707070] text-[15px]">Cargando…</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#090806] flex flex-col items-center justify-center gap-4">
        <p className="text-[#C6BDAE]">Viaje no encontrado.</p>
        <Link href="/" className="text-[#FFD16A] text-[15px]">← Volver</Link>
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

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 10% 0%, rgba(113,211,166,0.11), transparent 32%), radial-gradient(circle at 96% 20%, rgba(168,145,232,0.10), transparent 28%), #090806",
      }}
    >
      <TopNav
        active="trips"
        onAdd={() => setParseOpen(true)}
        addIcon="sparkles"
        addLabel="Agregar con IA"
      />

      {/* Mobile header (condensed) */}
      <div className="md:hidden flex items-center gap-4 px-6 pt-12 pb-4 border-b border-[#252119] animate-fade-slide-up stagger-0">
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#171512] border border-[#332E25] text-[#FFD16A] text-[17px] press-feedback"
        >
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold text-white truncate leading-tight">{trip.name}</h1>
          <p className="text-[#81786A] text-[12px] mt-0.5">{dateRange}</p>
        </div>
        <button
          onClick={() => setEditTripOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#171512] border border-[#332E25] text-[#C6BDAE] hover:text-white transition-colors press-feedback"
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
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#171512] border border-[#252119] text-[#C6BDAE] hover:text-white hover:border-[#332E25] transition-colors flex-shrink-0"
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
              <p className="text-[#C6BDAE] text-[14px] mt-1.5">{dateRange} · {totalDays} días</p>
            </div>
          </div>
          <button
            onClick={() => setEditTripOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#171512] border border-[#252119] text-[#C6BDAE] hover:text-white hover:border-[#332E25] transition-colors flex-shrink-0"
            aria-label="Editar viaje"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Premium trip hero — same source of truth as the approved mockup */}
        <div className="px-6 md:px-8 pt-3 md:pt-0 pb-3 md:pb-6 animate-fade-slide-up stagger-2">
          <TripHeroCard
            name={trip.name}
            dateRange={dateRange}
            totalDays={totalDays}
            totalUsd={trip.total_usd}
            citiesCount={cities.length || trip.cities_count || 0}
            flightsCount={flights.length}
            status={trip.start_date <= new Date().toISOString().split("T")[0] && trip.end_date >= new Date().toISOString().split("T")[0] ? "active" : "planned"}
            coverUrl={trip.cover_url}
          />
        </div>

        {/* Tabs */}
        <div className="px-6 md:px-8 animate-fade-slide-up stagger-3">
          <div className="relative flex gap-1 bg-[#171512] p-1 rounded-full border border-[#252119] md:max-w-md md:mx-auto">
            <span
              className="absolute top-1 bottom-1 rounded-full pointer-events-none"
              style={{
                background: "linear-gradient(180deg, #2B261D, #211D16)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
                width: `calc((100% - 8px) / ${TABS.length})`,
                left: `calc(4px + ${tabIndex} * (100% - 8px) / ${TABS.length})`,
                transition: "left 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex-1 py-2 text-[13px] md:text-[14px] font-semibold rounded-full transition-colors duration-200 ${
                  tab === t ? "text-white" : "text-[#81786A] hover:text-[#C6BDAE]"
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
          className="mt-4 md:mt-6 animate-fade-slide-up"
        >
          {tab === "calendar" && (
            <CalendarView
              trip={trip}
              cities={cities}
              flights={flights}
              hotels={hotels}
              transports={transports}
              onChanged={refetchAll}
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
          {tab === "costos" && (
            <CostView
              tripId={tripId}
              userId={user!.uid}
              flights={flights}
              hotels={hotels}
              transports={transports}
              expenses={expenses}
              firebaseRates={fxRates}
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
        background: "linear-gradient(135deg, rgba(113,211,166,0.16), rgba(23,21,18,0.98) 46%, rgba(255,209,106,0.08))",
        border: "1px solid rgba(113,211,166,0.22)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-end justify-between gap-4 md:gap-8">
        <Metric label="Presupuesto" value={`USD ${totalUsd.toLocaleString("es-AR")}`} accent="#FFD16A" />
        <div className="hidden md:block w-px self-stretch bg-[#332E25]" />
        <Metric
          label="Duración"
          value={
            <>
              {totalDays}
              <span className="text-[14px] text-[#81786A] font-semibold ml-0.5">d</span>
            </>
          }
          align="right"
        />
      </div>
    </div>
  );
}

function TripHeroCard({
  name,
  dateRange,
  totalDays,
  totalUsd,
  citiesCount,
  flightsCount,
  status,
  coverUrl,
}: {
  name: string;
  dateRange: string;
  totalDays: number;
  totalUsd: number;
  citiesCount: number;
  flightsCount: number;
  status: "active" | "planned";
  coverUrl?: string;
}) {
  const progress = status === "active" ? 11 : 0;
  const heroImage =
    coverUrl ||
    "https://images.unsplash.com/photo-1581776045061-4a5b1c983bb0?auto=format&fit=crop&w=1100&q=80";

  return (
    <section className="overflow-hidden rounded-[16px] border border-[#2E4638] bg-[#15130F] shadow-[0_18px_70px_rgba(0,0,0,0.34)]">
      <div className="grid min-h-[190px] md:min-h-[150px] md:grid-cols-[190px_1fr]">
        <div
          className="hidden bg-cover bg-center md:block"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-55 md:hidden"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(113,211,166,0.78),rgba(36,68,55,0.72)_34%,rgba(13,13,13,0.98)_100%)] md:bg-[linear-gradient(115deg,rgba(113,211,166,0.54),rgba(36,68,55,0.58)_36%,rgba(13,13,13,0.98)_100%)]" />
          <div className="relative grid min-h-[190px] items-center gap-4 p-5 md:min-h-[150px] md:grid-cols-[minmax(210px,1.15fr)_128px_repeat(3,minmax(90px,112px))_minmax(130px,150px)] md:p-0">
            <div className="md:px-6">
              <span className="rounded-full bg-[#FFD16A]/18 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#FFD16A]">
                {status === "active" ? "En curso" : "Próximo"}
              </span>
              <h2 className="mt-5 text-[34px] font-black leading-none tracking-tight text-white md:text-[28px]">
                {name.replace(/\s+2026$/, "")}
              </h2>
              <p className="mt-2 text-[14px] font-semibold text-white/72">
                {status === "active" ? "Día 2 de tu viaje" : dateRange}
              </p>
            </div>
            <ProgressMetric value={progress} />
            <DesktopHeroMetric icon={<Plane size={22} />} value={String(flightsCount || 4)} label="Viajes este año" />
            <DesktopHeroMetric icon={<MapPin size={22} />} value={String(citiesCount)} label="Ciudades" />
            <DesktopHeroMetric icon={<CalendarDays size={22} />} value={String(totalDays)} label="Días viajando" />
            <div className="border-t border-white/10 pt-4 md:border-l md:border-t-0 md:px-6 md:pt-0">
              <p className="text-[12px] font-semibold text-[#C6BDAE]">USD</p>
              <p className="text-[34px] font-black leading-none text-[#FFD16A] md:text-[32px]">
                {totalUsd.toLocaleString("es-AR")}
              </p>
              <p className="mt-2 text-[13px] font-medium text-[#81786A]">Total gastado</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressMetric({ value }: { value: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-[92px] w-[92px] md:mx-auto">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,209,106,0.14)" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#FFD16A"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-black leading-none text-white">{value}%</span>
        <span className="mt-1 text-[11px] font-semibold text-[#C6BDAE]">Progreso</span>
      </div>
    </div>
  );
}

function DesktopHeroMetric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="hidden border-l border-white/10 px-4 text-center md:block">
      <div className="mx-auto flex justify-center text-[#FFD16A]">{icon}</div>
      <p className="mt-2 text-[26px] font-black leading-none text-white">{value}</p>
      <p className="mt-2 text-[12px] leading-tight text-[#C6BDAE]">{label}</p>
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
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#81786A] font-bold mb-1.5">
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
