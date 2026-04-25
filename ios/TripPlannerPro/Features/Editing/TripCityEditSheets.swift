import SwiftUI

// MARK: - TripEditSheet

struct TripEditSheet: View {
    let trip: Trip
    let onClose: () -> Void

    @Environment(FirestoreClient.self) private var client

    @State private var name: String
    @State private var startDate: Date
    @State private var endDate: Date
    @State private var saving = false
    @State private var error: String?

    init(trip: Trip, onClose: @escaping () -> Void) {
        self.trip = trip
        self.onClose = onClose
        _name = State(initialValue: trip.name)
        _startDate = State(initialValue: trip.startDate)
        _endDate = State(initialValue: trip.endDate)
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && endDate >= startDate
    }

    var body: some View {
        EditSheetShell(
            title: trip.name,
            isEditing: true,
            canSave: canSave,
            isSaving: saving,
            error: error,
            onCancel: onClose,
            onSave: save,
            onDelete: nil
        ) {
            VStack(spacing: 12) {
                EditField(label: "Nombre del viaje") {
                    TextFieldInput(text: $name, placeholder: "Europa 2026")
                }

                HStack(spacing: 12) {
                    EditField(label: "Inicio") {
                        EditDatePicker(label: "Inicio", date: $startDate)
                    }
                    EditField(label: "Fin") {
                        EditDatePicker(label: "Fin", date: $endDate)
                    }
                }

                if endDate < startDate {
                    Text("La fecha de fin debe ser posterior al inicio")
                        .font(.system(size: 11))
                        .foregroundStyle(Tokens.Color.accentOrange)
                }
            }
        }
    }

    private func save() {
        var updated = trip
        updated.name = name.trimmingCharacters(in: .whitespaces)
        updated.startDateString = Trip.isoDateFormatter.string(from: startDate)
        updated.endDateString = Trip.isoDateFormatter.string(from: endDate)
        saving = true
        error = nil
        Task {
            do {
                try await client.updateTrip(updated)
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }
}

// MARK: - CityEditSheet

struct CityEditSheet: View {
    let city: TripCity
    let tripID: String
    let onClose: () -> Void

    @Environment(FirestoreClient.self) private var client

    @State private var name: String
    @State private var country: String
    @State private var selectedColorHex: String
    @State private var timezone: String
    @State private var saving = false
    @State private var error: String?

    // Struct avoids Swift 6 key-path restriction on named tuples
    private struct ColorSwatch: Identifiable {
        let id: String  // hex value
        let color: Color
    }

    private let swatches: [ColorSwatch] = [
        ColorSwatch(id: "#FF6B6B", color: Color(hex: 0xFF6B6B)),
        ColorSwatch(id: "#4ECDC4", color: Color(hex: 0x4ECDC4)),
        ColorSwatch(id: "#FFD93D", color: Color(hex: 0xFFD93D)),
        ColorSwatch(id: "#95E1D3", color: Color(hex: 0x95E1D3)),
        ColorSwatch(id: "#C77DFF", color: Color(hex: 0xC77DFF)),
        ColorSwatch(id: "#FF8FA3", color: Color(hex: 0xFF8FA3)),
        ColorSwatch(id: "#6BCB77", color: Color(hex: 0x6BCB77)),
        ColorSwatch(id: "#4D96FF", color: Color(hex: 0x4D96FF)),
    ]

    init(city: TripCity, tripID: String, onClose: @escaping () -> Void) {
        self.city = city
        self.tripID = tripID
        self.onClose = onClose
        _name = State(initialValue: city.name)
        _country = State(initialValue: city.country ?? "")
        _selectedColorHex = State(initialValue: city.color ?? "#4D96FF")
        _timezone = State(initialValue: city.timezone ?? TimeZone.current.identifier)
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        EditSheetShell(
            title: city.name,
            isEditing: true,
            canSave: canSave,
            isSaving: saving,
            error: error,
            onCancel: onClose,
            onSave: save,
            onDelete: { deleteCity() }
        ) {
            VStack(spacing: 12) {
                EditField(label: "Ciudad") {
                    TextFieldInput(text: $name, placeholder: "Madrid")
                }

                EditField(label: "País (opcional)") {
                    TextFieldInput(text: $country, placeholder: "España")
                }

                EditField(label: "Color") {
                    colorSwatchRow
                }

                EditField(label: "Timezone") {
                    PickerInput(
                        selection: $timezone,
                        options: CommonTimezones.options.map { ($0, $0) }
                    )
                }
            }
        }
    }

    private var colorSwatchRow: some View {
        HStack(spacing: 10) {
            ForEach(swatches) { swatch in
                let isSelected = selectedColorHex.uppercased() == swatch.id.uppercased()
                Button {
                    selectedColorHex = swatch.id
                } label: {
                    ZStack {
                        Circle()
                            .fill(swatch.color)
                            .frame(width: 34, height: 34)
                        if isSelected {
                            Circle()
                                .strokeBorder(Color.white.opacity(0.9), lineWidth: 2.5)
                                .frame(width: 34, height: 34)
                            Image(systemName: "checkmark")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
        .padding(.vertical, 6)
    }

    private func save() {
        var updated = city
        updated.name = name.trimmingCharacters(in: .whitespaces)
        updated.country = country.isEmpty ? nil : country
        updated.color = selectedColorHex
        updated.timezone = timezone
        saving = true
        error = nil
        Task {
            do {
                try await client.updateCity(updated, tripID: tripID)
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }

    private func deleteCity() {
        guard let id = city.id else { return }
        Task {
            do {
                try await client.deleteCity(id: id, tripID: tripID)
                onClose()
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}
