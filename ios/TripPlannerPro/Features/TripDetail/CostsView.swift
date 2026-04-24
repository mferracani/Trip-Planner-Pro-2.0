import SwiftUI

struct CostsView: View {
    let vm: TripDetailViewModel

    private var byCurrency: [String: Double] {
        var acc: [String: Double] = [:]
        for f in vm.flights where f.price != nil {
            let cur = f.currency ?? "USD"
            acc[cur, default: 0] += f.price!
        }
        for h in vm.hotels where h.price != nil {
            let cur = h.currency ?? "USD"
            acc[cur, default: 0] += h.price!
        }
        for t in vm.transports where t.price != nil {
            let cur = t.currency ?? "USD"
            acc[cur, default: 0] += t.price!
        }
        return acc
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Tokens.Spacing.md) {
                if byCurrency.isEmpty {
                    Text("Sin costos registrados")
                        .font(.system(size: 15))
                        .foregroundStyle(Tokens.Color.textTertiary)
                        .frame(maxWidth: .infinity, minHeight: 200, alignment: .center)
                } else {
                    ForEach(byCurrency.keys.sorted(), id: \.self) { currency in
                        HStack {
                            Text(MoneyFormatter.symbol(for: currency))
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(Tokens.Color.textSecondary)
                            Text(currency)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Tokens.Color.textTertiary)
                            Spacer()
                            Text(MoneyFormatter.amount(byCurrency[currency]!, currency: currency))
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundStyle(Tokens.Color.textPrimary)
                        }
                        .padding(Tokens.Spacing.md)
                        .background(RoundedRectangle(cornerRadius: Tokens.Radius.md).fill(Tokens.Color.surface))
                    }
                }
            }
            .padding(Tokens.Spacing.base)
        }
        .background(Tokens.Color.bgPrimary)
    }
}
