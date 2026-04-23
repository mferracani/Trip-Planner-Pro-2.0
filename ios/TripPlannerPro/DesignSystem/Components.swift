import SwiftUI

// MARK: - MonoLabel
//
// UPPERCASE + SF Mono + wide tracking. The signature "technical metadata" look
// used everywhere in the app (PRÓXIMO, RESUMEN 2026, MIS VIAJES, etc.).
struct MonoLabel: View {
    let text: String
    var color: Color = Tokens.Color.textTertiary
    var size: MonoSize = .s

    enum MonoSize {
        case xs, s, m

        var font: Font {
            switch self {
            case .xs: return Tokens.Typo.monoXS
            case .s:  return Tokens.Typo.monoS
            case .m:  return Tokens.Typo.monoM
            }
        }

        var tracking: CGFloat {
            switch self {
            case .xs: return Tokens.Track.labelWidest
            case .s:  return Tokens.Track.labelWider
            case .m:  return Tokens.Track.labelWide
            }
        }
    }

    var body: some View {
        Text(text.uppercased())
            .font(size.font)
            .tracking(size.tracking)
            .foregroundStyle(color)
    }
}

// MARK: - StatusDot
struct StatusDot: View {
    let text: String
    let color: Color

    var body: some View {
        HStack(spacing: 7) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.3))
                    .frame(width: 14, height: 14)
                Circle()
                    .fill(color)
                    .frame(width: 6, height: 6)
            }
            MonoLabel(text: text, color: color, size: .xs)
        }
    }
}

// MARK: - SectionHeader
struct SectionHeader: View {
    let title: String
    var trailing: String? = nil
    var onTrailingTap: (() -> Void)? = nil

    var body: some View {
        HStack {
            MonoLabel(text: title, color: Tokens.Color.textSecondary, size: .s)
            Spacer()
            if let trailing {
                Button {
                    onTrailingTap?()
                } label: {
                    Text(trailing)
                        .font(Tokens.Typo.strongS)
                        .foregroundStyle(Tokens.Color.accentBlue)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// MARK: - Hairline
//
// 0.5px subtle divider — the building block of the "architectural" feel.
struct Hairline: View {
    var color: Color = Tokens.Color.borderSoft
    var vertical: Bool = false

    var body: some View {
        Rectangle()
            .fill(color)
            .frame(
                width: vertical ? 0.5 : nil,
                height: vertical ? nil : 0.5
            )
    }
}

// MARK: - MonoNumber
//
// Day numbers, codes, seats — tabular mono with leading zero when size demands.
struct MonoNumber: View {
    let value: Int
    var size: CGFloat = 13
    var color: Color = Tokens.Color.textPrimary
    var padded: Bool = false

    private var text: String {
        padded && value < 10 ? "0\(value)" : "\(value)"
    }

    var body: some View {
        Text(text)
            .font(.system(size: size, weight: .semibold, design: .monospaced))
            .tracking(-0.3)
            .foregroundStyle(color)
            .monospacedDigit()
    }
}

// MARK: - StatCard
struct StatCard: View {
    let value: String
    let label: String
    var accent: Color = Tokens.Color.textPrimary

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(value)
                .font(.system(size: 34, weight: .bold))
                .tracking(Tokens.Track.displayTight)
                .foregroundStyle(accent)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            MonoLabel(text: label, color: Tokens.Color.textTertiary, size: .xs)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
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

// MARK: - FilterPill
struct FilterPill: View {
    let text: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(text)
                .font(Tokens.Typo.strongS)
                .foregroundStyle(isActive ? .black : Tokens.Color.textSecondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(
                    Capsule()
                        .fill(isActive ? Tokens.Color.textPrimary : Tokens.Color.surface)
                        .overlay(
                            Capsule()
                                .strokeBorder(
                                    isActive ? .clear : Tokens.Color.borderSoft,
                                    lineWidth: 0.5
                                )
                        )
                )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - CityCover
//
// The hero cover — color block + diagonal airplane art + vignette + label.
// Replaces the flat gradient with an editorial composition.
struct CityCover: View {
    let color: Color
    var label: String? = nil
    var height: CGFloat = 180
    var cornerRadius: CGFloat = 0

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Base gradient
            LinearGradient(
                colors: [
                    color,
                    color.opacity(0.75),
                    color.opacity(0.55)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: height)

            // Diagonal airplane "art" — huge, very low opacity
            Image(systemName: "airplane")
                .font(.system(size: height * 0.9, weight: .light))
                .foregroundStyle(.white.opacity(0.10))
                .rotationEffect(.degrees(-18))
                .offset(x: 40, y: -20)
                .clipped()

            // Subtle horizontal noise bands (faux grain via crossing gradients)
            LinearGradient(
                colors: [
                    .white.opacity(0.04),
                    .clear,
                    .black.opacity(0.08),
                    .clear,
                    .white.opacity(0.03)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: height)
            .blendMode(.overlay)

            // Bottom vignette for text legibility
            LinearGradient(
                colors: [
                    .clear,
                    .black.opacity(0.0),
                    .black.opacity(0.45)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: height)

            // Top-right watermark (mono track)
            VStack {
                HStack {
                    Spacer()
                    MonoLabel(
                        text: "Cover · Trip Planner",
                        color: .white.opacity(0.35),
                        size: .xs
                    )
                }
                Spacer()
            }
            .padding(14)
            .frame(height: height)

            // Bottom label
            if let label {
                Text(label.uppercased())
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .tracking(Tokens.Track.labelWidest)
                    .foregroundStyle(.white.opacity(0.85))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)
            }
        }
        .frame(height: height)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
    }
}

// MARK: - AtmosphericBackground
//
// Base layer for screens — flat black with a radial accent glow.
// Lifts the whole surface out of the "generic app template" feel.
struct AtmosphericBackground: View {
    var accent: Color = Tokens.Color.accentBlue
    var intensity: Double = 0.09

    var body: some View {
        ZStack {
            Tokens.Color.bgPrimary

            // Upper-right accent glow
            RadialGradient(
                colors: [accent.opacity(intensity), .clear],
                center: .topTrailing,
                startRadius: 0,
                endRadius: 420
            )

            // Lower-left accent glow (opposite)
            RadialGradient(
                colors: [accent.opacity(intensity * 0.6), .clear],
                center: .bottomLeading,
                startRadius: 0,
                endRadius: 380
            )

            // Soft vignette at edges
            RadialGradient(
                colors: [.clear, .black.opacity(0.35)],
                center: .center,
                startRadius: 280,
                endRadius: 700
            )
        }
        .ignoresSafeArea()
    }
}

// MARK: - PillButton
struct PillButton: View {
    let text: String
    var systemImage: String? = nil
    var style: Style = .primary
    let action: () -> Void

    enum Style { case primary, subtle }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(text)
                    .font(Tokens.Typo.strongS)
                if let systemImage {
                    Image(systemName: systemImage)
                        .font(.system(size: 11, weight: .semibold))
                }
            }
            .foregroundStyle(style == .primary ? .white : Tokens.Color.textPrimary)
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(
                Capsule()
                    .fill(style == .primary ? Tokens.Color.accentBlue : Tokens.Color.elevated)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - SparklesFAB
struct SparklesFAB: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "sparkles")
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 58, height: 58)
                .background(
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Tokens.Color.accentPurple, Tokens.Color.accentPurpleDeep],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
                .shadow(color: Tokens.Color.accentPurple.opacity(0.45), radius: 14, x: 0, y: 12)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - AvatarButton
struct AvatarButton: View {
    let initial: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(Tokens.Color.elevated)
                    .overlay(
                        Circle()
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
                Text(initial.uppercased())
                    .font(Tokens.Typo.strongS)
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
            .frame(width: 36, height: 36)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - CircleIconButton (generic)
struct CircleIconButton: View {
    let systemImage: String
    var size: CGFloat = 36
    var iconSize: CGFloat = 14
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: iconSize, weight: .semibold))
                .foregroundStyle(Tokens.Color.textSecondary)
                .frame(width: size, height: size)
                .background(
                    Circle()
                        .fill(Tokens.Color.elevated)
                        .overlay(
                            Circle()
                                .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                        )
                )
        }
        .buttonStyle(.plain)
    }
}
