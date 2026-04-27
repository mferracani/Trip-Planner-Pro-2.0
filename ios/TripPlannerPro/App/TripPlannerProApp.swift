import FirebaseCore
import SwiftData
import SwiftUI

@main
struct TripPlannerProApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    private let modelContainer: ModelContainer = {
        let schema = Schema([CachedTrip.self, CachedTripItems.self])
        // Versioned store name — bump when schema changes to avoid migration errors.
        let config = ModelConfiguration("TripPlannerCache_v3", schema: schema)
        do {
            return try ModelContainer(for: schema, configurations: config)
        } catch {
            // Fall back to in-memory so the app still launches if the disk
            // store is corrupted / incompatible.
            let mem = ModelConfiguration("TripPlannerCacheMem", schema: schema, isStoredInMemoryOnly: true)
            return try! ModelContainer(for: schema, configurations: mem)
        }
    }()

    var body: some Scene {
        WindowGroup {
            AppRoot()
                .preferredColorScheme(.dark)
                .tint(Tokens.Color.accentBlue)
                .background(Tokens.Color.bgPrimary.ignoresSafeArea())
                .modelContainer(modelContainer)
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()
        return true
    }
}
