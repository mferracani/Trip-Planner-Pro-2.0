import SwiftUI

struct CityLegendItem {
    let name: String
    let color: SwiftUI.Color
    let flag: String?
}

struct CityLegend: View {
    let cities: [CityLegendItem]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Tokens.Spacing.md) {
                ForEach(cities.indices, id: \.self) { idx in
                    HStack(spacing: Tokens.Spacing.xs) {
                        Circle()
                            .fill(cities[idx].color)
                            .frame(width: 8, height: 8)
                        if let flag = cities[idx].flag {
                            Text(flag).font(.system(size: 12))
                        }
                        Text(cities[idx].name)
                            .font(Tokens.Typography.caption1)
                            .foregroundStyle(Tokens.Color.textSecondary)
                    }
                }
            }
            .padding(.horizontal, Tokens.Spacing.base)
        }
    }
}

#Preview {
    CityLegend(cities: [
        .init(name: "Palma",   color: Tokens.Color.cityPalette[0], flag: "🇪🇸"),
        .init(name: "Sóller",  color: Tokens.Color.cityPalette[1], flag: "🇪🇸"),
        .init(name: "Alcúdia", color: Tokens.Color.cityPalette[4], flag: "🇪🇸"),
    ])
    .padding(.vertical)
    .background(Tokens.Color.bgPrimary)
    .preferredColorScheme(.dark)
}
