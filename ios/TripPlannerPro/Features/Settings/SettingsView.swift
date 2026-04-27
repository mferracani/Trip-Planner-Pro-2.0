import SwiftUI

struct SettingsView: View {
    @Environment(AuthManager.self) private var auth
    @State private var showSignOutConfirm = false
    @State private var didCopyUID = false

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Tokens.Spacing.lg) {
                        accountSection
                        aiSection
                        preferencesSection
                        aboutSection
                    }
                    .padding(.horizontal, Tokens.Spacing.base)
                    .padding(.top, Tokens.Spacing.md)
                    .padding(.bottom, Tokens.Spacing.xxl)
                }
            }
            .navigationTitle("Ajustes")
            .navigationBarTitleDisplayMode(.large)
        }
        .preferredColorScheme(.dark)
        .alert("Cerrar sesion", isPresented: $showSignOutConfirm) {
            Button("Cerrar sesion", role: .destructive) {
                try? auth.signOut()
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Se cerrara tu sesion en este dispositivo.")
        }
    }

    // MARK: - Account

    private var accountSection: some View {
        SettingsSection(header: "Cuenta") {
            if case .signedIn(let user) = auth.state {
                // Avatar row
                HStack(spacing: Tokens.Spacing.md) {
                    avatarView(user: user)

                    VStack(alignment: .leading, spacing: 3) {
                        Text(user.displayName ?? "Sin nombre")
                            .font(Tokens.Typo.strongM)
                            .foregroundStyle(Tokens.Color.textPrimary)

                        if let email = user.email {
                            Text(email)
                                .font(Tokens.Typo.bodyS)
                                .foregroundStyle(Tokens.Color.textSecondary)
                        }
                    }

                    Spacer()
                }
                .padding(.vertical, Tokens.Spacing.xs)

                SettingsDivider()

                // UID copy row
                Button {
                    UIPasteboard.general.string = user.uid
                    withAnimation(.easeInOut(duration: 0.2)) {
                        didCopyUID = true
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            didCopyUID = false
                        }
                    }
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("UID de depuracion")
                                .font(Tokens.Typo.bodyS)
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
                            .foregroundStyle(
                                didCopyUID ? Tokens.Color.accentGreen : Tokens.Color.textTertiary
                            )
                    }
                }
                .buttonStyle(.plain)

                SettingsDivider()

                // Sign out row
                Button {
                    showSignOutConfirm = true
                } label: {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: 15))
                            .foregroundStyle(Tokens.Color.accentRed)
                            .frame(width: 20)
                        Text("Cerrar sesion")
                            .font(Tokens.Typo.bodyM)
                            .foregroundStyle(Tokens.Color.accentRed)
                        Spacer()
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - IA

    private var aiSection: some View {
        SettingsSection(header: "IA") {
            HStack {
                Image(systemName: "sparkles")
                    .font(.system(size: 14))
                    .foregroundStyle(Tokens.Color.accentPurple)
                    .frame(width: 20)

                Text("Proveedor de IA")
                    .font(Tokens.Typo.bodyM)
                    .foregroundStyle(Tokens.Color.textPrimary)

                Spacer()

                AIProviderPicker()
            }
        }
    }

    // MARK: - Preferencias

    private var preferencesSection: some View {
        SettingsSection(header: "Preferencias") {
            VStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
                HStack {
                    Image(systemName: "dollarsign.circle")
                        .font(.system(size: 14))
                        .foregroundStyle(Tokens.Color.accentGreen)
                        .frame(width: 20)

                    Text("Moneda preferida")
                        .font(Tokens.Typo.bodyM)
                        .foregroundStyle(Tokens.Color.textPrimary)
                }

                CurrencyPicker()
            }
        }
    }

    // MARK: - Sobre la app

    private var aboutSection: some View {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"

        return SettingsSection(header: "Sobre la app") {
            // Version row
            HStack {
                Image(systemName: "info.circle")
                    .font(.system(size: 14))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .frame(width: 20)

                Text("Version")
                    .font(Tokens.Typo.bodyM)
                    .foregroundStyle(Tokens.Color.textPrimary)

                Spacer()

                Text("\(version) (\(build))")
                    .font(Tokens.Typo.monoS)
                    .foregroundStyle(Tokens.Color.textSecondary)
            }

            SettingsDivider()

            // GitHub row
            Button {
                if let url = URL(string: "https://github.com/matiasferracani") {
                    UIApplication.shared.open(url)
                }
            } label: {
                HStack {
                    Image(systemName: "arrow.up.right.square")
                        .font(.system(size: 14))
                        .foregroundStyle(Tokens.Color.accentBlue)
                        .frame(width: 20)

                    Text("GitHub")
                        .font(Tokens.Typo.bodyM)
                        .foregroundStyle(Tokens.Color.accentBlue)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Avatar

    private func avatarView(user: AuthUser) -> some View {
        let initial = user.displayName?.first.map(String.init)
            ?? user.email?.first.map(String.init)
            ?? "?"

        return ZStack {
            Circle()
                .fill(Tokens.Color.accentBlue.opacity(0.18))
                .frame(width: 48, height: 48)
            Text(initial.uppercased())
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(Tokens.Color.accentBlue)
        }
    }
}

// MARK: - SettingsSection container

private struct SettingsSection<Content: View>: View {
    let header: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
            Text(header.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(Tokens.Track.labelWider)
                .foregroundStyle(Tokens.Color.textTertiary)
                .padding(.leading, Tokens.Spacing.xs)

            VStack(alignment: .leading, spacing: 0) {
                content()
            }
            .padding(.horizontal, Tokens.Spacing.base)
            .padding(.vertical, Tokens.Spacing.md)
            .background(Tokens.Color.surface)
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .stroke(Tokens.Color.borderSoft, lineWidth: 1)
            )
        }
    }
}

// MARK: - SettingsDivider

private struct SettingsDivider: View {
    var body: some View {
        Divider()
            .background(Tokens.Color.borderHair)
            .padding(.vertical, Tokens.Spacing.sm)
    }
}

// MARK: - Currency Picker

private struct CurrencyPicker: View {
    @AppStorage("preferredCurrency") private var selected: String = "USD"

    private let options: [(code: String, symbol: String)] = [
        ("USD", "$"),
        ("EUR", "€"),
        ("ARS", "$"),
        ("BRL", "R$"),
    ]

    var body: some View {
        HStack(spacing: Tokens.Spacing.sm) {
            ForEach(options, id: \.code) { option in
                let isActive = selected == option.code
                Button {
                    withAnimation(.easeInOut(duration: 0.15)) {
                        selected = option.code
                    }
                } label: {
                    VStack(spacing: 2) {
                        Text(option.symbol)
                            .font(.system(size: 13, weight: .bold))
                        Text(option.code)
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(isActive ? Tokens.Color.accentBlue : Tokens.Color.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Tokens.Spacing.sm)
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
            }
        }
    }
}

// MARK: - AI Provider Picker

private struct AIProviderPicker: View {
    // Key "aiProvider" per PRD §Módulo G
    @AppStorage("aiProvider") private var storedProvider: String = AIProvider.claude.rawValue

    var body: some View {
        Menu {
            ForEach(AIProvider.allCases) { provider in
                Button {
                    storedProvider = provider.rawValue
                } label: {
                    Label(provider.label, systemImage: provider.systemImage)
                }
            }
        } label: {
            HStack(spacing: Tokens.Spacing.xs) {
                if let provider = AIProvider(rawValue: storedProvider) {
                    Image(systemName: provider.systemImage)
                        .font(.system(size: 13))
                    Text(provider.label)
                        .font(Tokens.Typo.strongS)
                } else {
                    Text("Seleccionar")
                        .font(Tokens.Typo.bodyS)
                }
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 10, weight: .semibold))
            }
            .foregroundStyle(Tokens.Color.accentPurple)
            .padding(.horizontal, Tokens.Spacing.sm)
            .padding(.vertical, Tokens.Spacing.xs)
            .background(Tokens.Color.accentPurple.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.sm))
        }
    }
}
