import SwiftUI

// MARK: - CreateTripSheet
//
// Used by DashboardView's empty state AND by the global AtlasTabBar FAB. A
// small editorial form that matches the rest of the edit sheet language.

struct CreateTripSheet: View {
    @Environment(FirestoreClient.self) private var client
    @Environment(\.dismiss) private var dismiss

    @State private var step = 0
    @State private var isDraft = false
    @State private var name = ""
    @State private var startDate = Date()
    @State private var endDate = Calendar.current.date(byAdding: .day, value: 7, to: Date())!
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                if step == 0 {
                    typeChooserContent
                } else {
                    formContent
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if step == 0 {
                        Button("Cancelar") { dismiss() }
                            .foregroundStyle(Tokens.Color.textSecondary)
                    } else {
                        Button("Atrás") { step = 0 }
                            .foregroundStyle(Tokens.Color.textSecondary)
                    }
                }
                if step == 1 {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Crear") { save() }
                            .disabled(name.isEmpty || isSaving)
                            .fontWeight(.semibold)
                            .foregroundStyle(
                                name.isEmpty ? Tokens.Color.textTertiary : Tokens.Color.accentBlue
                            )
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Step 0: Type chooser

    private var typeChooserContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 10) {
                MonoLabel(text: "Nuevo viaje", color: Tokens.Color.textTertiary, size: .xs)
                Text("¿Cómo es este viaje?")
                    .font(Tokens.Typo.displayXL)
                    .tracking(Tokens.Track.displayTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
            }
            .padding(.top, 8)

            VStack(spacing: 12) {
                TripTypeCard(
                    icon: "checkmark.circle.fill",
                    iconColor: Tokens.Color.accentGreen,
                    title: "Confirmado",
                    subtitle: "Tengo fechas y reservas"
                ) {
                    isDraft = false
                    step = 1
                }

                TripTypeCard(
                    icon: "pencil.circle.fill",
                    iconColor: Tokens.Color.accentGold,
                    title: "Borrador",
                    subtitle: "Todavía estoy planificando"
                ) {
                    isDraft = true
                    step = 1
                }
            }

            Spacer()
        }
        .padding(20)
    }

    // MARK: - Step 1: Form

    private var formContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 10) {
                MonoLabel(
                    text: isDraft ? "Borrador" : "Confirmado",
                    color: isDraft ? Tokens.Color.accentGold : Tokens.Color.accentGreen,
                    size: .xs
                )
                Text("¿A dónde vamos?")
                    .font(Tokens.Typo.displayXL)
                    .tracking(Tokens.Track.displayTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
            }
            .padding(.top, 8)

            VStack(alignment: .leading, spacing: 8) {
                MonoLabel(text: "Nombre", color: Tokens.Color.textTertiary, size: .xs)
                TextField("", text: $name, prompt:
                    Text("Europa primavera")
                        .foregroundStyle(Tokens.Color.textTertiary)
                )
                    .font(Tokens.Typo.bodyL)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .fill(Tokens.Color.surface)
                            .overlay(
                                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                    .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                            )
                    )
            }

            VStack(alignment: .leading, spacing: 8) {
                MonoLabel(
                    text: isDraft ? "Fechas (opcional)" : "Fechas",
                    color: Tokens.Color.textTertiary,
                    size: .xs
                )
                VStack(spacing: 0) {
                    DatePicker("Inicio", selection: $startDate, displayedComponents: .date)
                        .tint(Tokens.Color.accentBlue)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                    Hairline()
                    DatePicker("Fin", selection: $endDate, in: startDate..., displayedComponents: .date)
                        .tint(Tokens.Color.accentBlue)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                }
                .background(Tokens.Color.surface)
                .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                )
            }

            Spacer()
        }
        .padding(20)
    }

    // MARK: - Save

    private func save() {
        isSaving = true
        let trip = Trip(
            name: name,
            startDate: startDate,
            endDate: endDate,
            statusStored: isDraft ? .draft : nil,
            createdAt: .now
        )
        Task {
            try? await client.createTrip(trip)
            dismiss()
        }
    }
}

// MARK: - TripTypeCard

private struct TripTypeCard: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 32, weight: .semibold))
                    .foregroundStyle(iconColor)
                    .frame(width: 44)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(Tokens.Typo.strongM)
                        .foregroundStyle(Tokens.Color.textPrimary)
                    Text(subtitle)
                        .font(Tokens.Typo.bodyS)
                        .foregroundStyle(Tokens.Color.textSecondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 20)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                            .strokeBorder(iconColor.opacity(0.25), lineWidth: 0.75)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}
