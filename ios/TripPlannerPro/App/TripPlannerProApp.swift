import FirebaseCore
import FirebaseFirestore
import FirebaseMessaging
import SwiftData
import SwiftUI
import UserNotifications

@main
struct TripPlannerProApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    private let modelContainer: ModelContainer = {
        let schema = Schema([
            CachedTrip.self,
            CachedTripItems.self,
            CachedCatalogSnapshot.self,
            CachedPendingOperation.self,
        ])
        let config = ModelConfiguration("TripPlannerCache_v5", schema: schema)
        do {
            return try ModelContainer(for: schema, configurations: config)
        } catch {
            let mem = ModelConfiguration("TripPlannerCacheMem_v5", schema: schema, isStoredInMemoryOnly: true)
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
                .environment(NetworkMonitor.shared)
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()

        // Push notifications setup
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self

        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }

        return true
    }

    // Called after APNs registration — pass token to Firebase Messaging
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {
    // Show notification while app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }
}

// MARK: - MessagingDelegate

extension AppDelegate: MessagingDelegate {
    // Called whenever FCM token is refreshed — save to Firestore
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        FCMTokenManager.shared.saveToken(token)
    }
}
