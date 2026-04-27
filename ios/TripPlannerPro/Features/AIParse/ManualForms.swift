import SwiftUI

// MARK: - ManualItemsView
// Replaces ManualItemsPlaceholder in AIParseModal when mode == .manual

struct ManualItemsView: View {
    let trip: Trip

    @Environment(FirestoreClient.self) private var client
    @Environment(\.dismiss) private var dismiss

    private enum FormTab: String, CaseIterable {
        case flight = "Vuelo"
        case hotel = "Hotel"
        case transport = "Traslado"
        case city = "Ciudad"

        var icon: String {
            switch self {
            case .flight: return "airplane"
            case .hotel: return "bed.double"
            case .transport: return "tram"
            case .city: return "mappin"
            }
        }

        var color: Color {
            switch self {
            case .flight: return Tokens.Color.Category.flight
            case .hotel: return Tokens.Color.Category.hotel
            case .transport: return Tokens.Color.Category.transit
            case .city: return Tokens.Color.accentGreen
            }
        }
    }

    @State private var activeForm: FormTab = .flight

    var body: some View {
        VStack(spacing: 0) {
            // Pills
            HStack(spacing: Tokens.Spacing.sm) {
                ForEach(FormTab.allCases, id: \.self) { tab in
                    Button {
                        withAnimation(.easeInOut(duration: Tokens.Motion.fast)) {
                            activeForm = tab
                        }
                    } label: {
                        HStack(spacing: Tokens.Spacing.xs) {
                            Image(systemName: tab.icon)
                                .font(.system(size: 12))
                            Text(tab.rawValue)
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundStyle(activeForm == tab ? tab.color : Tokens.Color.textTertiary)
                        .padding(.horizontal, Tokens.Spacing.md)
                        .padding(.vertical, Tokens.Spacing.sm)
                        .background(
                            Capsule()
                                .fill(activeForm == tab ? tab.color.opacity(0.15) : Tokens.Color.elevated)
                                .overlay(
                                    Capsule()
                                        .stroke(
                                            activeForm == tab ? tab.color.opacity(0.35) : Tokens.Color.border,
                                            lineWidth: 1
                                        )
                                )
                        )
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }
            .padding(.horizontal, Tokens.Spacing.base)
            .padding(.top, Tokens.Spacing.base)
            .padding(.bottom, Tokens.Spacing.md)

            Divider().background(Tokens.Color.border)

            // Form body
            switch activeForm {
            case .flight:
                ManualFlightForm(trip: trip)
            case .hotel:
                ManualHotelForm(trip: trip)
            case .transport:
                ManualTransportForm(trip: trip)
            case .city:
                ManualCityForm(trip: trip)
            }
        }
    }
}

// MARK: - ManualFlightForm

struct ManualFlightForm: View {
    let trip: Trip

    @Environment(FirestoreClient.self) private var client
    @Environment(\.dismiss) private var dismiss

    @State private var airline = ""
    @State private var flightNumber = ""
    @State private var originIATA = ""
    @State private var destIATA = ""
    @State private var departureDate = Date()
    @State private var departureTime = ""
    @State private var arrivalDate = Date()
    @State private var arrivalTime = ""
    @State private var bookingRef = ""
    @State private var seat = ""
    @State private var cabinClass = "economy"
    @State private var price = ""
    @State private var currency = "USD"

    @State private var isSaving = false
    @State private var saveError: String?
    @State private var showSuccess = false

    private let cabinClassOptions: [(value: String, label: String)] = [
        ("economy", "Economy"),
        ("premium_economy", "Premium Economy"),
        ("business", "Business"),
        ("first", "Primera"),
    ]

    private var isValid: Bool {
        !originIATA.trimmingCharacters(in: .whitespaces).isEmpty &&
        !destIATA.trimmingCharacters(in: .whitespaces).isEmpty &&
        !departureTime.trimmingCharacters(in: .whitespaces).isEmpty &&
        !arrivalTime.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Tokens.Spacing.md) {
                if showSuccess {
                    SavedBanner()
                }

                if let error = saveError {
                    ErrorBanner(message: error)
                }

                // Row: Origin → Dest
                HStack(spacing: Tokens.Spacing.sm) {
                    FormField(label: "Origen IATA", placeholder: "EZE", text: $originIATA)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.characters)
                    Image(systemName: "arrow.right")
                        .font(.system(size: 14))
                        .foregroundStyle(Tokens.Color.textTertiary)
                        .padding(.top, Tokens.Spacing.lg)
                    FormField(label: "Destino IATA", placeholder: "MAD", text: $destIATA)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.characters)
                }

                // Row: Airline + Flight number
                HStack(spacing: Tokens.Spacing.sm) {
                    FormField(label: "Aerolínea", placeholder: "Iberia", text: $airline)
                        .autocorrectionDisabled()
                    FormField(label: "N° vuelo", placeholder: "IB6844", text: $flightNumber)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.characters)
                }

                // Departure
                FormSection(title: "Salida") {
                    VStack(spacing: Tokens.Spacing.sm) {
                        DatePickerRow(label: "Fecha", selection: $departureDate)
                        FormField(label: "Hora local (HH:mm)", placeholder: "21:35", text: $departureTime)
                            .keyboardType(.numbersAndPunctuation)
                    }
                }

                // Arrival
                FormSection(title: "Llegada") {
                    VStack(spacing: Tokens.Spacing.sm) {
                        DatePickerRow(label: "Fecha", selection: $arrivalDate)
                        FormField(label: "Hora local (HH:mm)", placeholder: "13:05", text: $arrivalTime)
                            .keyboardType(.numbersAndPunctuation)
                    }
                }

                // Optional fields
                FormField(label: "Ref. de reserva (opcional)", placeholder: "ABC123", text: $bookingRef)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)

                FormField(label: "Asiento (opcional)", placeholder: "14A", text: $seat)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)

                // Cabin class picker
                FormSection(title: "Clase") {
                    VStack(spacing: 0) {
                        ForEach(cabinClassOptions, id: \.value) { option in
                            Button {
                                withAnimation(.easeInOut(duration: Tokens.Motion.fast)) {
                                    cabinClass = option.value
                                }
                            } label: {
                                HStack {
                                    Text(option.label)
                                        .font(.system(size: 14))
                                        .foregroundStyle(Tokens.Color.textPrimary)
                                    Spacer()
                                    if cabinClass == option.value {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundStyle(Tokens.Color.Category.flight)
                                    }
                                }
                                .padding(.vertical, Tokens.Spacing.sm)
                                .padding(.horizontal, Tokens.Spacing.md)
                            }
                            .buttonStyle(.plain)
                            if option.value != cabinClassOptions.last?.value {
                                Divider().background(Tokens.Color.border)
                                    .padding(.leading, Tokens.Spacing.md)
                            }
                        }
                    }
                    .background(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .fill(Tokens.Color.elevated)
                    )
                }

                PriceRow(price: $price, currency: $currency)

                SaveButton(isValid: isValid, isSaving: isSaving, action: save)
            }
            .padding(Tokens.Spacing.base)
        }
    }

    private func save() {
        guard let tripID = trip.id, isValid else { return }
        isSaving = true
        saveError = nil

        Task {
            do {
                let depISO = isoString(date: departureDate, time: departureTime)
                let arrISO = isoString(date: arrivalDate, time: arrivalTime)
                let depUTC = parseLocalApproxUTC(date: departureDate, time: departureTime)
                let arrUTC = parseLocalApproxUTC(date: arrivalDate, time: arrivalTime)
                let durationMin = max(0, Int(arrUTC.timeIntervalSince(depUTC) / 60))

                let flight = Flight(
                    tripId: tripID,
                    airline: airline.trimmingCharacters(in: .whitespaces),
                    flightNumber: flightNumber.trimmingCharacters(in: .whitespaces).uppercased(),
                    originIATA: originIATA.trimmingCharacters(in: .whitespaces).uppercased(),
                    destinationIATA: destIATA.trimmingCharacters(in: .whitespaces).uppercased(),
                    departureLocalTime: depISO,
                    departureUTC: depUTC,
                    arrivalLocalTime: arrISO,
                    arrivalUTC: arrUTC,
                    durationMinutes: durationMin,
                    cabinClass: cabinClass,
                    seat: seat.isEmpty ? nil : seat.uppercased(),
                    bookingRef: bookingRef.isEmpty ? nil : bookingRef.uppercased(),
                    price: Double(price.replacingOccurrences(of: ",", with: ".")),
                    currency: price.isEmpty ? nil : currency
                )

                try client.saveManualFlight(flight, tripID: tripID)

                isSaving = false
                withAnimation { showSuccess = true }
                resetForm()
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    withAnimation { showSuccess = false }
                }
            } catch {
                isSaving = false
                saveError = error.localizedDescription
            }
        }
    }

    private func resetForm() {
        airline = ""; flightNumber = ""; originIATA = ""; destIATA = ""
        departureDate = Date(); departureTime = ""; arrivalDate = Date(); arrivalTime = ""
        bookingRef = ""; seat = ""; cabinClass = "economy"; price = ""; currency = "USD"
    }
}

// MARK: - ManualHotelForm

struct ManualHotelForm: View {
    let trip: Trip

    @Environment(FirestoreClient.self) private var client

    @State private var name = ""
    @State private var checkIn = Date()
    @State private var checkOut = Date().addingTimeInterval(86400)
    @State private var roomType = ""
    @State private var bookingRef = ""
    @State private var pricePerNight = ""
    @State private var currency = "USD"

    @State private var isSaving = false
    @State private var saveError: String?
    @State private var showSuccess = false

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && checkOut > checkIn
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Tokens.Spacing.md) {
                if showSuccess {
                    SavedBanner()
                }

                if let error = saveError {
                    ErrorBanner(message: error)
                }

                FormField(label: "Nombre del hotel", placeholder: "NH Madrid Ventas", text: $name)
                    .autocorrectionDisabled()

                FormSection(title: "Check-in") {
                    DatePickerRow(label: "Fecha", selection: $checkIn)
                }

                FormSection(title: "Check-out") {
                    DatePickerRow(label: "Fecha", selection: $checkOut)
                }

                FormField(label: "Tipo de habitación (opcional)", placeholder: "Doble superior", text: $roomType)
                    .autocorrectionDisabled()

                FormField(label: "Ref. de reserva (opcional)", placeholder: "ABC123", text: $bookingRef)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)

                PriceRow(price: $pricePerNight, currency: $currency, label: "Precio por noche (opcional)")

                SaveButton(isValid: isValid, isSaving: isSaving, action: save)
            }
            .padding(Tokens.Spacing.base)
        }
    }

    private func save() {
        guard let tripID = trip.id, isValid else { return }
        isSaving = true
        saveError = nil

        Task {
            do {
                let checkInISO = dateOnlyISO(checkIn)
                let checkOutISO = dateOnlyISO(checkOut)
                let ppn = Double(pricePerNight.replacingOccurrences(of: ",", with: "."))
                let nights = Calendar.current.dateComponents([.day], from: checkIn, to: checkOut).day ?? 0
                let total: Double? = ppn.map { $0 * Double(max(1, nights)) }

                let hotel = Hotel(
                    tripId: tripID,
                    name: name.trimmingCharacters(in: .whitespaces),
                    checkIn: checkInISO,
                    checkOut: checkOutISO,
                    roomType: roomType.isEmpty ? nil : roomType.trimmingCharacters(in: .whitespaces),
                    bookingRef: bookingRef.isEmpty ? nil : bookingRef.uppercased(),
                    pricePerNight: ppn,
                    totalPrice: total,
                    currency: pricePerNight.isEmpty ? nil : currency
                )

                try client.saveManualHotel(hotel, tripID: tripID)

                isSaving = false
                withAnimation { showSuccess = true }
                name = ""; roomType = ""; bookingRef = ""; pricePerNight = ""; currency = "USD"
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    withAnimation { showSuccess = false }
                }
            } catch {
                isSaving = false
                saveError = error.localizedDescription
            }
        }
    }
}

// MARK: - ManualTransportForm

struct ManualTransportForm: View {
    let trip: Trip

    @Environment(FirestoreClient.self) private var client

    private let transportTypes: [(value: String, label: String)] = [
        ("train", "Tren"),
        ("bus", "Bus"),
        ("ferry", "Ferry"),
        ("car", "Auto / rental"),
        ("taxi", "Taxi"),
        ("subway", "Metro / Subte"),
        ("other", "Otro"),
    ]

    @State private var type = "train"
    @State private var origin = ""
    @State private var destination = ""
    @State private var departureDate = Date()
    @State private var departureTime = ""
    @State private var bookingRef = ""
    @State private var price = ""
    @State private var currency = "USD"

    @State private var isSaving = false
    @State private var saveError: String?
    @State private var showSuccess = false

    private var isValid: Bool {
        !origin.trimmingCharacters(in: .whitespaces).isEmpty &&
        !destination.trimmingCharacters(in: .whitespaces).isEmpty &&
        !departureTime.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Tokens.Spacing.md) {
                if showSuccess {
                    SavedBanner()
                }

                if let error = saveError {
                    ErrorBanner(message: error)
                }

                // Type picker
                FormSection(title: "Tipo de traslado") {
                    VStack(spacing: 0) {
                        ForEach(transportTypes, id: \.value) { option in
                            Button {
                                withAnimation(.easeInOut(duration: Tokens.Motion.fast)) {
                                    type = option.value
                                }
                            } label: {
                                HStack {
                                    Text(option.label)
                                        .font(.system(size: 14))
                                        .foregroundStyle(Tokens.Color.textPrimary)
                                    Spacer()
                                    if type == option.value {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundStyle(Tokens.Color.Category.transit)
                                    }
                                }
                                .padding(.vertical, Tokens.Spacing.sm)
                                .padding(.horizontal, Tokens.Spacing.md)
                            }
                            .buttonStyle(.plain)
                            if option.value != transportTypes.last?.value {
                                Divider().background(Tokens.Color.border)
                                    .padding(.leading, Tokens.Spacing.md)
                            }
                        }
                    }
                    .background(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .fill(Tokens.Color.elevated)
                    )
                }

                // Origin → Destination
                HStack(spacing: Tokens.Spacing.sm) {
                    FormField(label: "Origen", placeholder: "Madrid", text: $origin)
                        .autocorrectionDisabled()
                    Image(systemName: "arrow.right")
                        .font(.system(size: 14))
                        .foregroundStyle(Tokens.Color.textTertiary)
                        .padding(.top, Tokens.Spacing.lg)
                    FormField(label: "Destino", placeholder: "Barcelona", text: $destination)
                        .autocorrectionDisabled()
                }

                // Departure
                FormSection(title: "Salida") {
                    VStack(spacing: Tokens.Spacing.sm) {
                        DatePickerRow(label: "Fecha", selection: $departureDate)
                        FormField(label: "Hora local (HH:mm)", placeholder: "09:40", text: $departureTime)
                            .keyboardType(.numbersAndPunctuation)
                    }
                }

                FormField(label: "Ref. de reserva (opcional)", placeholder: "ABC123", text: $bookingRef)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)

                PriceRow(price: $price, currency: $currency)

                SaveButton(isValid: isValid, isSaving: isSaving, action: save)
            }
            .padding(Tokens.Spacing.base)
        }
    }

    private func save() {
        guard let tripID = trip.id, isValid else { return }
        isSaving = true
        saveError = nil

        Task {
            do {
                let depISO = isoString(date: departureDate, time: departureTime)
                let depUTC = parseLocalApproxUTC(date: departureDate, time: departureTime)
                let transport = Transport(
                    tripId: tripID,
                    type: type,
                    origin: origin.trimmingCharacters(in: .whitespaces),
                    destination: destination.trimmingCharacters(in: .whitespaces),
                    departureLocalTime: depISO,
                    departureUTC: depUTC,
                    bookingRef: bookingRef.isEmpty ? nil : bookingRef.uppercased(),
                    price: Double(price.replacingOccurrences(of: ",", with: ".")),
                    currency: price.isEmpty ? nil : currency
                )

                try client.saveManualTransport(transport, tripID: tripID)

                isSaving = false
                withAnimation { showSuccess = true }
                origin = ""; destination = ""; departureTime = ""; bookingRef = ""; price = ""; currency = "USD"
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    withAnimation { showSuccess = false }
                }
            } catch {
                isSaving = false
                saveError = error.localizedDescription
            }
        }
    }
}

// MARK: - ManualExpenseForm

struct ManualExpenseForm: View {
    let trip: Trip

    @Environment(FirestoreClient.self) private var client

    private let categories: [(value: String, label: String, icon: String)] = [
        ("food", "Comida / Restaurante", "fork.knife"),
        ("activity", "Actividad / Tour", "ticket"),
        ("shopping", "Compras", "bag"),
        ("transport", "Transporte local", "tram"),
        ("other", "Otro", "ellipsis.circle"),
    ]

    @State private var title = ""
    @State private var amount = ""
    @State private var currency = "USD"
    @State private var category = "other"
    @State private var date = Date()
    @State private var notes = ""

    @State private var isSaving = false
    @State private var saveError: String?
    @State private var showSuccess = false

    private var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        Double(amount.replacingOccurrences(of: ",", with: ".")) != nil
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Tokens.Spacing.md) {
                if showSuccess { SavedBanner() }
                if let error = saveError { ErrorBanner(message: error) }

                FormField(label: "Descripción", placeholder: "Cena en Madrid", text: $title)

                PriceRow(price: $amount, currency: $currency)

                DatePickerRow(label: "Fecha", selection: $date)

                FormSection(title: "Categoría") {
                    VStack(spacing: 0) {
                        ForEach(categories, id: \.value) { opt in
                            Button {
                                withAnimation(.easeInOut(duration: Tokens.Motion.fast)) { category = opt.value }
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: opt.icon)
                                        .font(.system(size: 14))
                                        .foregroundStyle(Tokens.Color.accentGreen)
                                        .frame(width: 20)
                                    Text(opt.label)
                                        .font(.system(size: 14))
                                        .foregroundStyle(Tokens.Color.textPrimary)
                                    Spacer()
                                    if category == opt.value {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundStyle(Tokens.Color.accentGreen)
                                    }
                                }
                                .padding(.vertical, Tokens.Spacing.sm)
                                .padding(.horizontal, Tokens.Spacing.md)
                            }
                            .buttonStyle(.plain)
                            if opt.value != categories.last?.value {
                                Divider().background(Tokens.Color.border)
                                    .padding(.leading, Tokens.Spacing.md)
                            }
                        }
                    }
                    .background(RoundedRectangle(cornerRadius: Tokens.Radius.md).fill(Tokens.Color.elevated))
                }

                SaveButton(isValid: isValid, isSaving: isSaving, action: save)
            }
            .padding(Tokens.Spacing.base)
        }
    }

    private func save() {
        guard let tripID = trip.id, isValid else { return }
        isSaving = true
        saveError = nil
        let dateStr = dateOnlyISO(date)
        let expense = Expense(
            tripId: tripID,
            title: title.trimmingCharacters(in: .whitespaces),
            amount: Double(amount.replacingOccurrences(of: ",", with: ".")) ?? 0,
            currency: currency,
            date: dateStr,
            category: category,
            notes: notes.isEmpty ? nil : notes
        )
        Task {
            do {
                try client.saveManualExpense(expense, tripID: tripID)
                isSaving = false
                withAnimation { showSuccess = true }
                title = ""; amount = ""; currency = "USD"; category = "other"; notes = ""
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    withAnimation { showSuccess = false }
                }
            } catch {
                isSaving = false
                saveError = error.localizedDescription
            }
        }
    }
}

// MARK: - ManualCityForm

struct ManualCityForm: View {
    let trip: Trip

    @Environment(FirestoreClient.self) private var client

    @State private var name = ""
    @State private var country = ""
    @State private var countryCode = ""

    @State private var isSaving = false
    @State private var saveError: String?
    @State private var showSuccess = false

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Tokens.Spacing.md) {
                if showSuccess {
                    SavedBanner()
                }

                if let error = saveError {
                    ErrorBanner(message: error)
                }

                FormField(label: "Nombre de la ciudad", placeholder: "Madrid", text: $name)
                    .autocorrectionDisabled()

                FormField(label: "País (opcional)", placeholder: "España", text: $country)
                    .autocorrectionDisabled()

                FormField(label: "Código país (opcional)", placeholder: "ES", text: $countryCode)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)

                SaveButton(isValid: isValid, isSaving: isSaving, action: save)
            }
            .padding(Tokens.Spacing.base)
        }
    }

    private func save() {
        guard let tripID = trip.id, isValid else { return }
        isSaving = true
        saveError = nil

        Task {
            do {
                let city = TripCity(
                    id: nil,
                    tripId: tripID,
                    name: name.trimmingCharacters(in: .whitespaces),
                    country: country.isEmpty ? nil : country.trimmingCharacters(in: .whitespaces),
                    countryCode: countryCode.isEmpty ? nil : countryCode.trimmingCharacters(in: .whitespaces),
                    color: nil,
                    days: [],
                    lat: nil,
                    lng: nil,
                    timezone: nil
                )

                try await client.createCity(city, tripID: tripID)

                isSaving = false
                withAnimation { showSuccess = true }
                name = ""; country = ""; countryCode = ""
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                    withAnimation { showSuccess = false }
                }
            } catch {
                isSaving = false
                saveError = error.localizedDescription
            }
        }
    }
}

// MARK: - Shared form components

private struct FormField: View {
    let label: String
    let placeholder: String
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Tokens.Color.textSecondary)

            TextField(placeholder, text: $text)
                .font(.system(size: 14))
                .foregroundStyle(Tokens.Color.textPrimary)
                .tint(Tokens.Color.accentBlue)
                .padding(.horizontal, Tokens.Spacing.md)
                .padding(.vertical, Tokens.Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                        .fill(Tokens.Color.elevated)
                        .overlay(
                            RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                                .stroke(Tokens.Color.border, lineWidth: 1)
                        )
                )
        }
        .frame(maxWidth: .infinity)
    }
}

private struct FormSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Tokens.Color.textTertiary)
                .textCase(.uppercase)
                .tracking(0.5)
            content()
        }
    }
}

private struct DatePickerRow: View {
    let label: String
    @Binding var selection: Date

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 14))
                .foregroundStyle(Tokens.Color.textSecondary)
            Spacer()
            DatePicker("", selection: $selection, displayedComponents: .date)
                .labelsHidden()
                .tint(Tokens.Color.accentBlue)
                .colorScheme(.dark)
        }
        .padding(.horizontal, Tokens.Spacing.md)
        .padding(.vertical, Tokens.Spacing.sm)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                .fill(Tokens.Color.elevated)
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                        .stroke(Tokens.Color.border, lineWidth: 1)
                )
        )
    }
}

private struct PriceRow: View {
    @Binding var price: String
    @Binding var currency: String
    var label: String = "Precio (opcional)"

    private let currencies = ["USD", "EUR", "ARS", "GBP", "BRL", "CLP", "MXN", "COP"]

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Tokens.Color.textSecondary)

            HStack(spacing: Tokens.Spacing.sm) {
                Menu {
                    ForEach(currencies, id: \.self) { c in
                        Button {
                            currency = c
                        } label: {
                            Label(c, systemImage: currency == c ? "checkmark" : "")
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(currency)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Tokens.Color.textPrimary)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 10))
                            .foregroundStyle(Tokens.Color.textTertiary)
                    }
                    .padding(.horizontal, Tokens.Spacing.md)
                    .padding(.vertical, Tokens.Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                            .fill(Tokens.Color.elevated)
                            .overlay(
                                RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                                    .stroke(Tokens.Color.border, lineWidth: 1)
                            )
                    )
                }

                TextField("0.00", text: $price)
                    .font(.system(size: 14))
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .tint(Tokens.Color.accentBlue)
                    .keyboardType(.decimalPad)
                    .padding(.horizontal, Tokens.Spacing.md)
                    .padding(.vertical, Tokens.Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                            .fill(Tokens.Color.elevated)
                            .overlay(
                                RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                                    .stroke(Tokens.Color.border, lineWidth: 1)
                            )
                    )
                    .frame(maxWidth: .infinity)
            }
        }
    }
}

private struct SaveButton: View {
    let isValid: Bool
    let isSaving: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Tokens.Spacing.xs) {
                if isSaving {
                    ProgressView()
                        .tint(.black)
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .semibold))
                }
                Text(isSaving ? "Guardando..." : "Guardar")
                    .font(.system(size: 15, weight: .semibold))
            }
            .foregroundStyle(isValid ? .black : Tokens.Color.textTertiary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Tokens.Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(isValid ? Tokens.Color.accentBlue : Tokens.Color.elevated)
            )
        }
        .disabled(!isValid || isSaving)
        .buttonStyle(.plain)
        .padding(.top, Tokens.Spacing.sm)
    }
}

private struct SavedBanner: View {
    var body: some View {
        HStack(spacing: Tokens.Spacing.sm) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Tokens.Color.accentGreen)
            Text("Guardado correctamente")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Tokens.Color.textPrimary)
            Spacer()
        }
        .padding(Tokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.accentGreen.opacity(0.12))
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .stroke(Tokens.Color.accentGreen.opacity(0.25), lineWidth: 1)
                )
        )
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}

private struct ErrorBanner: View {
    let message: String

    var body: some View {
        HStack(spacing: Tokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Tokens.Color.accentRed)
            Text(message)
                .font(.system(size: 13))
                .foregroundStyle(Tokens.Color.textPrimary)
                .lineLimit(2)
            Spacer()
        }
        .padding(Tokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.accentRed.opacity(0.10))
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .stroke(Tokens.Color.accentRed.opacity(0.25), lineWidth: 1)
                )
        )
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}

// MARK: - Date helpers

private func isoString(date: Date, time: String) -> String {
    let dateStr = dateOnlyISO(date)
    let timeStr = time.trimmingCharacters(in: .whitespaces)
    return "\(dateStr)T\(timeStr)"
}

func dateOnlyISO(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.locale = Locale(identifier: "en_US_POSIX")
    return formatter.string(from: date)
}

private func parseLocalApproxUTC(date: Date, time: String) -> Date {
    // Approximation: interpret time as local wall clock, store in UTC-0 as-is.
    // Cloud Function should recalculate with proper timezone if available.
    let parts = time.split(separator: ":")
    let hour = Int(parts.first ?? "0") ?? 0
    let minute = Int(parts.dropFirst().first ?? "0") ?? 0

    var components = Calendar.current.dateComponents([.year, .month, .day], from: date)
    components.hour = hour
    components.minute = minute
    components.second = 0
    return Calendar.current.date(from: components) ?? date
}

func startOfDay(_ date: Date) -> Date {
    Calendar.current.startOfDay(for: date)
}
