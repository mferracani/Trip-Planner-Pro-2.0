import SwiftUI

// MARK: - ThemePickerView
//
// Grid of 52 themes (from TripTheme.all) grouped by category.
// Used inside TripEditSheet to let the user pick a visual theme for the trip.
// Selection updates the `coverURL` field on Trip (maps to Firestore `cover_url`).

struct ThemePickerView: View {
    @Binding var selectedCoverUrl: String?
    @Environment(\.dismiss) private var dismiss

    // Group themes: nature first, then city
    private var natureThemes: [TripTheme] { TripTheme.all.filter { $0.category == .nature } }
    private var cityThemes:   [TripTheme] { TripTheme.all.filter { $0.category == .city   } }

    // 4 columns matching compact grid
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 4)

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        sectionGrid(title: "Naturaleza", themes: natureThemes)
                        sectionGrid(title: "Ciudades",   themes: cityThemes)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 20)
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("Tema del viaje")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Listo") { dismiss() }
                        .font(Tokens.Typo.strongS)
                        .foregroundStyle(Tokens.Color.accentBlue)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Section

    private func sectionGrid(title: String, themes: [TripTheme]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .tracking(Tokens.Track.labelWider)
                .foregroundStyle(Tokens.Color.textTertiary)

            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(themes) { theme in
                    ThemeCell(theme: theme, isSelected: selectedCoverUrl == theme.coverUrl) {
                        selectedCoverUrl = (selectedCoverUrl == theme.coverUrl) ? nil : theme.coverUrl
                        let h = UIImpactFeedbackGenerator(style: .soft)
                        h.impactOccurred()
                    }
                }
            }
        }
    }
}

// MARK: - ThemeCell

private struct ThemeCell: View {
    let theme: TripTheme
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .bottomLeading) {
                // Gradient preview
                RoundedRectangle(cornerRadius: 10)
                    .fill(theme.gradientBackground)
                    .frame(height: 80)

                // Emoji top-right
                VStack {
                    HStack {
                        Spacer()
                        Text(theme.emoji)
                            .font(.system(size: 18))
                            .padding(6)
                    }
                    Spacer()
                }

                // Label bottom-left
                Text(theme.label)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.white.opacity(0.85))
                    .lineLimit(1)
                    .padding(.horizontal, 6)
                    .padding(.bottom, 6)

                // Selected overlay
                if isSelected {
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(Tokens.Color.accentGold, lineWidth: 2.5)

                    VStack {
                        HStack {
                            ZStack {
                                Circle()
                                    .fill(Tokens.Color.accentGold)
                                    .frame(width: 18, height: 18)
                                Image(systemName: "checkmark")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(.black)
                            }
                            .padding(6)
                            Spacer()
                        }
                        Spacer()
                    }
                }
            }
            .frame(height: 80)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(
                        isSelected ? Tokens.Color.accentGold : Tokens.Color.borderSoft,
                        lineWidth: isSelected ? 2.5 : 0.5
                    )
            )
        }
        .buttonStyle(ThemeCellButtonStyle())
    }
}

private struct ThemeCellButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.93 : 1.0)
            .animation(Tokens.Motion.snap, value: configuration.isPressed)
    }
}
