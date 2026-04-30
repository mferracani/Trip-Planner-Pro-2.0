import SwiftUI

// MARK: - AtlasTabBar
//
// Solid bottom bar inspired by Revolut/Nubank: 4 tabs flanking a centered
// elevated FAB. The FAB is the primary "create" action; its hit area is
// fully within the bar's layout height (no .offset — that breaks hits).
// Uses ButtonStyle for press feedback rather than simultaneousGesture,
// which can steal taps in iOS when combined with Button actions.

struct AtlasTab: Identifiable, Hashable {
    let id: String
    let title: String
    let icon: String
    let iconActive: String
}

struct AtlasTabBar: View {
    @Binding var selection: Int
    let tabs: [AtlasTab]
    let onFABTap: () -> Void

    var body: some View {
        ZStack(alignment: .top) {
            // Bar sits 28pt below top — leaves room for the FAB half that
            // extends upward. Entire AtlasTabBar layout height is ~106pt,
            // all fully interactive.
            barBody
                .padding(.top, 28)

            // FAB at the top, centered — its vertical center aligns with
            // the bar's top edge (which is at y = 28).
            fabButton
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: Tabs bar

    private var barBody: some View {
        HStack(spacing: 0) {
            if tabs.count >= 5 {
                tabButton(at: 0)
                tabButton(at: 1)
                Spacer().frame(width: 72) // FAB cutout
                tabButton(at: 2)
                tabButton(at: 3)
                tabButton(at: 4)
            } else if tabs.count >= 4 {
                tabButton(at: 0)
                tabButton(at: 1)
                Spacer().frame(width: 72) // FAB cutout
                tabButton(at: 2)
                tabButton(at: 3)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 58)
        .padding(.bottom, 4)
        .background(
            Rectangle()
                .fill(Tokens.Color.surface)
                .overlay(
                    VStack(spacing: 0) {
                        Rectangle()
                            .fill(Tokens.Color.borderSoft)
                            .frame(height: 0.5)
                        Spacer()
                    }
                )
                .ignoresSafeArea(edges: .bottom)
                .shadow(color: .black.opacity(0.3), radius: 14, x: 0, y: -2)
        )
    }

    @ViewBuilder
    private func tabButton(at idx: Int) -> some View {
        let tab = tabs[idx]
        Button {
            let h = UIImpactFeedbackGenerator(style: .soft)
            h.impactOccurred()
            withAnimation(Tokens.Motion.snap) {
                selection = idx
            }
        } label: {
            AtlasTabLabel(tab: tab, isActive: selection == idx)
        }
        .buttonStyle(AtlasTabButtonStyle())
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
                Circle()
                    .fill(Tokens.Color.accentPurpleDeep)
                    .frame(width: 62, height: 62)
                    .blur(radius: 14)
                    .opacity(0.55)

                Circle()
                    .fill(
                        LinearGradient(
                            colors: [
                                Tokens.Color.accentPurple,
                                Tokens.Color.accentPurpleDeep
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
            .frame(width: 62, height: 62)
            .contentShape(Circle())
        }
        .buttonStyle(AtlasFABButtonStyle())
    }
}

// MARK: - AtlasTabLabel

private struct AtlasTabLabel: View {
    let tab: AtlasTab
    let isActive: Bool

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: isActive ? tab.iconActive : tab.icon)
                .font(.system(size: 20, weight: isActive ? .semibold : .regular))
                .foregroundStyle(
                    isActive
                        ? Tokens.Color.textPrimary
                        : Tokens.Color.textQuaternary
                )
                .symbolRenderingMode(.hierarchical)
                .frame(height: 22)

            Text(tab.title)
                .font(.system(size: 10, weight: .medium))
                .tracking(0.2)
                .foregroundStyle(
                    isActive
                        ? Tokens.Color.textPrimary
                        : Tokens.Color.textQuaternary
                )

            Circle()
                .fill(isActive ? Tokens.Color.accentBlue : .clear)
                .frame(width: 3, height: 3)
        }
        .contentShape(Rectangle())
    }
}

// MARK: - Button styles

private struct AtlasTabButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.92 : 1.0)
            .animation(Tokens.Motion.snap, value: configuration.isPressed)
    }
}

private struct AtlasFABButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.9 : 1.0)
            .shadow(
                color: Tokens.Color.accentPurpleDeep.opacity(0.5),
                radius: configuration.isPressed ? 8 : 16,
                x: 0,
                y: configuration.isPressed ? 4 : 8
            )
            .animation(Tokens.Motion.snap, value: configuration.isPressed)
    }
}

// MARK: - Visibility preference

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

// MARK: - FAB context

/// Shared observable that lets any child view override the global FAB action.
/// Inject via `.environment(fabContext)` in MainTabView.
/// Child views read it with `@Environment(FABContext.self)` and set/clear
/// `overrideAction` in `.onAppear` / `.onDisappear`.
@Observable
final class FABContext {
    var overrideAction: (() -> Void)? = nil
}

// MARK: - Atlas tab set

extension AtlasTab {
    static let home = AtlasTab(id: "home", title: "Inicio", icon: "house", iconActive: "house.fill")
    static let trips = AtlasTab(id: "trips", title: "Viajes", icon: "paperplane", iconActive: "paperplane.fill")
    static let catalog = AtlasTab(id: "catalog", title: "Catálogo", icon: "square.stack", iconActive: "square.stack.fill")
    static let mundo = AtlasTab(id: "mundo", title: "Mundo", icon: "globe.americas", iconActive: "globe.americas.fill")
    static let settings = AtlasTab(id: "settings", title: "Perfil", icon: "person", iconActive: "person.fill")

    static let mainTabs: [AtlasTab] = [.home, .trips, .catalog, .settings]
}
