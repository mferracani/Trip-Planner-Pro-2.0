import SwiftUI

struct SettingsView: View {
    @Environment(AuthManager.self) private var auth
    @State private var didCopyUID = false

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                List {
                    accountSection
                    aiProviderSection
                    sessionSection
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Ajustes")
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Account section

    private var accountSection: some View {
        Section("Cuenta") {
            if case .signedIn(let user) = auth.state {
                HStack(spacing: Tokens.Spacing.md) {
                    avatarView(user: user)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(user.displayName ?? user.email ?? "Sin nombre")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Tokens.Color.textPrimary)

                        if let email = user.email, user.displayName != nil {
                            Text(email)
                                .font(.system(size: 13))
                                .foregroundStyle(Tokens.Color.textSecondary)
                        }
                    }
                }
                .padding(.vertical, Tokens.Spacing.xs)

                Button {
                    UIPasteboard.general.string = user.uid
                    didCopyUID = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        didCopyUID = false
                    }
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("UID")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Tokens.Color.textTertiary)
                            Text(user.uid)
                                .font(.system(size: 11).monospaced())
                                .foregroundStyle(Tokens.Color.textSecondary)
                                .lineLimit(1)
                                .truncationMode(.middle)
                        }
                        Spacer()
                        Image(systemName: didCopyUID ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 13))
                            .foregroundStyle(didCopyUID ? Tokens.Color.accentGreen : Tokens.Color.textTertiary)
                            .animation(.easeInOut(duration: 0.2), value: didCopyUID)
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - AI provider section

    private var aiProviderSection: some View {
        Section("IA") {
            AIProviderPicker()
        }
    }

    // MARK: - Session section

    private var sessionSection: some View {
        Section("Sesión") {
            Button(role: .destructive) {
                try? auth.signOut()
            } label: {
                Text("Cerrar sesión")
            }
        }
    }

    // MARK: - Avatar

    private func avatarView(user: AuthUser) -> some View {
        let initial = user.displayName?.first.map(String.init)
            ?? user.email?.first.map(String.init)
            ?? "?"

        return ZStack {
            Circle()
                .fill(Tokens.Color.accentBlue.opacity(0.2))
                .frame(width: 44, height: 44)
            Text(initial.uppercased())
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Tokens.Color.accentBlue)
        }
    }
}

// MARK: - AI Provider Picker

private enum SettingsAIProvider: String, CaseIterable, Identifiable {
    case claude = "Claude"
    case gemini = "Gemini"

    var id: String { rawValue }

    var systemImage: String {
        switch self {
        case .claude: return "brain"
        case .gemini: return "sparkles"
        }
    }
}

private struct AIProviderPicker: View {
    @AppStorage("defaultAIProvider") private var storedProvider: String = SettingsAIProvider.claude.rawValue

    private var selectedProvider: SettingsAIProvider {
        SettingsAIProvider(rawValue: storedProvider) ?? .claude
    }

    var body: some View {
        Picker("Provider por defecto", selection: $storedProvider) {
            ForEach(SettingsAIProvider.allCases) { provider in
                Label(provider.rawValue, systemImage: provider.systemImage)
                    .tag(provider.rawValue)
            }
        }
        .pickerStyle(.menu)
        .foregroundStyle(Tokens.Color.textPrimary)
    }
}
