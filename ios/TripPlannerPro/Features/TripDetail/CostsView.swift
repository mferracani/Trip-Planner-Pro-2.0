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
                    Button { selectedCategory = row.category } label: {
                        BreakdownBar(row: row, percent: pct)
                    }
                    .buttonStyle(RowButtonStyle())
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
