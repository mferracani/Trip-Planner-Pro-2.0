import SwiftUI

// MARK: - Card surface

struct DSCard: ViewModifier {
    var elevated: Bool = false
    var radius: CGFloat = Tokens.Radius.lg

    func body(content: Content) -> some View {
        content
            .background(elevated ? Tokens.Color.elevated : Tokens.Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: radius))
    }
}

// MARK: - Pill chip

struct DSPill: ViewModifier {
    var color: SwiftUI.Color
    var filled: Bool = false

    func body(content: Content) -> some View {
        content
            .font(Tokens.Typography.caption1)
            .padding(.horizontal, Tokens.Spacing.sm)
            .padding(.vertical, Tokens.Spacing.xs)
            .background(filled ? color : color.opacity(0.15))
            .foregroundStyle(filled ? Tokens.Color.bgPrimary : color)
            .clipShape(Capsule())
    }
}

// MARK: - Floating shadow

struct DSFloatingShadow: ViewModifier {
    func body(content: Content) -> some View {
        content
            .shadow(
                color: Tokens.Shadow.color,
                radius: Tokens.Shadow.radius,
                x: Tokens.Shadow.x,
                y: Tokens.Shadow.y
            )
    }
}

// MARK: - View extensions

extension View {
    func dsCard(elevated: Bool = false, radius: CGFloat = Tokens.Radius.lg) -> some View {
        modifier(DSCard(elevated: elevated, radius: radius))
    }

    func dsPill(color: SwiftUI.Color, filled: Bool = false) -> some View {
        modifier(DSPill(color: color, filled: filled))
    }

    func dsFloatingShadow() -> some View {
        modifier(DSFloatingShadow())
    }

    func itemCard(color: SwiftUI.Color) -> some View {
        self
            .padding(Tokens.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(color)
                            .frame(width: 3)
                    }
            )
    }
}
