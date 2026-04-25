import SwiftUI

// MARK: - CreateTripSheet
//
// Used by DashboardView's empty state AND by the global AtlasTabBar FAB. A
// small editorial form that matches the rest of the edit sheet language.

struct CreateTripSheet: View {
    @Environment(FirestoreClient.self) private var client
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var startDate = Date()
    @State private var endDate = Calendar.current.date(byAdding: .day, value: 7, to: Date())!
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 10) {
                        MonoLabel(text: "Nuevo viaje", color: Tokens.Color.textTertiary, size: .xs)
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
                        MonoLabel(text: "Fechas", color: Tokens.Color.textTertiary, size: .xs)
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
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
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
        .preferredColorScheme(.dark)
    }

    private func save() {
        isSaving = true
        let trip = Trip(
            name: name,
            startDate: startDate,
            endDate: endDate,
            status: .planned,
            cityOrder: [],
            createdAt: .now
        )
        Task {
            try? await client.createTrip(trip)
            dismiss()
        }
    }
}
