import SwiftUI

enum ItemCategory {
    case flight, hotel, transit

    var icon: String {
        switch self {
        case .flight:  return "✈️"
        case .hotel:   return "🛑"
        case .transit: return "🚂"
        }
    }

    var color: SwiftUI.Color {
        switch self {
        case .flight:  return Tokens.Color.Category.flight
        case .hotel:   return Tokens.Color.Category.hotel
        case .transit: return Tokens.Color.Category.transit
        }
    }
}

struct ItemBadge: View {
    let category: ItemCategory
    let text: String

    var body: some View {
        HStack(spacing: 2) {
            Text(category.icon)
                .font(.system(size: 8))
            Text(text)
                .font(Tokens.Typography.cellBadge)
                .lineLimit(1)
        }
        .foregroundStyle(category.color)
        .padding(.horizontal, 3)
        .padding(.vertical, 1)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.xs)
                .fill(category.color.opacity(0.18))
        )
    }
}

#Preview {
    VStack(alignment: .leading, spacing: 4) {
        ItemBadge(category: .flight,  text: "21:35")
        ItemBadge(category: .hotel,   text: "NH")
        ItemBadge(category: .transit, text: "09:40")
    }
    .padding()
    .background(Tokens.Color.bgPrimary)
    .preferredColorScheme(.dark)
}
