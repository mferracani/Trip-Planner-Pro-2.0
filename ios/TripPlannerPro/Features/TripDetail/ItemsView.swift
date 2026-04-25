import SwiftUI

// MARK: - ItemsView
//
// "What's in this trip" — one block per item type (Flights / Hotels /
// Transports / Expenses), each with counts + totals.

struct ItemsView: View {
    let vm: TripDetailViewModel
    @State private var selected: SelectedItem?

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
                        FlightsBlock(flights: vm.flights) { selected = .flight($0) }
                    }
                    if !vm.hotels.isEmpty {
                        HotelsBlock(hotels: vm.hotels) { selected = .hotel($0) }
                    }
                    if !vm.transports.isEmpty {
                        TransportsBlock(transports: vm.transports) { selected = .transport($0) }
                    }
                    let unlinkedExpenses = vm.expenses.filter { $0.linkedItemId == nil }
                    if !unlinkedExpenses.isEmpty {
                        ExpensesBlock(expenses: unlinkedExpenses) { selected = .expense($0) }
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
    let onTap: (Flight) -> Void

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
                    Button { onTap(f) } label: { FlightCompactRow(flight: f) }
                        .buttonStyle(RowButtonStyle())
                    if idx < sorted.count - 1 { Hairline() }
                }
            }
            .background(blockBackground)
        }
    }
}

private struct FlightCompactRow: View {
    let flight: Flight

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "airplane")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Tokens.Color.Category.flight)
                .frame(width: 22)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(flight.originIATA) → \(flight.destinationIATA)")
                    .font(.system(size: 15, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textPrimary)
                MonoLabel(
                    text: "\(shortDate(flight.departureDate)) · \(flight.airline) \(flight.flightNumber)",
                    color: Tokens.Color.textTertiary,
                    size: .xs
                )
            }

            Spacer(minLength: 8)

            if let usd = flight.priceUSD, usd > 0 {
                Text("$\(Int(usd.rounded()))")
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .tracking(-0.2)
                    .foregroundStyle(Tokens.Color.textPrimary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    private func shortDate(_ iso: String) -> String {
        guard let d = Trip.isoDateFormatter.date(from: iso) else { return iso }
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.dateFormat = "dd MMM"
        return f.string(from: d)
    }
}

// MARK: - HotelsBlock

private struct HotelsBlock: View {
    let hotels: [Hotel]
    let onTap: (Hotel) -> Void

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
                    Button { onTap(h) } label: { HotelCompactRow(hotel: h) }
                        .buttonStyle(RowButtonStyle())
                    if idx < sorted.count - 1 { Hairline() }
                }
            }
            .background(blockBackground)
        }
    }
}

private struct HotelCompactRow: View {
    let hotel: Hotel

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "bed.double.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Tokens.Color.Category.hotel)
                .frame(width: 22)

            VStack(alignment: .leading, spacing: 2) {
                Text(hotel.name)
                    .font(Tokens.Typo.strongS)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                MonoLabel(
                    text: "\(shortDate(hotel.checkIn)) → \(shortDate(hotel.checkOut)) · \(hotel.nights)n",
                    color: Tokens.Color.textTertiary,
                    size: .xs
                )
            }

            Spacer(minLength: 8)

            if let usd = hotel.totalPriceUSD, usd > 0 {
                Text("$\(Int(usd.rounded()))")
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .tracking(-0.2)
                    .foregroundStyle(Tokens.Color.textPrimary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    private func shortDate(_ iso: String) -> String {
        guard let d = Trip.isoDateFormatter.date(from: iso) else { return iso }
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.dateFormat = "dd MMM"
        return f.string(from: d)
    }
}

// MARK: - TransportsBlock

private struct TransportsBlock: View {
    let transports: [Transport]
    let onTap: (Transport) -> Void

    private var sorted: [Transport] {
        transports.sorted { $0.departureLocalTime < $1.departureLocalTime }
    }

    private var totalUSD: Double {
        transports.reduce(0) { $0 + ($1.priceUSD ?? 0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            BlockHeader(
                color: Tokens.Color.Category.transit,
                label: "Transportes · \(transports.count)",
                totalUSD: totalUSD
            )

            VStack(spacing: 0) {
                ForEach(Array(sorted.enumerated()), id: \.element.id) { idx, t in
                    Button { onTap(t) } label: { TransportCompactRow(transport: t) }
                        .buttonStyle(RowButtonStyle())
                    if idx < sorted.count - 1 { Hairline() }
                }
            }
            .background(blockBackground)
        }
    }
}

private struct TransportCompactRow: View {
    let transport: Transport

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "tram.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Tokens.Color.Category.transit)
                .frame(width: 22)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(transport.origin) → \(transport.destination)")
                    .font(Tokens.Typo.strongS)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                MonoLabel(
                    text: "\(shortDate(transport.departureDate)) · \(transport.type)",
                    color: Tokens.Color.textTertiary,
                    size: .xs
                )
            }

            Spacer(minLength: 8)

            if let usd = transport.priceUSD, usd > 0 {
                Text("$\(Int(usd.rounded()))")
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .tracking(-0.2)
                    .foregroundStyle(Tokens.Color.textPrimary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    private func shortDate(_ iso: String) -> String {
        guard let d = Trip.isoDateFormatter.date(from: iso) else { return iso }
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.dateFormat = "dd MMM"
        return f.string(from: d)
    }
}

// MARK: - ExpensesBlock

private struct ExpensesBlock: View {
    let expenses: [Expense]
    let onTap: (Expense) -> Void

    private var sorted: [Expense] {
        expenses.sorted { $0.date > $1.date }
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
                    Button { onTap(e) } label: { ExpenseCompactRow(expense: e) }
                        .buttonStyle(RowButtonStyle())
                    if idx < sorted.count - 1 { Hairline() }
                }
            }
            .background(blockBackground)
        }
    }
}

// MARK: - RowButtonStyle

struct RowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.55 : 1)
            .contentShape(Rectangle())
    }
}

private struct ExpenseCompactRow: View {
    let expense: Expense

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: expense.categoryKind.systemImage)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(expense.categoryKind.tint)
                .frame(width: 22)

            VStack(alignment: .leading, spacing: 2) {
                Text(expense.title)
                    .font(Tokens.Typo.strongS)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                MonoLabel(
                    text: "\(shortDate(expense.date)) · \(expense.category)",
                    color: Tokens.Color.textTertiary,
                    size: .xs
                )
            }

            Spacer(minLength: 8)

            Text("\(expense.currency) \(formattedAmount)")
                .font(.system(size: 13, weight: .semibold, design: .monospaced))
                .tracking(-0.2)
                .foregroundStyle(Tokens.Color.textPrimary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    private var formattedAmount: String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: expense.amount)) ?? "\(Int(expense.amount))"
    }

    private func shortDate(_ iso: String) -> String {
        guard let d = Trip.isoDateFormatter.date(from: iso) else { return iso }
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.dateFormat = "dd MMM"
        return f.string(from: d)
    }
}

// MARK: - BlockHeader

private struct BlockHeader: View {
    let color: Color
    let label: String
    let totalUSD: Double

    var body: some View {
        HStack {
            HStack(spacing: 8) {
                Circle().fill(color).frame(width: 6, height: 6)
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
