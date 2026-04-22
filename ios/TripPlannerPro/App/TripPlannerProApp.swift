import SwiftUI
import FirebaseCore

@main
struct TripPlannerProApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            AppRoot()
                .preferredColorScheme(.dark)
                .tint(Tokens.Color.accentBlue)
                .background(Tokens.Color.bgPrimary.ignoresSafeArea())
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
