import AuthenticationServices
import FirebaseAuth
import Foundation
import Observation

struct AuthUser: Equatable, Sendable {
    let uid: String
    let displayName: String?
    let email: String?
}

enum AuthState: Equatable {
    case loading
    case signedOut
    case signedIn(AuthUser)
}

@MainActor
@Observable
final class AuthManager {
    private(set) var state: AuthState = .loading
    private var handle: AuthStateDidChangeListenerHandle?

    init() {
        handle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            Task { @MainActor in
                guard let self else { return }
                if let user {
                    self.state = .signedIn(AuthUser(
                        uid: user.uid,
                        displayName: user.displayName,
                        email: user.email
                    ))
                } else {
                    self.state = .signedOut
                }
            }
        }
    }

    deinit {
        if let handle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }

    func signInWithApple(credential: ASAuthorizationAppleIDCredential, rawNonce: String) async throws {
        guard let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8) else {
            throw AuthError.missingIdentityToken
        }

        let firebaseCredential = OAuthProvider.appleCredential(
            withIDToken: idToken,
            rawNonce: rawNonce,
            fullName: credential.fullName
        )
        _ = try await Auth.auth().signIn(with: firebaseCredential)
    }

    func signOut() throws {
        try Auth.auth().signOut()
    }
}

enum AuthError: Error {
    case missingIdentityToken
}
