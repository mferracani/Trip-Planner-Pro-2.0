import FirebaseAuth
import FirebaseFirestore
import Foundation

/// Saves and removes the FCM device token in `users/{uid}/fcm_tokens/{token}`.
/// Called from AppDelegate whenever the token is issued or refreshed.
final class FCMTokenManager {
    static let shared = FCMTokenManager()
    private init() {}

    private let db = Firestore.firestore()

    func saveToken(_ token: String) {
        guard let uid = Auth.auth().currentUser?.uid else {
            // Auth not ready yet — retry when the user signs in.
            NotificationCenter.default.addObserver(
                forName: .AuthStateDidChange,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                NotificationCenter.default.removeObserver(self as Any, name: .AuthStateDidChange, object: nil)
                self?.saveToken(token)
            }
            return
        }
        let doc = db.collection("users/\(uid)/fcm_tokens").document(token)
        doc.setData([
            "token": token,
            "platform": "ios",
            "created_at": FieldValue.serverTimestamp(),
        ], merge: true)
    }

    func deleteToken(_ token: String) {
        guard let uid = Auth.auth().currentUser?.uid else { return }
        db.collection("users/\(uid)/fcm_tokens").document(token).delete()
    }
}

private extension Notification.Name {
    static let AuthStateDidChange = Notification.Name("FIRAuthStateDidChangeNotification")
}
