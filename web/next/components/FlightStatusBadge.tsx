"use client";
import type { Flight, FlightStatus } from "@/lib/types";

const STATUS_CONFIG: Record<FlightStatus, { label: string; color: string; bg: string }> = {
  Scheduled: { label: "Programado", color: "#4D96FF", bg: "rgba(77,150,255,0.12)" },
  Active:    { label: "En vuelo",   color: "#71D3A6", bg: "rgba(113,211,166,0.12)" },
  Landed:    { label: "Aterrizó",   color: "#71D3A6", bg: "rgba(113,211,166,0.12)" },
  Delayed:   { label: "Demorado",   color: "#F29E7D", bg: "rgba(242,158,125,0.12)" },
  Canceled:  { label: "Cancelado",  color: "#E54B4B", bg: "rgba(229,75,75,0.12)" },
  Unknown:   { label: "Sin datos",  color: "#81786A", bg: "rgba(129,120,106,0.12)" },
  Diverted:  { label: "Desviado",   color: "#F2C84B", bg: "rgba(242,200,75,0.12)" },
};

export function FlightStatusBadge({ flight }: { flight: Pick<Flight, "current_status"> }) {
  const status = flight.current_status;
  if (!status) return null;
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "#81786A", bg: "rgba(129,120,106,0.12)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}
