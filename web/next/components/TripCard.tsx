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
    <Link href={`/trips/${trip.id}`}>
      <div className="flex items-center gap-4 bg-[#1A1A1A] rounded-[16px] border border-[#333] px-4 py-4 hover:border-[#444] transition-colors cursor-pointer">
        {/* Cover thumbnail */}
        <div className="w-14 h-14 rounded-[12px] bg-[#242424] flex-shrink-0 overflow-hidden">
          {trip.cover_url ? (
            <img src={trip.cover_url} alt={trip.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">✈️</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[17px] font-semibold text-white truncate">{trip.name}</h3>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-[#A0A0A0] text-[13px]">{formatDateRange(trip.start_date, trip.end_date)}</p>
          {trip.total_usd > 0 && (
            <p className="text-[#707070] text-[12px] mt-0.5">USD {trip.total_usd.toLocaleString()}</p>
          )}
        </div>

        {/* Arrow */}
        <span className="text-[#333] text-[20px] flex-shrink-0">›</span>
      </div>
    </Link>
  );
}
