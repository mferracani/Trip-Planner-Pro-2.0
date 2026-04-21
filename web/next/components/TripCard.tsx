"use client";

import Link from "next/link";
import { Trip } from "@/lib/types";

interface TripCardProps {
  trip: Trip;
  status: "active" | "future" | "past";
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "En curso", color: "text-[#30D158] bg-[#30D158]/15" },
  future: { label: "Futuro", color: "text-[#0A84FF] bg-[#0A84FF]/15" },
  past: { label: "Pasado", color: "text-[#A0A0A0] bg-[#333]/50" },
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString("es-AR", opts)} – ${e.toLocaleDateString("es-AR", { ...opts, year: "numeric" })}`;
  }
  return `${s.toLocaleDateString("es-AR", { ...opts, year: "numeric" })} – ${e.toLocaleDateString("es-AR", { ...opts, year: "numeric" })}`;
}

export function TripCard({ trip, status }: TripCardProps) {
  const badge = STATUS_LABELS[status];

  return (
    <Link href={`/trips/${trip.id}`} className="group">
      <div
        className="relative flex items-center gap-4 rounded-[16px] px-4 py-4 md:px-5 md:py-5 transition-all cursor-pointer overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #171717 0%, #131313 100%)",
          border: "1px solid #232323",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        {/* hover gradient wash */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 0% 50%, rgba(191,90,242,0.08), transparent 70%)",
          }}
        />

        {/* Cover thumbnail */}
        <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-[12px] bg-[#242424] flex-shrink-0 overflow-hidden">
          {trip.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={trip.cover_url} alt={trip.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-2xl"
              style={{
                background: "linear-gradient(135deg, #1E1E1E 0%, #161616 100%)",
              }}
            >
              ✈️
            </div>
          )}
        </div>

        {/* Info */}
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[17px] md:text-[18px] font-semibold text-white truncate tracking-tight">
              {trip.name}
            </h3>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-[#A0A0A0] text-[13px]">{formatDateRange(trip.start_date, trip.end_date)}</p>
          {trip.total_usd > 0 && (
            <p className="text-[#707070] text-[12px] font-mono tabular-nums mt-0.5">
              USD {trip.total_usd.toLocaleString()}
            </p>
          )}
        </div>

        {/* Arrow */}
        <span className="relative text-[#3D3D3D] text-[20px] flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-[#A0A0A0]">
          ›
        </span>
      </div>
    </Link>
  );
}
