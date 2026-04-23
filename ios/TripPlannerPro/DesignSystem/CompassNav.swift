import SwiftUI

// MARK: - CompassNav
//
// Atlas OS bottom navigation — a floating pill that replaces the stock iOS
// tab bar. The active tab expands to show a UPPERCASE mono label on an amber
// capsule; inactive tabs collapse to just an icon. Selection slides between
// tabs via matchedGeometryEffect + spring animation. Haptic on tap.
//
// Intentionally ignores SF Symbols conventions — this is the navigation a
// Revolut or Linear would ship, not what Apple's HIG prescribes.

struct CompassTab: Identifiable, Hashable {
    let id: String
    let title: String
    let icon: String
}

struct CompassNav: View {
    @Binding var selection: Int
    let tabs: [CompassTab]

    @Namespace private var indicator

    var body: some View {
        HStack(spacing: 4) {
            ForEach(Array(tabs.enumerated()), id: \.offset) { idx, tab in
                CompassNavButton(
                    tab: tab,
                    isSelected: selection == idx,
                    indicatorNamespace: indicator
                ) {
                    let h = UIImpactFeedbackGenerator(style: .soft)
                    h.impactOccurred()
                    withAnimation(Tokens.Motion.spring) {
                        selection = idx
                    }
                }
            }
        }
        .padding(5)
        .background(
            Capsule()
                .fill(Tokens.Color.elevated)
                .overlay(
                    Capsule()
                        .strokeBorder(
                            LinearGradient(
                                colors: [
                                    Tokens.Color.textPrimary.opacity(0.08),
                                    Tokens.Color.textPrimary.opacity(0.02)
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            ),
                            lineWidth: 0.5
                        )
                )
                .shadow(color: .black.opacity(0.45), radius: 28, x: 0, y: 14)
                .shadow(color: .black.opacity(0.35), radius: 8, x: 0, y: 4)
        )
        .padding(.horizontal, 20)
    }
}

// MARK: - CompassNavButton

private struct CompassNavButton: View {
    let tab: CompassTab
    let isSelected: Bool
    let indicatorNamespace: Namespace.ID
    let action: () -> Void

    @State private var pressed = false

    var body: some View {
        Button(action: action) {
            ZStack {
                if isSelected {
                    Capsule()
                        .fill(Tokens.Color.accentBlue)
                        .matchedGeometryEffect(id: "compass_active", in: indicatorNamespace)
                        .shadow(color: Tokens.Color.accentBlue.opacity(0.35), radius: 10, x: 0, y: 4)
                }

                HStack(spacing: 7) {
                    Image(systemName: tab.icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(
                            isSelected
                                ? Tokens.Color.bgPrimary
                                : Tokens.Color.textSecondary.opacity(0.75)
                        )
                        .scaleEffect(isSelected ? 1.0 : 0.95)

                    if isSelected {
                        Text(tab.title.uppercased())
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .tracking(Tokens.Track.labelWider)
                            .foregroundStyle(Tokens.Color.bgPrimary)
                            .fixedSize(horizontal: true, vertical: false)
                            .transition(
                                .asymmetric(
                                    insertion: .opacity.combined(with: .scale(scale: 0.8, anchor: .leading)),
                                    removal: .opacity
                                )
                            )
                    }
                }
                .padding(.horizontal, isSelected ? 16 : 12)
            }
            .frame(height: 42)
            .frame(maxWidth: isSelected ? .infinity : nil)
            .scaleEffect(pressed ? 0.94 : 1.0)
            .animation(Tokens.Motion.snap, value: pressed)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in pressed = true }
                .onEnded { _ in pressed = false }
        )
    }
}

// MARK: - Atlas icon set
//
// Consistent icon choices for the 3 app tabs. Kept as SF Symbols for now
// (Phase 2 will swap for custom monoline set).
extension CompassTab {
    static let trips = CompassTab(id: "trips", title: "Viajes", icon: "paperplane.fill")
    static let catalog = CompassTab(id: "catalog", title: "Items", icon: "square.stack.3d.up.fill")
    static let settings = CompassTab(id: "settings", title: "Tú", icon: "circle.grid.2x2.fill")

    static let mainTabs: [CompassTab] = [.trips, .catalog, .settings]
}
