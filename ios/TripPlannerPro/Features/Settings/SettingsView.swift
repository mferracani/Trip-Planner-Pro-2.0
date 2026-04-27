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
                    currencySection
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

    // MARK: - Currency section

    private var currencySection: some View {
        Section("Moneda") {
            CurrencyPicker()
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

// MARK: - Currency Picker

private struct CurrencyPicker: View {
    @AppStorage("preferredCurrency") private var selected: String = "USD"

    private let options = ["USD", "EUR", "ARS", "BRL"]

    var body: some View {
        HStack(spacing: Tokens.Spacing.sm) {
            ForEach(options, id: \.self) { code in
                let isActive = selected == code
                Button {
                    selected = code
                } label: {
                    Text(code)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(isActive ? Tokens.Color.accentBlue : Tokens.Color.textTertiary)
                        .padding(.horizontal, Tokens.Spacing.md)
                        .padding(.vertical, Tokens.Spacing.xs)
                        .background(
                            isActive
                                ? Tokens.Color.accentBlue.opacity(0.15)
                                : Tokens.Color.elevated
                        )
                        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.sm))
                        .overlay(
                            RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                                .stroke(
                                    isActive
                                        ? Tokens.Color.accentBlue.opacity(0.4)
                                        : Tokens.Color.border,
                                    lineWidth: 1
                                )
                        )
                }
                .buttonStyle(.plain)
                .animation(.easeInOut(duration: 0.15), value: selected)
            }
            Spacer()
        }
        .padding(.vertical, Tokens.Spacing.xs)
    }
}

// MARK: - AI Provider Picker

private struct AIProviderPicker: View {
    @AppStorage("defaultAIProvider") private var storedProvider: String = AIProvider.claude.rawValue

    var body: some View {
        Picker("Provider por defecto", selection: $storedProvider) {
            ForEach(AIProvider.allCases) { provider in
                Label(provider.label, systemImage: provider.systemImage)
                    .tag(provider.rawValue)
            }
        }
        .pickerStyle(.menu)
        .foregroundStyle(Tokens.Color.textPrimary)
    }
}
