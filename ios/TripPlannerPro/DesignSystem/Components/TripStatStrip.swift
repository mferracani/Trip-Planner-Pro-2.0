import SwiftUI

struct TripStatStrip: View {
    let currentDay: Int
    let totalDays: Int
    let totalUSD: Double
    let cityCount: Int
    let flightCount: Int

    private var progress: Double {
        guard totalDays > 0 else { return 0 }
        return Double(currentDay) / Double(totalDays)
    }

    var body: some View {
        HStack(alignment: .top, spacing: Tokens.Spacing.lg) {
            dayProgress
            Spacer()
            usdStat
            statColumn(icon: "mappin", value: cityCount, label: "ciudades")
            statColumn(icon: "airplane", value: flightCount, label: "vuelos")
        }
        .padding(Tokens.Spacing.base)
        .background(Tokens.Gradient.statsCard)
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.lg))
    }

    private var dayProgress: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
            Text("Día \(currentDay) de \(totalDays)")
                .font(Tokens.Typography.caption1)
                .foregroundStyle(Tokens.Color.textSecondary)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Tokens.Color.elevated).frame(height: 3)
                    Capsule()
                        .fill(Tokens.Color.accentGreen)
                        .frame(width: geo.size.width * CGFloat(progress), height: 3)
                }
            }
            .frame(height: 3)
        }
        .frame(minWidth: 90)
    }

    private var usdStat: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("USD")
                .font(Tokens.Typography.caption2)
                .foregroundStyle(Tokens.Color.textTertiary)
            Text(formatUSD(totalUSD))
                .font(Tokens.Typography.statMedium)
                .foregroundStyle(Tokens.Color.accentGold)
        }
    }

    private func statColumn(icon: String, value: Int, label: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(Tokens.Color.accentGold)
            VStack(alignment: .leading, spacing: 1) {
                Text("\(value)")
                    .font(Tokens.Typography.statSmall)
                    .foregroundStyle(Tokens.Color.textPrimary)
                Text(label)
                    .font(Tokens.Typography.caption2)
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
        }
    }

    private func formatUSD(_ value: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: value)) ?? "\(Int(value))"
    }
}

#Preview {
    TripStatStrip(currentDay: 2, totalDays: 16, totalUSD: 10407, cityCount: 3, flightCount: 4)
        .padding()
        .background(Tokens.Color.bgPrimary)
        .preferredColorScheme(.dark)
}
