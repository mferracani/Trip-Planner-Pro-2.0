import SwiftUI

// MARK: - ListView — Category blocks with expandable rows

struct ListView: View {
    let vm: TripDetailViewModel
    @State private var selected: SelectedItem?

    private var regularTransports: [Transport] {
        vm.transports.filter { $0.type != "car_rental" }
    }

    private var carRentals: [Transport] {
        vm.transports.filter { $0.type == "car_rental" }
    }

    private var unlinkedExpenses: [Expense] {
        vm.expenses.filter { $0.linkedItemId == nil }
    }

    private var hasAny: Bool {
        !vm.flights.isEmpty || !vm.hotels.isEmpty || !vm.transports.isEmpty || !vm.expenses.isEmpty
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if !hasAny {
                    emptyState
                } else {
                    if !vm.flights.isEmpty {
                        FlightsBlock(
                            flights: vm.flights,
                            onEdit: { selected = .flight($0) },
                            onDelete: { f in Task { try? await vm.deleteFlight(id: f.id ?? "") } }
                        )
                    }
                    if !vm.hotels.isEmpty {
                        HotelsBlock(
                            hotels: vm.hotels,
                            onEdit: { selected = .hotel($0) },
                            onDelete: { h in Task { try? await vm.deleteHotel(id: h.id ?? "") } }
                        )
                    }
                    if !regularTransports.isEmpty {
                        TransportsBlock(
                            transports: regularTransports,
                            onEdit: { selected = .transport($0) },
                            onDelete: { t in Task { try? await vm.deleteTransport(id: t.id ?? "") } }
                        )
                    }
                    if !carRentals.isEmpty {
                        CarRentalsBlock(
                            rentals: carRentals,
                            onEdit: { selected = .transport($0) },
                            onDelete: { t in Task { try? await vm.deleteTransport(id: t.id ?? "") } }
                        )
                    }
                    if !unlinkedExpenses.isEmpty {
                        ExpensesBlock(
                            expenses: unlinkedExpenses,
                            onEdit: { selected = .expense($0) },
                            onDelete: { e in Task { try? await vm.deleteExpense(id: e.id ?? "") } }
                        )
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
            .padding(.bottom, 80)
        }
        .background(Tokens.Color.bgPrimary)
        .scrollIndicators(.hidden)
        .editSheet(item: $selected, tripID: vm.trip.id ?? "")
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "square.grid.2x2")
                .font(.system(size: 28, weight: .light))
                .foregroundStyle(Tokens.Color.textTertiary)
            Text("Sin items aún")
                .font(Tokens.Typo.bodyM)
                .foregroundStyle(Tokens.Color.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
}

// MARK: - FlightsBlock

private struct FlightsBlock: View {
    let flights: [Flight]
    let onEdit: (Flight) -> Void
    let onDelete: (Flight) -> Void

    @State private var expandedId: String?
    @State private var copiedRef: String?

    private var sorted: [Flight] {
        flights.sorted { $0.departureLocalTime < $1.departureLocalTime }
    }

    private var totalUSD: Double {
        flights.reduce(0) { $0 + ($1.priceUSD ?? 0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            BlockHeader(
                color: Tokens.Color.Category.flight,
                label: "Vuelos · \(flights.count)",
                totalUSD: totalUSD
            )

            VStack(spacing: 0) {
                ForEach(Array(sorted.enumerated()), id: \.element.id) { idx, f in
                    VStack(spacing: 0) {
                        // Compact row
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                expandedId = expandedId == f.id ? nil : f.id
                            }
                        } label: {
                            FlightRowCompact(flight: f, copiedRef: $copiedRef)
                        }
                        .buttonStyle(RowButtonStyle())

                        // Expanded detail
                        if expandedId == f.id {
                            FlightRowDetail(flight: f, copiedRef: $copiedRef, onEdit: { onEdit(f) }, onDelete: { onDelete(f) })
                                .transition(.opacity.combined(with: .move(edge: .top)))
                        }

                        if idx < sorted.count - 1 { Hairline() }
                    }
                }
            }
            .background(blockBackground)
        }
    }
}

private struct FlightRowCompact: View {
    let flight: Flight
    @Binding var copiedRef: String?

    private var depTime: String {
        String(flight.departureLocalTime.split(separator: "T").last?.prefix(5) ?? "")
    }

    private var arrTime: String {
        String(flight.arrivalLocalTime.split(separator: "T").last?.prefix(5) ?? "")
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "airplane")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Tokens.Color.Category.flight)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(flight.originIATA) → \(flight.destinationIATA)")
                    .font(Tokens.Typo.strongM)
                    .tracking(Tokens.Track.bodyTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                MonoLabel(
                    text: "\(flight.airline) \(flight.flightNumber)",
                    color: Tokens.Color.textTertiary,
                    size: .xs
                )
            }

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                if let ref = flight.bookingRef, !ref.isEmpty {
                    CopyRefButton(ref: ref, copiedRef: $copiedRef)
                }

                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 4) {
                        Text(depTime)
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        if !arrTime.isEmpty {
                            Text("→")
                                .font(.system(size: 11))
                                .foregroundStyle(Tokens.Color.textTertiary)
                            Text(arrTime)
                                .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        }
                    }
                    .tracking(-0.2)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    if let usd = flight.priceUSD, usd > 0 {
                        MonoLabel(text: "$\(Int(usd.rounded()))", color: Tokens.Color.textTertiary, size: .xs)
                    }
                }

                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }
}

private struct FlightRowDetail: View {
    let flight: Flight
    @Binding var copiedRef: String?
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Hairline()

            if let legs = flight.legs, !legs.isEmpty {
                let outbound = legs.filter { $0.direction == "outbound" }
                let inbound = legs.filter { $0.direction == "inbound" }

                if !outbound.isEmpty {
                    LegGroup(title: "Ida", legs: outbound)
                }
                if !inbound.isEmpty {
                    LegGroup(title: "Vuelta", legs: inbound)
                }
            } else {
                // Legacy mono-leg
                Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 6) {
                    GridRow {
                        DetailCell(label: "Salida", value: fmtDateTime(flight.departureLocalTime))
                        DetailCell(label: "Llegada", value: fmtDateTime(flight.arrivalLocalTime))
                    }
                    if let cabin = flight.cabinClass, !cabin.isEmpty {
                        GridRow {
                            DetailCell(label: "Clase", value: cabinLabel(cabin))
                            if let seat = flight.seat, !seat.isEmpty {
                                DetailCell(label: "Asiento", value: seat)
                            } else {
                                DetailCell(label: "", value: nil)
                            }
                        }
                    }
                }
            }

            // Edit / Delete row
            HStack(spacing: 8) {
                Button(action: onEdit) {
                    Text("Editar vuelo")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Tokens.Color.Category.flight)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: Tokens.Radius.sm).fill(Tokens.Color.Category.flight.opacity(0.12)))
                }
                .buttonStyle(.plain)

                Button { showDeleteConfirm = true } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Tokens.Color.accentRed)
                        .frame(width: 36)
                        .padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: Tokens.Radius.sm).fill(Tokens.Color.accentRed.opacity(0.12)))
                }
                .buttonStyle(.plain)
                .alert("¿Eliminar?", isPresented: $showDeleteConfirm) {
                    Button("Eliminar", role: .destructive, action: onDelete)
                    Button("Cancelar", role: .cancel) {}
                } message: {
                    Text("Esta acción no se puede deshacer.")
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 12)
    }
}

private struct LegGroup: View {
    let title: String
    let legs: [FlightLeg]

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            MonoLabel(text: title, color: Tokens.Color.textTertiary, size: .xs)
            ForEach(legs) { leg in
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text("\(leg.originIATA) → \(leg.destinationIATA)")
                            .font(Tokens.Typo.strongS)
                            .foregroundStyle(Tokens.Color.textPrimary)
                        if let dur = leg.durationMinutes, dur > 0 {
                            MonoLabel(text: fmtDuration(dur), color: Tokens.Color.textTertiary, size: .xs)
                        }
                    }
                    HStack(spacing: 8) {
                        MonoLabel(
                            text: "\(leg.airline) \(leg.flightNumber)",
                            color: Tokens.Color.textSecondary,
                            size: .xs
                        )
                        MonoLabel(
                            text: "\(fmtTime(leg.departureLocalTime)) → \(fmtTime(leg.arrivalLocalTime))",
                            color: Tokens.Color.textTertiary,
                            size: .xs
                        )
                        if let cabin = leg.cabinClass, !cabin.isEmpty {
                            MonoLabel(text: cabinLabel(cabin), color: Tokens.Color.textTertiary, size: .xs)
                        }
                        if let seat = leg.seat, !seat.isEmpty {
                            MonoLabel(text: seat, color: Tokens.Color.textTertiary, size: .xs)
                        }
                    }
                }
                .padding(8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                        .fill(Tokens.Color.elevated.opacity(0.5))
                )
            }
        }
    }
}

// MARK: - HotelsBlock

private struct HotelsBlock: View {
    let hotels: [Hotel]
    let onEdit: (Hotel) -> Void
    let onDelete: (Hotel) -> Void

    @State private var expandedId: String?
    @State private var copiedRef: String?

    private var sorted: [Hotel] {
        hotels.sorted { $0.checkIn < $1.checkIn }
    }

    private var totalUSD: Double {
        hotels.reduce(0) { $0 + ($1.totalPriceUSD ?? 0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            BlockHeader(
                color: Tokens.Color.Category.hotel,
                label: "Hoteles · \(hotels.count)",
                totalUSD: totalUSD
            )

            VStack(spacing: 0) {
                ForEach(Array(sorted.enumerated()), id: \.element.id) { idx, h in
                    VStack(spacing: 0) {
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                expandedId = expandedId == h.id ? nil : h.id
                            }
                        } label: {
                            HotelRowCompact(hotel: h, copiedRef: $copiedRef)
                        }
                        .buttonStyle(RowButtonStyle())

                        if expandedId == h.id {
                            HotelRowDetail(hotel: h, onEdit: { onEdit(h) }, onDelete: { onDelete(h) })
                                .transition(.opacity.combined(with: .move(edge: .top)))
                        }

                        if idx < sorted.count - 1 { Hairline() }
                    }
                }
            }
            .background(blockBackground)
        }
    }
}

private struct HotelRowCompact: View {
    let hotel: Hotel
    @Binding var copiedRef: String?

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "bed.double.fill")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Tokens.Color.Category.hotel)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(hotel.name)
                    .font(Tokens.Typo.strongM)
                    .tracking(Tokens.Track.bodyTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                MonoLabel(text: "\(hotel.nights) noches · \(fmtISODate(hotel.checkIn))", color: Tokens.Color.textTertiary, size: .xs)
            }

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                if let ref = hotel.bookingRef, !ref.isEmpty {
                    CopyRefButton(ref: ref, copiedRef: $copiedRef)
                }
                VStack(alignment: .trailing, spacing: 2) {
                    if let usd = hotel.totalPriceUSD, usd > 0 {
                        Text("$\(Int(usd.rounded()))")
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .tracking(-0.2)
                            .foregroundStyle(Tokens.Color.textPrimary)
                    }
                }
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }
}

private struct HotelRowDetail: View {
    let hotel: Hotel
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Hairline()
            Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 6) {
                GridRow {
                    DetailCell(label: "Check-in", value: fmtISODate(hotel.checkIn))
                    DetailCell(label: "Check-out", value: fmtISODate(hotel.checkOut))
                }
                GridRow {
                    DetailCell(label: "Noches", value: "\(hotel.nights)")
                    if let roomType = hotel.roomType, !roomType.isEmpty {
                        DetailCell(label: "Habitación", value: roomType)
                    } else {
                        DetailCell(label: "", value: nil)
                    }
                }
            }
            HStack(spacing: 8) {
                Button(action: onEdit) {
                    Text("Editar hotel")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Tokens.Color.Category.hotel)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: Tokens.Radius.sm).fill(Tokens.Color.Category.hotel.opacity(0.12)))
                }
                .buttonStyle(.plain)

                Button { showDeleteConfirm = true } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Tokens.Color.accentRed)
                        .frame(width: 36)
                        .padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: Tokens.Radius.sm).fill(Tokens.Color.accentRed.opacity(0.12)))
                }
                .buttonStyle(.plain)
                .alert("¿Eliminar?", isPresented: $showDeleteConfirm) {
                    Button("Eliminar", role: .destructive, action: onDelete)
                    Button("Cancelar", role: .cancel) {}
                } message: {
                    Text("Esta acción no se puede deshacer.")
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 12)
    }
}

// MARK: - TransportsBlock

private struct TransportsBlock: View {
    let transports: [Transport]
    let onEdit: (Transport) -> Void
    let onDelete: (Transport) -> Void

    @State private var expandedId: String?
    @State private var copiedRef: String?

    private var sorted: [Transport] {
        transports.sorted { $0.departureLocalTime < $1.departureLocalTime }
    }

    private var totalUSD: Double {
        transports.reduce(0) { $0 + ($1.priceUSD ?? 0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            BlockHeader(
                icon: "tram.fill",
                color: Tokens.Color.Category.transit,
                label: "Transportes · \(transports.count)",
                totalUSD: totalUSD
            )

            VStack(spacing: 0) {
                ForEach(Array(sorted.enumerated()), id: \.element.id) { idx, t in
                    VStack(spacing: 0) {
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                expandedId = expandedId == t.id ? nil : t.id
                            }
                        } label: {
                            TransportRowCompact(transport: t, copiedRef: $copiedRef)
                        }
                        .buttonStyle(RowButtonStyle())

                        if expandedId == t.id {
                            TransportRowDetail(transport: t, onEdit: { onEdit(t) }, onDelete: { onDelete(t) })
                                .transition(.opacity.combined(with: .move(edge: .top)))
                        }

                        if idx < sorted.count - 1 { Hairline() }
                    }
                }
            }
            .background(blockBackground)
        }
    }
}

private struct TransportRowCompact: View {
    let transport: Transport
    @Binding var copiedRef: String?

    private var typeIcon: String {
        switch transport.type {
        case "train": return "train.side.front.car"
        case "bus": return "bus"
        case "ferry": return "ferry"
        case "car": return "car.fill"
        case "taxi": return "car.fill"
        case "subway": return "tram.fill.tunnel"
        default: return "tram.fill"
        }
    }

    private var typeLabel: String {
        switch transport.type {
        case "train": return "Tren"
        case "bus": return "Bus"
        case "ferry": return "Ferry"
        case "car": return "Auto"
        case "taxi": return "Taxi"
        case "subway": return "Metro"
        default: return "Transporte"
        }
    }

    private var time: String {
        String(transport.departureLocalTime.split(separator: "T").last?.prefix(5) ?? "")
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: typeIcon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Tokens.Color.Category.transit)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(transport.origin) → \(transport.destination)")
                    .font(Tokens.Typo.strongM)
                    .tracking(Tokens.Track.bodyTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                MonoLabel(text: typeLabel, color: Tokens.Color.textTertiary, size: .xs)
            }

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                if let ref = transport.bookingRef, !ref.isEmpty {
                    CopyRefButton(ref: ref, copiedRef: $copiedRef)
                }
                VStack(alignment: .trailing, spacing: 2) {
                    Text(time)
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .tracking(-0.2)
                        .foregroundStyle(Tokens.Color.textPrimary)
                    if let usd = transport.priceUSD, usd > 0 {
                        MonoLabel(text: "$\(Int(usd.rounded()))", color: Tokens.Color.textTertiary, size: .xs)
                    }
                }
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }
}

private struct TransportRowDetail: View {
    let transport: Transport
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Hairline()
            Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 6) {
                GridRow {
                    DetailCell(label: "Salida", value: fmtDateTime(transport.departureLocalTime))
                    if let op = transport.`operator`, !op.isEmpty {
                        DetailCell(label: "Operador", value: op)
                    } else {
                        DetailCell(label: "", value: nil)
                    }
                }
            }
            HStack(spacing: 8) {
                Button(action: onEdit) {
                    Text("Editar transporte")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Tokens.Color.Category.transit)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: Tokens.Radius.sm).fill(Tokens.Color.Category.transit.opacity(0.12)))
                }
                .buttonStyle(.plain)

                Button { showDeleteConfirm = true } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Tokens.Color.accentRed)
                        .frame(width: 36)
                        .padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: Tokens.Radius.sm).fill(Tokens.Color.accentRed.opacity(0.12)))
                }
                .buttonStyle(.plain)
                .alert("¿Eliminar?", isPresented: $showDeleteConfirm) {
                    Button("Eliminar", role: .destructive, action: onDelete)
                    Button("Cancelar", role: .cancel) {}
                } message: {
                    Text("Esta acción no se puede deshacer.")
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 12)
    }
}

// MARK: - CarRentalsBlock

private struct CarRentalsBlock: View {
    let rentals: [Transport]
    let onEdit: (Transport) -> Void
    let onDelete: (Transport) -> Void

    @State private var expandedId: String?
    @State private var copiedRef: String?

    private var sorted: [Transport] {
        rentals.sorted { $0.departureLocalTime < $1.departureLocalTime }
    }

    private var totalUSD: Double {
        rentals.reduce(0) { $0 + ($1.priceUSD ?? 0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            BlockHeader(
                icon: "car.circle.fill",
                color: Tokens.Color.accentOrange,
                label: "Alquileres de auto · \(rentals.count)",
                totalUSD: totalUSD
            )

            VStack(spacing: 0) {
                ForEach(Array(sorted.enumerated()), id: \.element.id) { idx, t in
                    VStack(spacing: 0) {
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                expandedId = expandedId == t.id ? nil : t.id
                            }
                        } label: {
                            CarRentalRowCompact(rental: t, copiedRef: $copiedRef)
                        }
                        .buttonStyle(RowButtonStyle())

                        if expandedId == t.id {
                            TransportRowDetail(transport: t, onEdit: { onEdit(t) }, onDelete: { onDelete(t) })
                                .transition(.opacity.combined(with: .move(edge: .top)))
                        }

                        if idx < sorted.count - 1 { Hairline() }
                    }
                }
            }
            .background(blockBackground)
        }
    }
}

private struct CarRentalRowCompact: View {
    let rental: Transport
    @Binding var copiedRef: String?

    private var time: String {
        String(rental.departureLocalTime.split(separator: "T").last?.prefix(5) ?? "")
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "car.circle.fill")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Tokens.Color.accentOrange)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(rental.origin) → \(rental.destination)")
                    .font(Tokens.Typo.strongM)
                    .tracking(Tokens.Track.bodyTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                MonoLabel(text: rental.`operator` ?? "Auto", color: Tokens.Color.textTertiary, size: .xs)
            }

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                if let ref = rental.bookingRef, !ref.isEmpty {
                    CopyRefButton(ref: ref, copiedRef: $copiedRef)
                }
                VStack(alignment: .trailing, spacing: 2) {
                    Text(time)
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .tracking(-0.2)
                        .foregroundStyle(Tokens.Color.textPrimary)
                    if let usd = rental.priceUSD, usd > 0 {
                        MonoLabel(text: "$\(Int(usd.rounded()))", color: Tokens.Color.textTertiary, size: .xs)
                    }
                }
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }
}

// MARK: - ExpensesBlock

private struct ExpensesBlock: View {
    let expenses: [Expense]
    let onEdit: (Expense) -> Void
    let onDelete: (Expense) -> Void

    @State private var expandedId: String?

    private var sorted: [Expense] {
        expenses.sorted { $0.date < $1.date }
    }

    private var totalUSD: Double {
        expenses.reduce(0) { $0 + ($1.amountUSD ?? 0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            BlockHeader(
                color: Tokens.Color.accentGreen,
                label: "Otros gastos · \(expenses.count)",
                totalUSD: totalUSD
            )

            VStack(spacing: 0) {
                ForEach(Array(sorted.enumerated()), id: \.element.id) { idx, e in
                    VStack(spacing: 0) {
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                expandedId = expandedId == e.id ? nil : e.id
                            }
                        } label: {
                            ExpenseRowCompact(expense: e)
                        }
                        .buttonStyle(RowButtonStyle())

                        if expandedId == e.id {
                            ExpenseRowDetail(expense: e, onEdit: { onEdit(e) }, onDelete: { onDelete(e) })
                                .transition(.opacity.combined(with: .move(edge: .top)))
                        }

                        if idx < sorted.count - 1 { Hairline() }
                    }
                }
            }
            .background(blockBackground)
        }
    }
}

private struct ExpenseRowCompact: View {
    let expense: Expense

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: expense.categoryKind.systemImage)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(expense.categoryKind.tint)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(expense.title)
                    .font(Tokens.Typo.strongM)
                    .tracking(Tokens.Track.bodyTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                MonoLabel(text: expense.category, color: Tokens.Color.textTertiary, size: .xs)
            }

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(expense.currency) \(formatted(expense.amount))")
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .tracking(-0.2)
                        .foregroundStyle(Tokens.Color.textPrimary)
                    if let usd = expense.amountUSD, usd > 0 {
                        MonoLabel(text: "≈ $\(Int(usd.rounded()))", color: Tokens.Color.textTertiary, size: .xs)
                    }
                }
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }

    private func formatted(_ n: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: n)) ?? "\(Int(n))"
    }
}

private struct ExpenseRowDetail: View {
    let expense: Expense
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Hairline()
            Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 6) {
                GridRow {
                    DetailCell(label: "Fecha", value: fmtISODate(expense.date))
                    DetailCell(label: "Categoría", value: expense.category)
                }
            }
            HStack(spacing: 8) {
                Button(action: onEdit) {
                    Text("Editar gasto")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Tokens.Color.accentGreen)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: Tokens.Radius.sm).fill(Tokens.Color.accentGreen.opacity(0.12)))
                }
                .buttonStyle(.plain)

                Button { showDeleteConfirm = true } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Tokens.Color.accentRed)
                        .frame(width: 36)
                        .padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: Tokens.Radius.sm).fill(Tokens.Color.accentRed.opacity(0.12)))
                }
                .buttonStyle(.plain)
                .alert("¿Eliminar?", isPresented: $showDeleteConfirm) {
                    Button("Eliminar", role: .destructive, action: onDelete)
                    Button("Cancelar", role: .cancel) {}
                } message: {
                    Text("Esta acción no se puede deshacer.")
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 12)
    }
}

// MARK: - CopyRefButton

private struct CopyRefButton: View {
    let ref: String
    @Binding var copiedRef: String?

    private var isCopied: Bool { copiedRef == ref }

    var body: some View {
        Button {
            UIPasteboard.general.string = ref
            withAnimation(.easeInOut(duration: 0.15)) { copiedRef = ref }
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                withAnimation { if copiedRef == ref { copiedRef = nil } }
            }
        } label: {
            HStack(spacing: 3) {
                Text(isCopied ? "✓" : ref)
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .foregroundStyle(isCopied ? Tokens.Color.accentGreen : Tokens.Color.textTertiary)
                    .lineLimit(1)
                if !isCopied {
                    Image(systemName: "doc.on.doc")
                        .font(.system(size: 9))
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(
                RoundedRectangle(cornerRadius: 5)
                    .fill(isCopied ? Tokens.Color.accentGreen.opacity(0.12) : Tokens.Color.elevated)
                    .overlay(
                        RoundedRectangle(cornerRadius: 5)
                            .strokeBorder(
                                isCopied ? Tokens.Color.accentGreen.opacity(0.3) : Tokens.Color.border,
                                lineWidth: 0.5
                            )
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Shared Components

private struct BlockHeader: View {
    var icon: String? = nil
    let color: Color
    let label: String
    let totalUSD: Double

    var body: some View {
        HStack {
            HStack(spacing: 8) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(color)
                } else {
                    Circle().fill(color).frame(width: 6, height: 6)
                }
                MonoLabel(text: label, color: Tokens.Color.textSecondary, size: .s)
            }
            Spacer()
            if totalUSD > 0 {
                Text("$\(Int(totalUSD.rounded())) USD")
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .tracking(-0.2)
                    .foregroundStyle(Tokens.Color.textPrimary)
            }
        }
    }
}

private var blockBackground: some View {
    RoundedRectangle(cornerRadius: Tokens.Radius.md)
        .fill(Tokens.Color.surface)
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
        )
}

private struct DetailCell: View {
    let label: String
    let value: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if !label.isEmpty {
                MonoLabel(text: label, color: Tokens.Color.textTertiary, size: .xs)
            }
            if let value, !value.isEmpty {
                Text(value)
                    .font(.system(size: 13))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
        }
    }
}

// MARK: - Helpers

private func fmtTime(_ localTime: String) -> String {
    String(localTime.split(separator: "T").last?.prefix(5) ?? "")
}

private func fmtISODate(_ iso: String) -> String {
    let p = iso.split(separator: "-")
    guard p.count == 3 else { return iso }
    return "\(p[2])-\(p[1])-\(p[0])"
}

private func fmtDateTime(_ localTime: String) -> String {
    let parts = localTime.split(separator: "T")
    let date = parts.first.map(String.init) ?? ""
    let time = parts.last.map { String($0.prefix(5)) } ?? ""
    return [fmtISODate(date), time].filter { !$0.isEmpty }.joined(separator: " ")
}

private func fmtDuration(_ minutes: Int) -> String {
    let h = minutes / 60
    let m = minutes % 60
    return m == 0 ? "\(h)h" : "\(h)h \(m)m"
}

private func cabinLabel(_ cabin: String) -> String {
    switch cabin {
    case "economy": return "Economy"
    case "premium_economy": return "Premium Economy"
    case "business": return "Business"
    case "first": return "Primera"
    default: return cabin
    }
}
