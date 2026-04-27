import SwiftUI

// MARK: - City color palette (shared by CityEditSheet and CreateCitySheet)

fileprivate struct ColorSwatch: Identifiable {
    let id: String  // hex "#RRGGBB"
    let color: Color
}

fileprivate let cityPaletteHexStrings: [String] = [
    "#71D3A6", "#74ACDF", "#FFD16A", "#F29E7D",
    "#A891E8", "#E98A9A", "#6BCB77", "#6CAFE8",
    "#FF6B6B", "#4ECDC4", "#FFAA00", "#00D4FF",
    "#AADF00", "#E040FB", "#FF6422", "#FB7185",
]

fileprivate let citySwatches: [ColorSwatch] = cityPaletteHexStrings.map { hex in
    let val = UInt32(hex.dropFirst(), radix: 16)!
    return ColorSwatch(id: hex, color: Color(hex: val))
}

// MARK: - TripEditSheet

struct TripEditSheet: View {
    let trip: Trip
    let onClose: () -> Void

    @Environment(FirestoreClient.self) private var client

    @State private var name: String
    @State private var startDate: Date
    @State private var endDate: Date
    @State private var selectedCoverUrl: String?
    @State private var showThemePicker = false
    @State private var saving = false
    @State private var error: String?

    init(trip: Trip, onClose: @escaping () -> Void) {
        self.trip = trip
        self.onClose = onClose
        _name = State(initialValue: trip.name)
        _startDate = State(initialValue: trip.startDate)
        _endDate = State(initialValue: trip.endDate)
        _selectedCoverUrl = State(initialValue: trip.coverURL)
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && endDate >= startDate
    }

    // Preview of currently selected theme
    private var selectedTheme: TripTheme? {
        TripTheme.getTheme(coverUrl: selectedCoverUrl)
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

                // Theme picker trigger row + Sin tema button
                EditField(label: "Tema visual") {
                    VStack(spacing: 8) {
                        // "Sin tema" clear button — shown when a theme is selected
                        if selectedCoverUrl != nil && !selectedCoverUrl!.isEmpty {
                            Button {
                                selectedCoverUrl = nil
                            } label: {
                                HStack {
                                    Image(systemName: "xmark.circle")
                                        .font(.system(size: 13))
                                        .foregroundStyle(Tokens.Color.textTertiary)
                                    Text("Sin tema")
                                        .font(Tokens.Typo.strongS)
                                        .foregroundStyle(Tokens.Color.textTertiary)
                                    Spacer()
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(
                                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                        .fill(Tokens.Color.elevated)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                                .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                                        )
                                )
                            }
                            .buttonStyle(.plain)
                        }
                        themePickerRow
                    }
                }
            }
        }
        .sheet(isPresented: $showThemePicker) {
            ThemePickerView(selectedCoverUrl: $selectedCoverUrl)
                .presentationBackground(Tokens.Color.bgPrimary)
                .presentationDetents([.large])
        }
    }

    private var themePickerRow: some View {
        Button {
            showThemePicker = true
        } label: {
            HStack(spacing: 12) {
                if let theme = selectedTheme {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(theme.gradientBackground)
                        .frame(width: 44, height: 28)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                        )
                    Text(theme.emoji + " " + theme.label)
                        .font(Tokens.Typo.strongS)
                        .foregroundStyle(Tokens.Color.textPrimary)
                } else {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Tokens.Color.elevated)
                        .frame(width: 44, height: 28)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                        )
                    Text("Sin tema")
                        .font(Tokens.Typo.bodyS)
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.elevated)
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private func save() {
        var updated = trip
        updated.name = name.trimmingCharacters(in: .whitespaces)
        updated.startDateString = Trip.isoDateFormatter.string(from: startDate)
        updated.endDateString = Trip.isoDateFormatter.string(from: endDate)
        updated.coverURL = selectedCoverUrl
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

    init(city: TripCity, tripID: String, onClose: @escaping () -> Void) {
        self.city = city
        self.tripID = tripID
        self.onClose = onClose
        _name = State(initialValue: city.name)
        _country = State(initialValue: city.country ?? "")
        _selectedColorHex = State(initialValue: city.color ?? "#74ACDF")
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
        let columns = Array(repeating: GridItem(.fixed(36), spacing: 10), count: 8)
        return LazyVGrid(columns: columns, spacing: 10) {
            ForEach(citySwatches) { swatch in
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

// MARK: - CreateCitySheet

struct CreateCitySheet: View {
    let tripID: String
    /// All unique cities across the user's other trips — shown as quick-fill catalog.
    var existingCities: [TripCity] = []
    let onClose: () -> Void

    @Environment(FirestoreClient.self) private var client

    @State private var name = ""
    @State private var country = ""
    @State private var selectedColorHex = "#74ACDF"
    @State private var timezone = TimeZone.current.identifier
    @State private var saving = false
    @State private var error: String?

    /// Unique cities from other trips, normalised by lowercased name to avoid duplicates.
    private var uniqueExistingCities: [TripCity] {
        var seen = Set<String>()
        return existingCities.filter { city in
            let key = city.name.lowercased()
            guard !seen.contains(key) else { return false }
            seen.insert(key)
            return true
        }
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        EditSheetShell(
            title: "Nueva ciudad",
            isEditing: false,
            canSave: canSave,
            isSaving: saving,
            error: error,
            onCancel: onClose,
            onSave: save,
            onDelete: nil
        ) {
            VStack(spacing: 12) {
                // Catalog of existing cities (quick-fill)
                if !uniqueExistingCities.isEmpty {
                    EditField(label: "Ciudades en este viaje") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(uniqueExistingCities) { existing in
                                    Button {
                                        name = existing.name
                                        country = existing.country ?? ""
                                        if let hex = existing.color {
                                            selectedColorHex = hex
                                        }
                                        if let tz = existing.timezone {
                                            timezone = tz
                                        }
                                    } label: {
                                        HStack(spacing: 6) {
                                            Circle()
                                                .fill(existing.swiftColor)
                                                .frame(width: 7, height: 7)
                                            Text(existing.name)
                                                .font(Tokens.Typo.strongS)
                                                .foregroundStyle(Tokens.Color.textPrimary)
                                        }
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(
                                            Capsule()
                                                .fill(existing.swiftColor.opacity(0.15))
                                                .overlay(
                                                    Capsule()
                                                        .strokeBorder(existing.swiftColor.opacity(0.35), lineWidth: 0.5)
                                                )
                                        )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }

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
        let columns = Array(repeating: GridItem(.fixed(36), spacing: 10), count: 8)
        return LazyVGrid(columns: columns, spacing: 10) {
            ForEach(citySwatches) { swatch in
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
        }
        .padding(.vertical, 6)
    }

    private func save() {
        let normalizedName = name.trimmingCharacters(in: .whitespaces).lowercased()
        if existingCities.contains(where: { $0.name.lowercased() == normalizedName }) {
            error = "Esta ciudad ya existe en el viaje"
            return
        }
        saving = true
        error = nil
        let city = TripCity(
            id: nil,
            tripId: tripID,
            name: name.trimmingCharacters(in: .whitespaces),
            country: country.isEmpty ? nil : country,
            countryCode: nil,
            color: selectedColorHex,
            days: [],
            lat: nil,
            lng: nil,
            timezone: timezone
        )
        Task {
            do {
                try await client.createCity(city, tripID: tripID)
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }
}
