import SwiftUI

struct TripHeroCard: View {
    let tripName: String
    let subtitle: String
    let status: DisplayStatus
    var onTap: (() -> Void)? = nil

    var body: some View {
        Button(action: { onTap?() }) {
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: Tokens.Radius.xl)
                    .fill(Tokens.Gradient.heroOverlay)
                    .frame(height: 160)
                    .overlay(
                        Image(systemName: "airplane")
                            .font(.system(size: 80, weight: .ultraLight))
                            .foregroundStyle(SwiftUI.Color.white.opacity(0.06))
                            .padding(Tokens.Spacing.lg),
                        alignment: .bottomTrailing
                    )
                    .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.xl))

                VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
                    StatusBadge(status: status)
                    Text(tripName)
                        .font(Tokens.Typography.title1)
                        .foregroundStyle(Tokens.Color.textPrimary)
                    Text(subtitle)
                        .font(Tokens.Typography.subheadline)
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
                .padding(Tokens.Spacing.base)

                Image(systemName: "arrow.up.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textSecondary)
                    .frame(width: 32, height: 32)
                    .background(Tokens.Color.elevated)
                    .clipShape(Circle())
                    .padding(Tokens.Spacing.md)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
            }
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    TripHeroCard(tripName: "Mallorca", subtitle: "Día 2", status: .active)
        .padding()
        .background(Tokens.Color.bgPrimary)
        .preferredColorScheme(.dark)
}
