import SwiftUI

// MARK: - CostsView
//
// Total del viaje en USD + breakdown por categoría (flights/hotels/transports/
// expenses) y por moneda. Refleja el mismo cálculo que la web:
// flight.price_usd + hotel.total_price_usd + transport.price_usd + expense.amount_usd.

struct CostsView: View {
    let vm: TripDetailViewModel
    @State private var selectedCategory: CostCategory?
    @State private var selectedItem: SelectedItem?
    @State private var markAllPaidCategory: CostCategory?
    @State private var markAllPaidError: String?
    @State private var customRates: [String: String] = [:]
    @State private var editingRateCurrency: String? = nil

    // Raw sums per bucket
    private var flightsUSD: Double { vm.flights.reduce(0) { $0 + ($1.priceUSD ?? 0) } }
    private var hotelsUSD: Double { vm.hotels.reduce(0) { $0 + ($1.totalPriceUSD ?? 0) } }
    private var transportsUSD: Double { vm.transports.reduce(0) { $0 + ($1.priceUSD ?? 0) } }
    private var expensesUSD: Double { vm.expenses.reduce(0) { $0 + ($1.amountUSD ?? 0) } }
    private var totalUSD: Double { flightsUSD + hotelsUSD + transportsUSD + expensesUSD }

    private var paidUSD: Double { vm.paidTotalUSD }
    private var remainingUSD: Double { max(0, totalUSD - paidUSD) }

    private var breakdown: [BreakdownRow] {
        var rows: [BreakdownRow] = []
        if flightsUSD > 0 {
            rows.append(.init(category: .flights, label: "Vuelos", count: vm.flights.count, usd: flightsUSD, tint: Tokens.Color.Category.flight, icon: "airplane"))
        }
        if hotelsUSD > 0 {
            rows.append(.init(category: .hotels, label: "Hoteles", count: vm.hotels.count, usd: hotelsUSD, tint: Tokens.Color.Category.hotel, icon: "bed.double.fill"))
        }
        if transportsUSD > 0 {
            rows.append(.init(category: .transports, label: "Transportes", count: vm.transports.count, usd: transportsUSD, tint: Tokens.Color.Category.transit, icon: "tram.fill"))
        }
        if expensesUSD > 0 {
            rows.append(.init(category: .expenses, label: "Otros gastos", count: vm.expenses.count, usd: expensesUSD, tint: Tokens.Color.accentGreen, icon: "sparkles"))
        }
        return rows.sorted { $0.usd > $1.usd }
    }

    private var byCurrency: [(String, Double, Int)] {
        var map: [String: (total: Double, count: Int)] = [:]

        func add(_ currency: String, _ amount: Double) {
            let prev = map[currency] ?? (total: 0, count: 0)
            map[currency] = (prev.total + amount, prev.count + 1)
        }

        for f in vm.flights {
            if let c = f.currency, let p = f.price { add(c, p) }
        }
        for h in vm.hotels {
            if let c = h.currency, let p = h.totalPrice { add(c, p) }
        }
        for t in vm.transports {
            if let p = t.price {
                add(t.currency ?? "USD", p)
            }
        }
        for e in vm.expenses {
            add(e.currency, e.amount)
        }

        return map
            .map { ($0.key, $0.value.total, $0.value.count) }
            .sorted { $0.1 > $1.1 }
    }

    private var impliedRateMap: [String: Double] {
        var localTotals: [String: Double] = [:]
        var usdTotals: [String: Double] = [:]
        func add(_ c: String?, _ p: Double?, _ usd: Double?) {
            guard let c, c != "USD", let p, p > 0, let usd, usd > 0 else { return }
            localTotals[c, default: 0] += p
            usdTotals[c, default: 0] += usd
        }
        for f in vm.flights    { add(f.currency, f.price, f.priceUSD) }
        for h in vm.hotels     { add(h.currency, h.totalPrice, h.totalPriceUSD) }
        for t in vm.transports { add(t.currency, t.price, t.priceUSD) }
        for e in vm.expenses   { add(e.currency, e.amount, e.amountUSD) }
        return localTotals.reduce(into: [:]) { result, pair in
            if let usd = usdTotals[pair.key], pair.value > 0 {
                result[pair.key] = usd / pair.value
            }
        }
    }

    private var projectedTotalUSD: Double? {
        guard !customRates.isEmpty else { return nil }
        var total = 0.0
        func addItem(_ currency: String?, _ price: Double?, _ priceUSD: Double?) {
            let c = currency ?? "USD"
            if c == "USD" {
                total += priceUSD ?? price ?? 0
            } else if let rateStr = customRates[c], let rate = Double(rateStr.replacingOccurrences(of: ",", with: ".")), let p = price {
                total += p * rate
            } else {
                total += priceUSD ?? 0
            }
        }
        for f in vm.flights    { addItem(f.currency, f.price, f.priceUSD) }
        for h in vm.hotels     { addItem(h.currency, h.totalPrice, h.totalPriceUSD) }
        for t in vm.transports { addItem(t.currency, t.price, t.priceUSD) }
        for e in vm.expenses   { addItem(e.currency, e.amount, e.amountUSD) }
        return total
    }

    private var dailyAverage: Double {
        let days = max(
            1,
            Calendar.current.dateComponents([.day], from: vm.trip.startDate, to: vm.trip.endDate).day ?? 0
        ) + 1
        return totalUSD / Double(days)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if totalUSD == 0 {
                    emptyState
                } else {
                    totalHero
                    breakdownSection
                    currencySection
                    if !impliedRateMap.isEmpty {
                        fxRatesSection
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
            .padding(.bottom, 80)
        }
        .background(Tokens.Color.bgPrimary)
        .scrollIndicators(.hidden)
        .sheet(item: $selectedCategory) { cat in
            CategoryBreakdownSheet(
                category: cat,
                vm: vm,
                onSelectItem: { item in
                    selectedCategory = nil
                    // Defer presentation so dismissal finishes first.
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                        selectedItem = item
                    }
                },
                onClose: { selectedCategory = nil }
            )
            .presentationDetents([.large])
            .presentationBackground(Tokens.Color.bgPrimary)
        }
        .editSheet(item: $selectedItem, tripID: vm.trip.id ?? "")
        // Confirmation alert: "mark all [category] as paid"
        .alert(
            markAllPaidCategory.map { "¿Marcar todos los \($0.label) como pagados?" } ?? "",
            isPresented: Binding(
                get: { markAllPaidCategory != nil },
                set: { if !$0 { markAllPaidCategory = nil } }
            )
        ) {
            Button("Marcar como pagado", role: .none) {
                guard let cat = markAllPaidCategory else { return }
                markAllPaidCategory = nil
                Task {
                    do { try await vm.markAllPaid(category: cat) }
                    catch { markAllPaidError = "No se pudo actualizar." }
                }
            }
            Button("Cancelar", role: .cancel) { markAllPaidCategory = nil }
        }
        .alert("Error", isPresented: Binding(
            get: { markAllPaidError != nil },
            set: { if !$0 { markAllPaidError = nil } }
        )) {
            Button("OK") { markAllPaidError = nil }
        } message: {
            Text(markAllPaidError ?? "")
        }
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "dollarsign.circle")
                .font(.system(size: 28, weight: .light))
                .foregroundStyle(Tokens.Color.textTertiary)
            Text("Sin costos registrados")
                .font(Tokens.Typo.bodyM)
                .foregroundStyle(Tokens.Color.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }

    // MARK: - Hero

    private var totalHero: some View {
        VStack(alignment: .leading, spacing: 14) {
            MonoLabel(text: "Total del viaje", color: Tokens.Color.textTertiary, size: .xs)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("$")
                    .font(.system(size: 28, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textSecondary)
                Text(formatted(totalUSD, decimals: 0))
                    .font(.system(size: 48, weight: .bold))
                    .tracking(Tokens.Track.displayTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                Text("USD")
                    .font(.system(size: 16, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .padding(.leading, 4)
            }

            Hairline()

            HStack(spacing: 0) {
                statBlock(value: "$\(Int(dailyAverage.rounded()))", label: "Por día")
                Rectangle().fill(Tokens.Color.borderSoft).frame(width: 0.5, height: 32)
                statBlock(value: paidUSD > 0 ? "$\(Int(paidUSD.rounded()))" : "—", label: "Pagado")
                Rectangle().fill(Tokens.Color.borderSoft).frame(width: 0.5, height: 32)
                statBlock(
                    value: remainingUSD > 0 ? "$\(Int(remainingUSD.rounded()))" : "—",
                    label: "Resta"
                )
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                .fill(Tokens.Color.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                        .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                )
        )
    }

    private func statBlock(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .monospaced))
                .tracking(-0.3)
                .foregroundStyle(Tokens.Color.textPrimary)
            MonoLabel(text: label, color: Tokens.Color.textTertiary, size: .xs)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.leading, 4)
    }

    // MARK: - Breakdown by type

    private var breakdownSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Por categoría")

            VStack(spacing: 0) {
                ForEach(Array(breakdown.enumerated()), id: \.offset) { idx, row in
                    let pct = totalUSD > 0 ? row.usd / totalUSD : 0
                    let hasUnpaid = categoryHasUnpaid(row.category)
                    HStack(spacing: 0) {
                        Button { selectedCategory = row.category } label: {
                            BreakdownBar(row: row, percent: pct)
                        }
                        .buttonStyle(RowButtonStyle())

                        if hasUnpaid {
                            // Action: mark all as paid (circle, not filled)
                            Button {
                                markAllPaidCategory = row.category
                            } label: {
                                Image(systemName: "circle")
                                    .font(.system(size: 18, weight: .light))
                                    .foregroundStyle(Tokens.Color.textTertiary)
                                    .frame(width: 44, height: 44)
                                    .contentShape(Rectangle())
                            }
                            .padding(.trailing, 8)
                        } else {
                            // Status: fully paid
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundStyle(Tokens.Color.accentGreen)
                                .frame(width: 44, height: 44)
                                .padding(.trailing, 8)
                        }
                    }
                    if idx < breakdown.count - 1 { Hairline() }
                }
            }
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )
        }
    }

    /// Returns true when the category has any item where paid_amount < total.
    private func categoryHasUnpaid(_ category: CostCategory) -> Bool {
        switch category {
        case .flights:
            return vm.flights.contains { ($0.paidAmount ?? 0) < ($0.price ?? 0) && ($0.price ?? 0) > 0 }
        case .hotels:
            return vm.hotels.contains { ($0.paidAmount ?? 0) < ($0.totalPrice ?? 0) && ($0.totalPrice ?? 0) > 0 }
        case .transports:
            return vm.transports.contains { ($0.paidAmount ?? 0) < ($0.price ?? 0) && ($0.price ?? 0) > 0 }
        case .expenses:
            return vm.expenses.contains { ($0.paidAmount ?? 0) < $0.amount && $0.amount > 0 }
        }
    }

    // MARK: - By currency

    private var currencySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Por moneda")

            VStack(spacing: 0) {
                ForEach(Array(byCurrency.enumerated()), id: \.offset) { idx, row in
                    let (currency, amount, count) = row
                    HStack {
                        Text(currency)
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .tracking(Tokens.Track.labelWide)
                            .foregroundStyle(Tokens.Color.textSecondary)
                            .frame(width: 48, alignment: .leading)
                        MonoLabel(text: "\(count) items", color: Tokens.Color.textTertiary, size: .xs)
                        Spacer()
                        Text(formatted(amount, decimals: 0))
                            .font(.system(size: 16, weight: .semibold, design: .monospaced))
                            .tracking(-0.2)
                            .foregroundStyle(Tokens.Color.textPrimary)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 14)
                    if idx < byCurrency.count - 1 { Hairline() }
                }
            }
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )
        }
    }

    // MARK: - FX Rates

    private var fxRatesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Tasas FX")

            VStack(spacing: 0) {
                ForEach(Array(impliedRateMap.keys.sorted()), id: \.self) { currency in
                    let implied = impliedRateMap[currency] ?? 0
                    let isEditing = editingRateCurrency == currency
                    let hasCustom = customRates[currency] != nil && !(customRates[currency]?.isEmpty ?? true)

                    HStack(spacing: 12) {
                        Text("1 \(currency)")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundStyle(Tokens.Color.textSecondary)

                        Text("=")
                            .font(.system(size: 12))
                            .foregroundStyle(Tokens.Color.textTertiary)

                        if isEditing {
                            TextField(rateFormatted(implied), text: Binding(
                                get: { customRates[currency] ?? "" },
                                set: { customRates[currency] = $0 }
                            ))
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Tokens.Color.accentOrange)
                            .keyboardType(.decimalPad)
                            .frame(maxWidth: .infinity)
                            .onSubmit { editingRateCurrency = nil }
                        } else {
                            let displayRate = customRates[currency].flatMap { Double($0.replacingOccurrences(of: ",", with: ".")) } ?? implied
                            Text("\(rateFormatted(displayRate)) USD")
                                .font(.system(size: 13, weight: .semibold, design: .monospaced))
                                .foregroundStyle(hasCustom ? Tokens.Color.accentOrange : Tokens.Color.textPrimary)
                            Spacer()
                        }

                        Button {
                            if isEditing {
                                editingRateCurrency = nil
                            } else if hasCustom {
                                customRates.removeValue(forKey: currency)
                                editingRateCurrency = nil
                            } else {
                                editingRateCurrency = currency
                            }
                        } label: {
                            Image(systemName: isEditing ? "checkmark" : hasCustom ? "lock.fill" : "pencil")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(hasCustom ? Tokens.Color.accentOrange : Tokens.Color.textTertiary)
                                .frame(width: 36, height: 36)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)

                    if currency != impliedRateMap.keys.sorted().last {
                        Hairline()
                    }
                }
            }
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )

            if let projected = projectedTotalUSD {
                HStack {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Tokens.Color.accentOrange)
                    Text("Proyectado con tasas personalizadas")
                        .font(.system(size: 12))
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Spacer()
                    Text("$\(Int(projected.rounded())) USD")
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Tokens.Color.accentOrange)
                }
                .padding(.horizontal, 4)
            }
        }
    }

    private func rateFormatted(_ rate: Double) -> String {
        if rate < 0.01 {
            return String(format: "%.6f", rate)
        } else if rate < 1 {
            return String(format: "%.4f", rate)
        } else {
            return String(format: "%.4f", rate)
        }
    }

    // MARK: - Helpers

    private func formatted(_ n: Double, decimals: Int) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = decimals
        f.minimumFractionDigits = decimals
        return f.string(from: NSNumber(value: n)) ?? "\(Int(n))"
    }
}

// MARK: - CostCategory

enum CostCategory: String, Identifiable, Hashable {
    case flights, hotels, transports, expenses
    var id: String { rawValue }
}

// MARK: - BreakdownRow

private struct BreakdownRow: Identifiable {
    var id: String { label }
    let category: CostCategory
    let label: String
    let count: Int
    let usd: Double
    let tint: Color
    let icon: String
}

// MARK: - BreakdownBar

private struct BreakdownBar: View {
    let row: BreakdownRow
    let percent: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: row.icon)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(row.tint)
                        .frame(width: 20)
                    Text(row.label)
                        .font(Tokens.Typo.strongS)
                        .foregroundStyle(Tokens.Color.textPrimary)
                    Text("\(row.count)")
                        .font(.system(size: 11, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("$\(Int(row.usd.rounded()))")
                        .font(.system(size: 14, weight: .semibold, design: .monospaced))
                        .tracking(-0.2)
                        .foregroundStyle(Tokens.Color.textPrimary)
                    Text("\(Int((percent * 100).rounded()))%")
                        .font(.system(size: 9, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Tokens.Color.elevated)
                        .frame(height: 3)
                    Capsule()
                        .fill(row.tint)
                        .frame(width: max(0, geo.size.width * percent), height: 3)
                }
            }
            .frame(height: 3)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }
}
