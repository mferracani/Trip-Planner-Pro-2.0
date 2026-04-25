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

            // Atmospheric glow from bottom
            LinearGradient(
                colors: [
                    Tokens.Color.accentBlue.opacity(0.08),
                    .clear
                ],
                startPoint: .bottom,
                endPoint: .center
            )
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 0) {
                // Header: brand mark
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 10) {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [Tokens.Color.accentPurple, Tokens.Color.accentBlue],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 10, height: 10)

                        MonoLabel(
                            text: "Trip Planner Pro",
                            color: Tokens.Color.textSecondary,
                            size: .s
                        )
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Tu próximo viaje,\nsin tipear.")
                            .font(Tokens.Typo.displayXL)
                            .tracking(Tokens.Track.displayTight)
                            .foregroundStyle(Tokens.Color.textPrimary)
                            .lineLimit(3)

                        Text("Pegá el mail, subí el PDF o contá en chat.\nLa IA arma tu itinerario.")
                            .font(Tokens.Typo.bodyL)
                            .foregroundStyle(Tokens.Color.textSecondary)
                            .lineSpacing(2)
                    }
                }
                .padding(.top, 60)

                Spacer()

                // Feature bullets — editorial horizontal list
                VStack(alignment: .leading, spacing: 14) {
                    MonoLabel(
                        text: "Cómo funciona",
                        color: Tokens.Color.textTertiary,
                        size: .xs
                    )
                    VStack(spacing: 10) {
                        FeatureRow(
                            icon: "text.bubble",
                            iconColor: Tokens.Color.accentBlue,
                            title: "Chat natural",
                            caption: "Pegá el mail de Iberia, listo."
                        )
                        FeatureRow(
                            icon: "doc.viewfinder",
                            iconColor: Tokens.Color.accentOrange,
                            title: "PDF o captura",
                            caption: "Booking, Airbnb, Renfe — lo parsea."
                        )
                        FeatureRow(
                            icon: "sparkles",
                            iconColor: Tokens.Color.accentPurple,
                            title: "Itinerario armado",
                            caption: "Calendario con ciudades y vuelos."
                        )
                    }
                }

                Spacer().frame(height: 28)

                // Auth
                VStack(spacing: 12) {
                    SignInWithAppleButton(
                        .signIn,
                        onRequest: configureRequest,
                        onCompletion: handleCompletion
                    )
                    .signInWithAppleButtonStyle(.white)
                    .frame(height: 54)
                    .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.lg))
                    .disabled(isLoading)
                    .opacity(isLoading ? 0.5 : 1)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(Tokens.Typo.bodyS)
                            .foregroundStyle(Tokens.Color.accentRed)
                            .multilineTextAlignment(.center)
                            .padding(.top, 4)
                    } else {
                        MonoLabel(
                            text: "Privado · sincronización iCloud",
                            color: Tokens.Color.textTertiary,
                            size: .xs
                        )
                        .padding(.top, 4)
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
        .preferredColorScheme(.dark)
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

// MARK: - FeatureRow

private struct FeatureRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let caption: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(iconColor)
                .frame(width: 36, height: 36)
                .background(
                    Circle()
                        .fill(iconColor.opacity(0.14))
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Tokens.Typo.strongM)
                    .foregroundStyle(Tokens.Color.textPrimary)
                Text(caption)
                    .font(Tokens.Typo.bodyS)
                    .foregroundStyle(Tokens.Color.textSecondary)
            }

            Spacer(minLength: 0)
        }
    }
}
