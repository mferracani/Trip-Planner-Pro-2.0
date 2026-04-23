import SwiftUI

// MARK: - AtlasTabBar
//
// Solid bottom bar inspired by Revolut/Nubank: 4 tabs flanking a centered
// elevated FAB. The FAB is the primary "create" action; it overlaps the bar
// by 18pt with a violet glow. Tabs use icon (outlined→filled) + lowercase
// sans label. No uppercase mono here — that tone is reserved for metadata.

struct AtlasTab: Identifiable, Hashable {
    let id: String
    let title: String
    /// SF Symbol shown when inactive.
    let icon: String
    /// SF Symbol shown when active. Usually the `.fill` variant.
    let iconActive: String
}

struct AtlasTabBar: View {
    @Binding var selection: Int
    /// Exactly 4 tabs expected (2 before FAB, 2 after).
    let tabs: [AtlasTab]
    let onFABTap: () -> Void

    @State private var fabPressed = false

    var body: some View {
        ZStack(alignment: .top) {
            barBody
            fabButton
                .offset(y: -22)
        }
    }

    // MARK: Tabs bar

    private var barBody: some View {
        HStack(spacing: 0) {
            if tabs.count >= 4 {
                tabButton(at: 0)
                tabButton(at: 1)
                Spacer().frame(width: 72) // FAB cutout
                tabButton(at: 2)
                tabButton(at: 3)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 58)
        .padding(.bottom, 20)
        .background(
            Rectangle()
                .fill(Tokens.Color.surface)
                .overlay(
                    // Top hairline for a clean separation from content
                    VStack(spacing: 0) {
                        Rectangle()
                            .fill(Tokens.Color.borderSoft)
                            .frame(height: 0.5)
                        Spacer()
                    }
                )
                .ignoresSafeArea(edges: .bottom)
                .shadow(color: .black.opacity(0.35), radius: 14, x: 0, y: -2)
        )
    }

    @ViewBuilder
    private func tabButton(at idx: Int) -> some View {
        let tab = tabs[idx]
        AtlasTabButton(tab: tab, isActive: selection == idx) {
            let h = UIImpactFeedbackGenerator(style: .soft)
            h.impactOccurred()
            withAnimation(Tokens.Motion.snap) {
                selection = idx
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: FAB

    private var fabButton: some View {
        Button {
            let h = UIImpactFeedbackGenerator(style: .medium)
            h.impactOccurred()
            onFABTap()
        } label: {
            ZStack {
                // Outer glow halo
                Circle()
                    .fill(Tokens.Color.accentPurpleDeep)
                    .frame(width: 62, height: 62)
                    .blur(radius: 14)
                    .opacity(0.55)

                // Main disk
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(hex: 0xB19CD9),
                                Color(hex: 0x8C74BA)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 56, height: 56)
                    .overlay(
                        Circle()
                            .strokeBorder(Color.white.opacity(0.18), lineWidth: 0.8)
                    )

                // Subtle inner highlight
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [Color.white.opacity(0.35), .clear],
                            startPoint: .top,
                            endPoint: .center
                        ),
                        lineWidth: 1
                    )
                    .frame(width: 56, height: 56)

                Image(systemName: "plus")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .scaleEffect(fabPressed ? 0.92 : 1.0)
            .shadow(color: Color(hex: 0x8C74BA).opacity(0.45), radius: 16, x: 0, y: 8)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    withAnimation(Tokens.Motion.snap) { fabPressed = true }
                }
                .onEnded { _ in
                    withAnimation(Tokens.Motion.snap) { fabPressed = false }
                }
        )
    }
}

// MARK: - AtlasTabButton

private struct AtlasTabButton: View {
    let tab: AtlasTab
    let isActive: Bool
    let action: () -> Void

    @State private var pressed = false

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                ZStack {
                    Image(systemName: isActive ? tab.iconActive : tab.icon)
                        .font(.system(size: 20, weight: isActive ? .semibold : .regular))
                        .foregroundStyle(
                            isActive
                                ? Tokens.Color.textPrimary
                                : Tokens.Color.textQuaternary
                        )
                        .symbolRenderingMode(.hierarchical)
                        .contentTransition(.symbolEffect(.replace))
                }
                .frame(height: 22)

                Text(tab.title)
                    .font(.system(size: 10, weight: .medium))
                    .tracking(0.2)
                    .foregroundStyle(
                        isActive
                            ? Tokens.Color.textPrimary
                            : Tokens.Color.textQuaternary
                    )

                // Active dot indicator under the label
                Circle()
                    .fill(
                        isActive ? Tokens.Color.accentBlue : .clear
                    )
                    .frame(width: 3, height: 3)
                    .offset(y: -1)
            }
            .scaleEffect(pressed ? 0.92 : 1.0)
            .animation(Tokens.Motion.snap, value: pressed)
            .animation(Tokens.Motion.snap, value: isActive)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in pressed = true }
                .onEnded { _ in pressed = false }
        )
    }
}

// MARK: - Visibility preference
//
// A deep screen (like TripDetailView) can call `.hideTabBar()` to slide the
// global tab bar away. Standard pattern for immersive detail screens.

struct TabBarVisibilityKey: PreferenceKey {
    static let defaultValue: Bool = true
    static func reduce(value: inout Bool, nextValue: () -> Bool) {
        value = nextValue()
    }
}

extension View {
    /// Hide the global AtlasTabBar while this view is on screen.
    func hideTabBar(_ hidden: Bool = true) -> some View {
        preference(key: TabBarVisibilityKey.self, value: !hidden)
    }

    /// Deprecated alias kept so existing callers still compile.
    func hideCompassNav(_ hidden: Bool = true) -> some View {
        hideTabBar(hidden)
    }
}

// MARK: - Atlas tab set

extension AtlasTab {
    static let home = AtlasTab(id: "home", title: "Inicio", icon: "house", iconActive: "house.fill")
    static let trips = AtlasTab(id: "trips", title: "Viajes", icon: "paperplane", iconActive: "paperplane.fill")
    static let catalog = AtlasTab(id: "catalog", title: "Catálogo", icon: "square.stack", iconActive: "square.stack.fill")
    static let settings = AtlasTab(id: "settings", title: "Perfil", icon: "person", iconActive: "person.fill")

    static let mainTabs: [AtlasTab] = [.home, .trips, .catalog, .settings]
}
