import SwiftUI

enum DisplayStatus {
    case active, upcoming, past

    var label: String {
        switch self {
        case .active:   return "EN CURSO"
        case .upcoming: return "FUTURO"
        case .past:     return "PASADO"
        }
    }

    var color: SwiftUI.Color {
        switch self {
        case .active:   return Tokens.Color.Status.active
        case .upcoming: return Tokens.Color.Status.upcoming
        case .past:     return Tokens.Color.Status.past
        }
    }

    var background: SwiftUI.Color {
        switch self {
        case .active:   return Tokens.Color.Status.activeBg
        case .upcoming: return Tokens.Color.Status.upcomingBg
        case .past:     return Tokens.Color.Status.pastBg
        }
    }
}

struct StatusBadge: View {
    let status: DisplayStatus

    var body: some View {
        Text(status.label)
            .font(Tokens.Typography.caption1)
            .foregroundStyle(status.color)
            .padding(.horizontal, Tokens.Spacing.sm)
            .padding(.vertical, 3)
            .background(status.background)
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.sm))
    }
}

#Preview {
    HStack(spacing: 8) {
        StatusBadge(status: .active)
        StatusBadge(status: .upcoming)
        StatusBadge(status: .past)
    }
    .padding()
    .background(Tokens.Color.bgPrimary)
    .preferredColorScheme(.dark)
}
