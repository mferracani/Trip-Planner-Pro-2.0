import Foundation
import Observation

/// App-wide UI state shared across screens. Injected as environment from
/// MainTabView; any child can read/write via `@Environment(UIState.self)`.
@MainActor
@Observable
final class UIState {
    /// Whether the global AtlasTabBar is visible. Immersive detail screens
    /// (like TripDetailView) set this to false on appear.
    var tabBarVisible: Bool = true
}
