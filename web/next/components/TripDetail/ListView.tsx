"use client";

import { Trip, City, Flight, Hotel, Transport } from "@/lib/types";

interface Props {
  trip: Trip;
  cities: City[];
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
}

interface DayGroup {
  date: string;
  city?: City;
  flights: Flight[];
  hotels: Hotel[];
  transports: Transport[];
}

function buildDayGroups(trip: Trip, cities: City[], flights: Flight[], hotels: Hotel[], transports: Transport[]): DayGroup[] {
  const dateCityMap: Record<string, City> = {};
  for (const c of cities) {
    for (const d of c.days ?? []) dateCityMap[d] = c;
  }

  // All dates in range
  const dates: string[] = [];
  const cur = new Date(trip.start_date + "T00:00:00");
  const end = new Date(trip.end_date + "T00:00:00");
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }

  return dates
    .map((date) => ({
      date,
      city: dateCityMap[date],
      flights: flights.filter((f) => f.departure_local_time?.startsWith(date)),
      hotels: hotels.filter((h) => h.check_in <= date && h.check_out > date),
      transports: transports.filter((t) => t.departure_local_time?.startsWith(date)),
    }))
    .filter((g) => g.flights.length > 0 || g.hotels.length > 0 || g.transports.length > 0);
}

export function ListView({ trip, cities, flights, hotels, transports }: Props) {
  const groups = buildDayGroups(trip, cities, flights, hotels, transports);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-4xl">📋</span>
        <p className="text-[#707070] text-[15px]">Todavía no hay items. Usá ✨ para agregar.</p>
      </div>
    );
  }

  return (
    <div className="px-6 space-y-6 pb-32">
      {groups.map((group) => {
        const date = new Date(group.date + "T00:00:00");
        const label = date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

        return (
          <div key={group.date}>
            {/* Sticky day header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-1 h-5 rounded-full"
                style={{ backgroundColor: group.city?.color ?? "#333" }}
              />
              <div>
                <p className="text-[15px] font-semibold text-white capitalize">{label}</p>
                {group.city && (
                  <p className="text-[12px] text-[#A0A0A0]">{group.city.name}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {group.flights.map((f) => (
                <FlightRow key={f.id} flight={f} />
              ))}
              {group.hotels.map((h) => (
                <HotelRow key={h.id} hotel={h} />
              ))}
              {group.transports.map((t) => (
                <TransportRow key={t.id} transport={t} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FlightRow({ flight }: { flight: Flight }) {
  const dep = flight.departure_local_time?.split("T")[1]?.slice(0, 5) ?? "";
  const arr = flight.arrival_local_time?.split("T")[1]?.slice(0, 5) ?? "";
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#0A84FF]/15 flex items-center justify-center text-xl">✈️</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white">
          {flight.airline} {flight.flight_number} · {flight.origin_iata}→{flight.destination_iata}
        </p>
        <p className="text-[13px] text-[#A0A0A0]">
          {dep} → {arr}
          {flight.duration_minutes ? ` · ${Math.floor(flight.duration_minutes / 60)}h ${flight.duration_minutes % 60}m` : ""}
        </p>
      </div>
    </div>
  );
}

function HotelRow({ hotel }: { hotel: Hotel }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#FF9F0A]/15 flex items-center justify-center text-xl">🏨</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white">{hotel.name}</p>
        <p className="text-[13px] text-[#A0A0A0]">
          {hotel.check_in} → {hotel.check_out}
          {hotel.room_type ? ` · ${hotel.room_type}` : ""}
        </p>
      </div>
    </div>
  );
}

function TransportRow({ transport }: { transport: Transport }) {
  const dep = transport.departure_local_time?.split("T")[1]?.slice(0, 5) ?? "";
  const emoji = { train: "🚆", bus: "🚌", ferry: "⛴️", car: "🚗", taxi: "🚕", subway: "🚇", other: "🚐" }[transport.type] ?? "🚐";
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-[14px] px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#BF5AF2]/15 flex items-center justify-center text-xl">{emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-white">
          {transport.origin} → {transport.destination}
        </p>
        <p className="text-[13px] text-[#A0A0A0]">
          {dep}
          {transport.operator ? ` · ${transport.operator}` : ""}
        </p>
      </div>
    </div>
  );
}
