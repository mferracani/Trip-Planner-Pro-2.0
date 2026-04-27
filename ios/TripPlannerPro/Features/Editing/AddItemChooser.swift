import SwiftUI

// MARK: - ManualFormType

enum ManualFormType: String, Identifiable, Hashable {
    case flight, hotel, transport, expense

    var id: String { rawValue }

    var title: String {
        switch self {
        case .flight: return "Nuevo vuelo"
        case .hotel: return "Nuevo hotel"
        case .transport: return "Nuevo transporte"
        case .expense: return "Nuevo gasto"
        }
    }
}

// MARK: - AddItemChoice

enum AddItemChoice {
    case aiParse
    case manual(ManualFormType)
}

// MARK: - AddItemChooser
//
// Contextual "what do you want to add?" sheet. Opened from the TripDetail
// FAB. AI parse is featured as the primary option (users land here from
// bookings most of the time), manual entry options follow.

struct AddItemChooser: View {
    let trip: Trip
    let highlight: ManualFormType?
    let onClose: () -> Void
    let onSelect: (AddItemChoice) -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        // Header
                        VStack(alignment: .leading, spacing: 6) {
                            MonoLabel(
                                text: "Agregar al viaje",
                                color: Tokens.Color.textTertiary,
                                size: .xs
                            )
                            Text("¿Qué querés cargar?")
                                .font(Tokens.Typo.displayL)
                                .tracking(Tokens.Track.displayTight)
                                .foregroundStyle(Tokens.Color.textPrimary)
                        }
                        .padding(.top, 4)

                        // Primary AI option
                        Button { onSelect(.aiParse) } label: {
                            AIParseHeroCard()
                        }
                        .buttonStyle(.plain)

                        // Divider
                        HStack(spacing: 10) {
                            Rectangle()
                                .fill(Tokens.Color.borderSoft)
                                .frame(height: 0.5)
                            Text("O cargá manualmente")
                                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                .tracking(Tokens.Track.labelWide)
                                .foregroundStyle(Tokens.Color.textTertiary)
                                .fixedSize()
                            Rectangle()
                                .fill(Tokens.Color.borderSoft)
                                .frame(height: 0.5)
                        }

                        // Manual options
                        VStack(spacing: 8) {
                            ManualOptionRow(
                                icon: "sparkles",
                                title: "Gasto",
                                subtitle: "comidas, actividades, compras, otros",
                                color: Tokens.Color.accentGreen,
                                isHighlighted: highlight == .expense
                            ) { onSelect(.manual(.expense)) }

                            ManualOptionRow(
                                icon: "airplane",
                                title: "Vuelo",
                                subtitle: "con aerolínea, horarios y asiento",
                                color: Tokens.Color.Category.flight,
                                isHighlighted: highlight == .flight
                            ) { onSelect(.manual(.flight)) }

                            ManualOptionRow(
                                icon: "bed.double.fill",
                                title: "Hotel",
                                subtitle: "check-in, check-out, noches",
                                color: Tokens.Color.Category.hotel,
                                isHighlighted: highlight == .hotel
                            ) { onSelect(.manual(.hotel)) }

                            ManualOptionRow(
                                icon: "tram.fill",
                                title: "Transporte",
                                subtitle: "tren, bus, auto, taxi, ferry",
                                color: Tokens.Color.Category.transit,
                                isHighlighted: highlight == .transport
                            ) { onSelect(.manual(.transport)) }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cerrar", action: onClose)
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - AIParseHeroCard

private struct AIParseHeroCard: View {
    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color(hex: 0xB19CD9),
                                Color(hex: 0x8C74BA)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .strokeBorder(.white.opacity(0.2), lineWidth: 0.8)
                    )
                Image(systemName: "sparkles")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .frame(width: 52, height: 52)
            .shadow(color: Color(hex: 0x8C74BA).opacity(0.4), radius: 12, x: 0, y: 6)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text("Parsear con IA")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textPrimary)
                    MonoLabel(
                        text: "RÁPIDO",
                        color: Tokens.Color.accentPurple,
                        size: .xs
                    )
                }
                Text("Pegá un email de booking o subí un PDF")
                    .font(Tokens.Typo.bodyS)
                    .foregroundStyle(Tokens.Color.textSecondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }

            Spacer(minLength: 8)

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Tokens.Color.textTertiary)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                .fill(Tokens.Color.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                        .strokeBorder(
                            LinearGradient(
                                colors: [
                                    Tokens.Color.accentPurple.opacity(0.5),
                                    Tokens.Color.accentPurpleDeep.opacity(0.2)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        )
    }
}

// MARK: - ManualOptionRow

private struct ManualOptionRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    var isHighlighted: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(color.opacity(0.18))
                    Image(systemName: icon)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(color)
                }
                .frame(width: 44, height: 44)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textPrimary)
                    Text(subtitle)
                        .font(Tokens.Typo.bodyS)
                        .foregroundStyle(Tokens.Color.textTertiary)
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textQuaternary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(
                                isHighlighted ? color.opacity(0.45) : Tokens.Color.borderSoft,
                                lineWidth: isHighlighted ? 1 : 0.5
                            )
                    )
            )
        }
        .buttonStyle(AddItemRowButtonStyle())
    }
}

private struct AddItemRowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(Tokens.Motion.snap, value: configuration.isPressed)
    }
}

// MARK: - ManualFormSheet
//
// Wrapper that hosts one of the ManualForms in a NavigationStack with a
// Cancel button — so the form can be presented standalone (not only inside
// AIParseModal as before).

struct ManualFormSheet: View {
    let trip: Trip
    let type: ManualFormType
    let onClose: () -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                Group {
                    switch type {
                    case .flight:
                        ManualFlightForm(trip: trip)
                    case .hotel:
                        ManualHotelForm(trip: trip)
                    case .transport:
                        ManualTransportForm(trip: trip)
                    case .expense:
                        ManualExpenseForm(trip: trip)
                    }
                }
            }
            .navigationTitle(type.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar", action: onClose)
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
