import AuthenticationServices
import SwiftUI

struct SignInView: View {
    @Environment(AuthManager.self) private var auth
    @State private var currentNonce: String?
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        ZStack {
            Tokens.Color.bgPrimary.ignoresSafeArea()

            VStack(spacing: Tokens.Spacing.xl) {
                Spacer()

                VStack(spacing: Tokens.Spacing.md) {
                    Image(systemName: "airplane")
                        .font(.system(size: 48, weight: .light))
                        .foregroundStyle(Tokens.Color.accentBlue)

                    Text("Trip Planner Pro")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textPrimary)

                    Text("Planificá tus viajes con IA")
                        .font(.system(size: 15))
                        .foregroundStyle(Tokens.Color.textSecondary)
                }

                Spacer()

                VStack(spacing: Tokens.Spacing.md) {
                    SignInWithAppleButton(
                        .signIn,
                        onRequest: configureRequest,
                        onCompletion: handleCompletion
                    )
                    .signInWithAppleButtonStyle(.white)
                    .frame(height: 52)
                    .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
                    .disabled(isLoading)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 13))
                            .foregroundStyle(Tokens.Color.accentRed)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, Tokens.Spacing.lg)
                .padding(.bottom, Tokens.Spacing.xl)
            }
        }
    }

    private func configureRequest(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = AppleSignInHelper.randomNonceString()
        currentNonce = nonce
        request.requestedScopes = [.fullName, .email]
        request.nonce = AppleSignInHelper.sha256(nonce)
    }

    private func handleCompletion(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let nonce = currentNonce else {
                errorMessage = "No se pudo completar el inicio de sesión."
                return
            }
            isLoading = true
            errorMessage = nil
            Task {
                do {
                    try await auth.signInWithApple(credential: credential, rawNonce: nonce)
                } catch {
                    errorMessage = error.localizedDescription
                }
                isLoading = false
            }
        case .failure(let error):
            if (error as NSError).code == ASAuthorizationError.canceled.rawValue {
                return
            }
            errorMessage = error.localizedDescription
        }
    }
}
