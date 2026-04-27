import SwiftUI

// MARK: - CategoryBreakdownSheet
//
// Drill-down de una categoría de costos (Vuelos / Hoteles / Transportes /
// Otros). Muestra cada item con nombre + fecha + total + estado pagado.
// Swipe trailing → "Pagado" marca paid_amount = total en Firestore.

struct CategoryBreakdownSheet: View {
    let category: CostCategory
    let vm: TripDetailViewModel
    let onSelectItem: (SelectedItem) -> Void
    let onClose: () -> Void

    // Error toast
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            // List is the single scroll root — this lets .swipeActions work on
            // every item row without nesting a List inside a ScrollView.
            List {
                // Header section — non-swipeable
                Section {
                    header
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 8, leading: 20, bottom: 4, trailing: 20))

                    Hairline()
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 0, leading: 20, bottom: 8, trailing: 20))
                }

                // Items section — each row gets swipe action
                Section {
                    itemRows
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Tokens.Color.bgPrimary)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar", action: onClose)
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
            }
            .alert("Error", isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("OK") { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            MonoLabel(text: category.label, color: Tokens.Color.textTertiary, size: .xs)
            Text("$\(Int(totalUSD.rounded())) USD")
                .font(.system(size: 40, weight: .bold))
                .tracking(Tokens.Track.displayTight)
                .foregroundStyle(Tokens.Color.textPrimary)

            HStack(spacing: 0) {
                statBlock(value: "\(itemCount)", label: "Items")
                Rectangle().fill(Tokens.Color.borderSoft).frame(width: 0.5, height: 32)
                statBlock(value: "$\(Int(paidUSD.rounded()))", label: "Pagado")
                Rectangle().fill(Tokens.Color.borderSoft).frame(width: 0.5, height: 32)
                statBlock(value: "$\(Int(max(0, totalUSD - paidUSD).rounded()))", label: "Resta")
            }
        }
        .padding(.top, 8)
    }

    private func statBlock(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .tracking(-0.3)
                .foregroundStyle(Tokens.Color.textPrimary)
            MonoLabel(text: label, color: Tokens.Color.textTertiary, size: .xs)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Items list
    //
    // Returns ForEach content for the Section inside the root List.
    // Each item row gets a trailing swipe action when paid < total.
    // Row modifiers (.listRowBackground, .listRowSeparator, .listRowInsets)
    // must be applied on the item view itself — they are list-row context modifiers.

    @ViewBuilder
    private var itemRows: some View {
        switch category {
        case .flights:
            ForEach(vm.flights.sorted { $0.departureLocalTime < $1.departureLocalTime }) { f in
                flightRow(f)
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        if needsPayment(paid: f.paidAmount, total: f.price) {
                            markPaidButton { Task { await markFlightPaid(f) } }
                        }
                    }
            }
        case .hotels:
            ForEach(vm.hotels.sorted { $0.checkIn < $1.checkIn }) { h in
                hotelRow(h)
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        if needsPayment(paid: h.paidAmount, total: h.totalPrice) {
                            markPaidButton { Task { await markHotelPaid(h) } }
                        }
                    }
            }
        case .transports:
            ForEach(vm.transports.sorted { $0.departureLocalTime < $1.departureLocalTime }) { t in
                transportRow(t)
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        if needsPayment(paid: t.paidAmount, total: t.price) {
                            markPaidButton { Task { await markTransportPaid(t) } }
                        }
                    }
            }
        case .expenses:
            ForEach(vm.expenses.sorted { $0.date > $1.date }) { e in
                expenseRow(e)
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        if needsPayment(paid: e.paidAmount, total: e.amount) {
                            markPaidButton { Task { await markExpensePaid(e) } }
                        }
                    }
            }
        }
    }

    // MARK: Row builders
    //
    // .swipeActions attach to the List row (the outer view returned here).
    // The Button inside gets the tap; swipe is handled by the row container.

    private func flightRow(_ f: Flight) -> some View {
        Button { onSelectItem(.flight(f)) } label: {
            FlightBreakdownRow(flight: f)
        }
        .buttonStyle(RowButtonStyle())
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 5, leading: 20, bottom: 5, trailing: 20))
    }

    private func hotelRow(_ h: Hotel) -> some View {
        Button { onSelectItem(.hotel(h)) } label: {
            HotelBreakdownRow(hotel: h)
        }
        .buttonStyle(RowButtonStyle())
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 5, leading: 20, bottom: 5, trailing: 20))
    }

    private func transportRow(_ t: Transport) -> some View {
        Button { onSelectItem(.transport(t)) } label: {
            TransportBreakdownRow(transport: t)
        }
        .buttonStyle(RowButtonStyle())
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 5, leading: 20, bottom: 5, trailing: 20))
    }

    private func expenseRow(_ e: Expense) -> some View {
        Button { onSelectItem(.expense(e)) } label: {
            ExpenseBreakdownRow(expense: e)
        }
        .buttonStyle(RowButtonStyle())
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 5, leading: 20, bottom: 5, trailing: 20))
    }

    // MARK: - Swipe action button

    private func markPaidButton(action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label("Pagado", systemImage: "checkmark.circle.fill")
        }
        .tint(Tokens.Color.accentGreen)
    }

    // MARK: - Mark as paid — delegate to ViewModel

    private func needsPayment(paid: Double?, total: Double?) -> Bool {
        guard let total, total > 0 else { return false }
        return (paid ?? 0) < total
    }

    private func markFlightPaid(_ flight: Flight) async {
        do { try await vm.markFlightPaid(flight) }
        catch { errorMessage = "No se pudo marcar como pagado." }
    }

    private func markHotelPaid(_ hotel: Hotel) async {
        do { try await vm.markHotelPaid(hotel) }
        catch { errorMessage = "No se pudo marcar como pagado." }
    }

    private func markTransportPaid(_ transport: Transport) async {
        do { try await vm.markTransportPaid(transport) }
        catch { errorMessage = "No se pudo marcar como pagado." }
    }

    private func markExpensePaid(_ expense: Expense) async {
        do { try await vm.markExpensePaid(expense) }
        catch { errorMessage = "No se pudo marcar como pagado." }
    }

    // MARK: - Totals

    private var totalUSD: Double {
        switch category {
        case .flights: return vm.flights.reduce(0) { $0 + ($1.priceUSD ?? 0) }
        case .hotels:  return vm.hotels.reduce(0) { $0 + ($1.totalPriceUSD ?? 0) }
        case .transports: return vm.transports.reduce(0) { $0 + ($1.priceUSD ?? 0) }
        case .expenses: return vm.expenses.reduce(0) { $0 + ($1.amountUSD ?? 0) }
        }
    }

    private var paidUSD: Double {
        func paid(paid: Double?, price: Double?, priceUSD: Double?) -> Double {
            guard let paid, paid > 0, let price, let priceUSD, price > 0 else { return 0 }
            return paid * (priceUSD / price)
        }
        switch category {
        case .flights:
            return vm.flights.reduce(0) { $0 + paid(paid: $1.paidAmount, price: $1.price, priceUSD: $1.priceUSD) }
        case .hotels:
            return vm.hotels.reduce(0) { $0 + paid(paid: $1.paidAmount, price: $1.totalPrice, priceUSD: $1.totalPriceUSD) }
        case .transports:
            return vm.transports.reduce(0) { $0 + paid(paid: $1.paidAmount, price: $1.price, priceUSD: $1.priceUSD) }
        case .expenses:
            return vm.expenses.reduce(0) { $0 + paid(paid: $1.paidAmount, price: $1.amount, priceUSD: $1.amountUSD) }
        }
    }

    private var itemCount: Int {
        switch category {
        case .flights: return vm.flights.count
        case .hotels: return vm.hotels.count
        case .transports: return vm.transports.count
        case .expenses: return vm.expenses.count
        }
    }
}

extension CostCategory {
    var label: String {
        switch self {
        case .flights: return "Vuelos"
        case .hotels: return "Hoteles"
        case .transports: return "Transportes"
        case .expenses: return "Otros gastos"
        }
    }

    var tint: Color {
        switch self {
        case .flights: return Tokens.Color.Category.flight
        case .hotels: return Tokens.Color.Category.hotel
        case .transports: return Tokens.Color.Category.transit
        case .expenses: return Tokens.Color.accentGreen
        }
    }

    var icon: String {
        switch self {
        case .flights: return "airplane"
        case .hotels: return "bed.double.fill"
        case .transports: return "tram.fill"
        case .expenses: return "sparkles"
        }
    }
}

// MARK: - Rows

private struct FlightBreakdownRow: View {
    let flight: Flight

    var body: some View {
        BreakdownItemRow(
            icon: "airplane",
            tint: Tokens.Color.Category.flight,
            title: "\(flight.originIATA) → \(flight.destinationIATA)",
            subtitle: "\(flight.airline) \(flight.flightNumber) · \(shortDate(flight.departureDate))",
            currency: flight.currency,
            price: flight.price,
            priceUSD: flight.priceUSD,
            paidAmount: flight.paidAmount
        )
    }
}

private struct HotelBreakdownRow: View {
    let hotel: Hotel

    var body: some View {
        BreakdownItemRow(
            icon: "bed.double.fill",
            tint: Tokens.Color.Category.hotel,
            title: hotel.name,
            subtitle: "\(shortDate(hotel.checkIn)) → \(shortDate(hotel.checkOut)) · \(hotel.nights)n",
            currency: hotel.currency,
            price: hotel.totalPrice,
            priceUSD: hotel.totalPriceUSD,
            paidAmount: hotel.paidAmount
        )
    }
}

private struct TransportBreakdownRow: View {
    let transport: Transport

    var body: some View {
        BreakdownItemRow(
            icon: "tram.fill",
            tint: Tokens.Color.Category.transit,
            title: "\(transport.origin) → \(transport.destination)",
            subtitle: "\(shortDate(transport.departureDate)) · \(transport.type)",
            currency: transport.currency,
            price: transport.price,
            priceUSD: transport.priceUSD,
            paidAmount: transport.paidAmount
        )
    }
}

private struct ExpenseBreakdownRow: View {
    let expense: Expense

    var body: some View {
        BreakdownItemRow(
            icon: expense.categoryKind.systemImage,
            tint: expense.categoryKind.tint,
            title: expense.title,
            subtitle: "\(shortDate(expense.date)) · \(expense.category)",
            currency: expense.currency,
            price: expense.amount,
            priceUSD: expense.amountUSD,
            paidAmount: expense.paidAmount
        )
    }
}

// MARK: - BreakdownItemRow (shared)

private struct BreakdownItemRow: View {
    let icon: String
    let tint: Color
    let title: String
    let subtitle: String
    let currency: String?
    let price: Double?
    let priceUSD: Double?
    let paidAmount: Double?

    private var paidFraction: Double {
        guard let paid = paidAmount, let total = price, total > 0 else { return 0 }
        return min(1, paid / total)
    }

    private var status: (label: String, color: Color) {
        guard let paid = paidAmount, let total = price, total > 0 else {
            return ("Sin pago", Tokens.Color.textTertiary)
        }
        if paid >= total { return ("Pagado", Tokens.Color.accentGreen) }
        if paid <= 0 { return ("Sin pago", Tokens.Color.textTertiary) }
        return ("Resta", Tokens.Color.accentOrange)
    }

    private var remainingUSD: Double? {
        guard let paid = paidAmount, let total = price, let usd = priceUSD, total > 0 else { return nil }
        let remainFraction = max(0, total - paid) / total
        return remainFraction * usd
    }

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(tint.opacity(0.18))
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(tint)
                }
                .frame(width: 38, height: 38)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(Tokens.Typo.strongM)
                        .tracking(Tokens.Track.bodyTight)
                        .foregroundStyle(Tokens.Color.textPrimary)
                        .lineLimit(1)
                    MonoLabel(text: subtitle, color: Tokens.Color.textTertiary, size: .xs)
                }

                Spacer(minLength: 8)

                VStack(alignment: .trailing, spacing: 2) {
                    if let priceUSD, priceUSD > 0 {
                        Text("$\(Int(priceUSD.rounded()))")
                            .font(.system(size: 14, weight: .semibold, design: .monospaced))
                            .tracking(-0.2)
                            .foregroundStyle(Tokens.Color.textPrimary)
                    } else if let price, let currency {
                        Text("\(currency) \(formatted(price))")
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Tokens.Color.textPrimary)
                    }
                    MonoLabel(text: status.label, color: status.color, size: .xs)
                }
            }

            // Paid progress bar
            if price != nil {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Tokens.Color.elevated)
                            .frame(height: 2)
                        Capsule()
                            .fill(status.color)
                            .frame(width: max(0, geo.size.width * paidFraction), height: 2)
                    }
                }
                .frame(height: 2)

                // Paid / Remaining detail
                if let paid = paidAmount, let total = price, total > 0, let currency {
                    HStack {
                        Text("Pagado \(currency) \(formatted(paid))")
                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Tokens.Color.textTertiary)
                        Spacer()
                        if paid < total {
                            Text("Resta \(currency) \(formatted(max(0, total - paid)))")
                                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                .foregroundStyle(Tokens.Color.accentOrange)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                )
        )
    }

    private func formatted(_ n: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: n)) ?? "\(Int(n))"
    }
}

// MARK: - Shared helper

private func shortDate(_ iso: String) -> String {
    guard let d = Trip.isoDateFormatter.date(from: iso) else { return iso }
    let f = DateFormatter()
    f.locale = Locale(identifier: "es-AR")
    f.dateFormat = "dd MMM"
    return f.string(from: d)
}
