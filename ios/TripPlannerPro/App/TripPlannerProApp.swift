import FirebaseCore
import SwiftData
import SwiftUI

@main
struct TripPlannerProApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    private let modelContainer: ModelContainer = {
        let schema = Schema([CachedTrip.self, CachedFlight.self, CachedHotel.self, CachedTransport.self])
        let config = ModelConfiguration("TripPlannerCache", schema: schema)
        return try! ModelContainer(for: schema, configurations: config)
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
