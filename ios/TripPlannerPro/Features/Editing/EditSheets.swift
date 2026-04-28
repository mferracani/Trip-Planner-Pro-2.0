import SwiftUI

// MARK: - FlightEditSheet

struct FlightEditSheet: View {
    let tripID: String
    let existing: Flight
    let onClose: () -> Void

    @Environment(FirestoreClient.self) private var client

    @State private var airline: String
    @State private var flightNumber: String
    @State private var originIATA: String
    @State private var destinationIATA: String
    @State private var departureLocalTime: String
    @State private var departureTimezone: String
    @State private var arrivalLocalTime: String
    @State private var arrivalTimezone: String
    @State private var cabinClass: String
    @State private var seat: String
    @State private var bookingRef: String
    @State private var price: Double?
    @State private var currency: String
    @State private var priceUSD: Double?
    @State private var paidAmount: Double?

    @State private var saving = false
    @State private var error: String?

    init(tripID: String, existing: Flight, onClose: @escaping () -> Void) {
        self.tripID = tripID
        self.existing = existing
        self.onClose = onClose
        _airline = State(initialValue: existing.airline)
        _flightNumber = State(initialValue: existing.flightNumber)
        _originIATA = State(initialValue: existing.originIATA)
        _destinationIATA = State(initialValue: existing.destinationIATA)
        _departureLocalTime = State(initialValue: existing.departureLocalTime)
        _departureTimezone = State(initialValue: existing.departureTimezone ?? TimeZone.current.identifier)
        _arrivalLocalTime = State(initialValue: existing.arrivalLocalTime)
        _arrivalTimezone = State(initialValue: existing.arrivalTimezone ?? TimeZone.current.identifier)
        _cabinClass = State(initialValue: existing.cabinClass ?? "")
        _seat = State(initialValue: existing.seat ?? "")
        _bookingRef = State(initialValue: existing.bookingRef ?? "")
        _price = State(initialValue: existing.price)
        _currency = State(initialValue: existing.currency ?? "USD")
        _priceUSD = State(initialValue: existing.priceUSD)
        _paidAmount = State(initialValue: existing.paidAmount)
    }

    private var canSave: Bool {
        !airline.trimmingCharacters(in: .whitespaces).isEmpty
            && !flightNumber.trimmingCharacters(in: .whitespaces).isEmpty
            && !originIATA.trimmingCharacters(in: .whitespaces).isEmpty
            && !destinationIATA.trimmingCharacters(in: .whitespaces).isEmpty
            && !departureLocalTime.isEmpty
            && !arrivalLocalTime.isEmpty
    }

    var body: some View {
        EditSheetShell(
            title: "\(originIATA) → \(destinationIATA)",
            isEditing: true,
            canSave: canSave,
            isSaving: saving,
            error: error,
            onCancel: onClose,
            onSave: save,
            onDelete: existing.id != nil ? Optional(delete) : nil
        ) {
            VStack(spacing: 12) {
                HStack(spacing: 10) {
                    EditField(label: "Aerolínea") {
                        TextFieldInput(text: $airline, placeholder: "Iberia")
                    }
                    EditField(label: "Número") {
                        TextFieldInput(text: $flightNumber, placeholder: "IB6844", uppercase: true, autocorrect: false)
                    }
                }

                HStack(spacing: 10) {
                    EditField(label: "Origen") {
                        TextFieldInput(text: $originIATA, placeholder: "EZE", uppercase: true, autocorrect: false)
                    }
                    EditField(label: "Destino") {
                        TextFieldInput(text: $destinationIATA, placeholder: "MAD", uppercase: true, autocorrect: false)
                    }
                }

                EditField(label: "Salida (local)") {
                    LocalDateTimeInput(value: $departureLocalTime)
                }
                EditField(label: "Timezone salida") {
                    PickerInput(selection: $departureTimezone,
                                options: CommonTimezones.options.map { ($0, $0) })
                }
                EditField(label: "Llegada (local)") {
                    LocalDateTimeInput(value: $arrivalLocalTime)
                }
                EditField(label: "Timezone llegada") {
                    PickerInput(selection: $arrivalTimezone,
                                options: CommonTimezones.options.map { ($0, $0) })
                }

                HStack(spacing: 10) {
                    EditField(label: "Clase") {
                        TextFieldInput(text: $cabinClass, placeholder: "Economy")
                    }
                    EditField(label: "Asiento") {
                        TextFieldInput(text: $seat, placeholder: "24A", uppercase: true, autocorrect: false)
                    }
                }

                EditField(label: "Booking ref") {
                    TextFieldInput(text: $bookingRef, placeholder: "ABC123", uppercase: true, autocorrect: false)
                }

                priceBlock()
            }
        }
    }

    @ViewBuilder
    private func priceBlock() -> some View {
        HStack(alignment: .top, spacing: 10) {
            EditField(label: "Precio") {
                DoubleInput(value: $price, placeholder: "850")
            }
            EditField(label: "Moneda") {
                PickerInput(selection: $currency,
                            options: CommonCurrencies.options.map { ($0, $0) })
            }
            EditField(label: "USD") {
                DoubleInput(value: $priceUSD, placeholder: "850")
            }
        }
        EditField(label: "Pagado", hint: "Monto ya abonado en la misma moneda") {
            DoubleInput(value: $paidAmount, placeholder: "0")
        }
    }

    private func save() {
        saving = true
        error = nil
        Task {
            do {
                var updated = existing
                updated.airline = airline.trimmingCharacters(in: .whitespaces)
                updated.flightNumber = flightNumber.trimmingCharacters(in: .whitespaces).uppercased()
                updated.originIATA = originIATA.trimmingCharacters(in: .whitespaces).uppercased()
                updated.destinationIATA = destinationIATA.trimmingCharacters(in: .whitespaces).uppercased()
                updated.departureLocalTime = departureLocalTime
                updated.departureTimezone = departureTimezone
                updated.arrivalLocalTime = arrivalLocalTime
                updated.arrivalTimezone = arrivalTimezone
                updated.cabinClass = cabinClass.trimmingCharacters(in: .whitespaces).isEmpty ? nil : cabinClass
                updated.seat = seat.trimmingCharacters(in: .whitespaces).isEmpty ? nil : seat.uppercased()
                updated.bookingRef = bookingRef.trimmingCharacters(in: .whitespaces).isEmpty ? nil : bookingRef.uppercased()
                updated.price = price
                updated.currency = price != nil ? currency : nil
                updated.priceUSD = priceUSD
                updated.paidAmount = paidAmount
                updated.departureUTC = parseUTC(local: departureLocalTime, tz: departureTimezone)
                updated.arrivalUTC = parseUTC(local: arrivalLocalTime, tz: arrivalTimezone)
                if let dep = updated.departureUTC, let arr = updated.arrivalUTC {
                    updated.durationMinutes = Int(arr.timeIntervalSince(dep) / 60)
                }

                if existing.id == nil {
                    try await client.createFlight(updated, tripID: tripID)
                } else {
                    try await client.updateFlight(updated, tripID: tripID)
                }
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }

    private func delete() {
        guard let id = existing.id else { return }
        saving = true
        error = nil
        Task {
            do {
                try await client.deleteFlight(id: id, tripID: tripID)
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }
}

// MARK: - HotelEditSheet

struct HotelEditSheet: View {
    let tripID: String
    let existing: Hotel
    let onClose: () -> Void

    @Environment(FirestoreClient.self) private var client

    @State private var name: String
    @State private var brand: String
    @State private var checkIn: Date
    @State private var checkOut: Date
    @State private var roomType: String
    @State private var bookingRef: String
    @State private var pricePerNight: Double?
    @State private var totalPrice: Double?
    @State private var currency: String
    @State private var totalPriceUSD: Double?
    @State private var paidAmount: Double?

    @State private var saving = false
    @State private var error: String?

    init(tripID: String, existing: Hotel, onClose: @escaping () -> Void) {
        self.tripID = tripID
        self.existing = existing
        self.onClose = onClose
        _name = State(initialValue: existing.name)
        _brand = State(initialValue: existing.brand ?? "")
        _checkIn = State(initialValue: Trip.isoDateFormatter.date(from: existing.checkIn) ?? Date())
        _checkOut = State(initialValue: Trip.isoDateFormatter.date(from: existing.checkOut) ?? Date())
        _roomType = State(initialValue: existing.roomType ?? "")
        _bookingRef = State(initialValue: existing.bookingRef ?? "")
        _pricePerNight = State(initialValue: existing.pricePerNight)
        _totalPrice = State(initialValue: existing.totalPrice)
        _currency = State(initialValue: existing.currency ?? "USD")
        _totalPriceUSD = State(initialValue: existing.totalPriceUSD)
        _paidAmount = State(initialValue: existing.paidAmount)
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && checkOut > checkIn
    }

    var body: some View {
        EditSheetShell(
            title: name.isEmpty ? "Hotel" : name,
            isEditing: true,
            canSave: canSave,
            isSaving: saving,
            error: error,
            onCancel: onClose,
            onSave: save,
            onDelete: existing.id != nil ? Optional(delete) : nil
        ) {
            VStack(spacing: 12) {
                EditField(label: "Nombre") {
                    TextFieldInput(text: $name, placeholder: "NH Collection")
                }
                EditField(label: "Cadena / brand") {
                    TextFieldInput(text: $brand, placeholder: "NH")
                }

                HStack(spacing: 10) {
                    EditField(label: "Check-in") {
                        EditDatePicker(label: "", date: $checkIn)
                    }
                    EditField(label: "Check-out") {
                        EditDatePicker(label: "", date: $checkOut)
                    }
                }

                EditField(label: "Habitación") {
                    TextFieldInput(text: $roomType, placeholder: "Deluxe King")
                }

                EditField(label: "Booking ref") {
                    TextFieldInput(text: $bookingRef, placeholder: "NH-442189", uppercase: true, autocorrect: false)
                }

                HStack(spacing: 10) {
                    EditField(label: "Por noche") {
                        DoubleInput(value: $pricePerNight, placeholder: "153")
                    }
                    EditField(label: "Total") {
                        DoubleInput(value: $totalPrice, placeholder: "612")
                    }
                }
                HStack(spacing: 10) {
                    EditField(label: "Moneda") {
                        PickerInput(selection: $currency,
                                    options: CommonCurrencies.options.map { ($0, $0) })
                    }
                    EditField(label: "USD total") {
                        DoubleInput(value: $totalPriceUSD, placeholder: "668")
                    }
                }

                EditField(label: "Pagado", hint: "Monto ya abonado en la misma moneda") {
                    DoubleInput(value: $paidAmount, placeholder: "0")
                }
            }
        }
    }

    private func save() {
        saving = true
        error = nil
        Task {
            do {
                var updated = existing
                updated.name = name.trimmingCharacters(in: .whitespaces)
                updated.brand = brand.trimmingCharacters(in: .whitespaces).isEmpty ? nil : brand
                updated.checkIn = Trip.isoDateFormatter.string(from: checkIn)
                updated.checkOut = Trip.isoDateFormatter.string(from: checkOut)
                updated.roomType = roomType.trimmingCharacters(in: .whitespaces).isEmpty ? nil : roomType
                updated.bookingRef = bookingRef.trimmingCharacters(in: .whitespaces).isEmpty ? nil : bookingRef.uppercased()
                updated.pricePerNight = pricePerNight
                updated.totalPrice = totalPrice
                updated.currency = totalPrice != nil || pricePerNight != nil ? currency : nil
                updated.totalPriceUSD = totalPriceUSD
                updated.paidAmount = paidAmount
                if existing.id == nil {
                    try await client.createHotel(updated, tripID: tripID)
                } else {
                    try await client.updateHotel(updated, tripID: tripID)
                }
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }

    private func delete() {
        guard let id = existing.id else { return }
        saving = true
        error = nil
        Task {
            do {
                try await client.deleteHotel(id: id, tripID: tripID)
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }
}

// MARK: - TransportEditSheet

struct TransportEditSheet: View {
    let tripID: String
    let existing: Transport
    let onClose: () -> Void

    @Environment(FirestoreClient.self) private var client

    @State private var type: String
    @State private var origin: String
    @State private var destination: String
    @State private var departureLocalTime: String
    @State private var departureTimezone: String
    @State private var arrivalLocalTime: String
    @State private var arrivalTimezone: String
    @State private var carrier: String
    @State private var bookingRef: String
    @State private var price: Double?
    @State private var currency: String
    @State private var priceUSD: Double?
    @State private var paidAmount: Double?

    @State private var saving = false
    @State private var error: String?

    private let typeOptions = [
        ("train", "Tren"), ("bus", "Bus"), ("ferry", "Ferry"),
        ("car", "Auto"), ("taxi", "Taxi"), ("subway", "Subte"),
        ("other", "Otro")
    ]

    init(tripID: String, existing: Transport, onClose: @escaping () -> Void) {
        self.tripID = tripID
        self.existing = existing
        self.onClose = onClose
        _type = State(initialValue: existing.type)
        _origin = State(initialValue: existing.origin)
        _destination = State(initialValue: existing.destination)
        _departureLocalTime = State(initialValue: existing.departureLocalTime)
        _departureTimezone = State(initialValue: existing.departureTimezone ?? TimeZone.current.identifier)
        _arrivalLocalTime = State(initialValue: existing.arrivalLocalTime ?? "")
        _arrivalTimezone = State(initialValue: existing.arrivalTimezone ?? TimeZone.current.identifier)
        _carrier = State(initialValue: existing.operator ?? "")
        _bookingRef = State(initialValue: existing.bookingRef ?? "")
        _price = State(initialValue: existing.price)
        _currency = State(initialValue: existing.currency ?? "USD")
        _priceUSD = State(initialValue: existing.priceUSD)
        _paidAmount = State(initialValue: existing.paidAmount)
    }

    private var canSave: Bool {
        !origin.trimmingCharacters(in: .whitespaces).isEmpty
            && !destination.trimmingCharacters(in: .whitespaces).isEmpty
            && !departureLocalTime.isEmpty
    }

    var body: some View {
        EditSheetShell(
            title: "\(origin) → \(destination)",
            isEditing: true,
            canSave: canSave,
            isSaving: saving,
            error: error,
            onCancel: onClose,
            onSave: save,
            onDelete: existing.id != nil ? Optional(delete) : nil
        ) {
            VStack(spacing: 12) {
                EditField(label: "Tipo") {
                    PickerInput(selection: $type, options: typeOptions)
                }

                HStack(spacing: 10) {
                    EditField(label: "Origen") {
                        TextFieldInput(text: $origin, placeholder: "Madrid Atocha")
                    }
                    EditField(label: "Destino") {
                        TextFieldInput(text: $destination, placeholder: "Barcelona Sants")
                    }
                }

                EditField(label: "Salida (local)") {
                    LocalDateTimeInput(value: $departureLocalTime)
                }
                EditField(label: "Timezone salida") {
                    PickerInput(selection: $departureTimezone,
                                options: CommonTimezones.options.map { ($0, $0) })
                }
                EditField(label: "Llegada (local, opcional)") {
                    LocalDateTimeInput(value: $arrivalLocalTime)
                }
                EditField(label: "Timezone llegada") {
                    PickerInput(selection: $arrivalTimezone,
                                options: CommonTimezones.options.map { ($0, $0) })
                }

                EditField(label: "Operador") {
                    TextFieldInput(text: $carrier, placeholder: "Renfe AVE")
                }
                EditField(label: "Booking ref") {
                    TextFieldInput(text: $bookingRef, placeholder: "ABC123", uppercase: true, autocorrect: false)
                }

                HStack(spacing: 10) {
                    EditField(label: "Precio") {
                        DoubleInput(value: $price, placeholder: "89")
                    }
                    EditField(label: "Moneda") {
                        PickerInput(selection: $currency,
                                    options: CommonCurrencies.options.map { ($0, $0) })
                    }
                    EditField(label: "USD") {
                        DoubleInput(value: $priceUSD, placeholder: "97")
                    }
                }
                EditField(label: "Pagado") {
                    DoubleInput(value: $paidAmount, placeholder: "0")
                }
            }
        }
    }

    private func save() {
        saving = true
        error = nil
        Task {
            do {
                var updated = existing
                updated.type = type
                updated.origin = origin.trimmingCharacters(in: .whitespaces)
                updated.destination = destination.trimmingCharacters(in: .whitespaces)
                updated.departureLocalTime = departureLocalTime
                updated.departureTimezone = departureTimezone
                updated.arrivalLocalTime = arrivalLocalTime.isEmpty ? nil : arrivalLocalTime
                updated.arrivalTimezone = arrivalLocalTime.isEmpty ? nil : arrivalTimezone
                updated.operator = carrier.trimmingCharacters(in: .whitespaces).isEmpty ? nil : carrier
                updated.bookingRef = bookingRef.trimmingCharacters(in: .whitespaces).isEmpty ? nil : bookingRef.uppercased()
                updated.price = price
                updated.currency = price != nil ? currency : nil
                updated.priceUSD = priceUSD
                updated.paidAmount = paidAmount
                updated.departureUTC = parseUTC(local: departureLocalTime, tz: departureTimezone)
                if let arr = updated.arrivalLocalTime {
                    updated.arrivalUTC = parseUTC(local: arr, tz: arrivalTimezone)
                } else {
                    updated.arrivalUTC = nil
                }

                if existing.id == nil {
                    try await client.createTransport(updated, tripID: tripID)
                } else {
                    try await client.updateTransport(updated, tripID: tripID)
                }
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }

    private func delete() {
        guard let id = existing.id else { return }
        saving = true
        error = nil
        Task {
            do {
                try await client.deleteTransport(id: id, tripID: tripID)
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }
}

// MARK: - ExpenseEditSheet

struct ExpenseEditSheet: View {
    let tripID: String
    let existing: Expense
    let onClose: () -> Void

    @Environment(FirestoreClient.self) private var client

    @State private var title: String
    @State private var category: String
    @State private var amount: Double?
    @State private var currency: String
    @State private var amountUSD: Double?
    @State private var paidAmount: Double?
    @State private var date: Date
    @State private var notes: String

    @State private var saving = false
    @State private var error: String?

    private let categoryOptions: [(String, String)] = [
        ("flight", "Vuelo"),
        ("hotel", "Hotel"),
        ("transport", "Transporte"),
        ("food", "Comida"),
        ("activity", "Actividad"),
        ("shopping", "Compras"),
        ("other", "Otro")
    ]

    init(tripID: String, existing: Expense, onClose: @escaping () -> Void) {
        self.tripID = tripID
        self.existing = existing
        self.onClose = onClose
        _title = State(initialValue: existing.title)
        _category = State(initialValue: existing.category)
        _amount = State(initialValue: existing.amount)
        _currency = State(initialValue: existing.currency)
        _amountUSD = State(initialValue: existing.amountUSD)
        _paidAmount = State(initialValue: existing.paidAmount)
        _date = State(initialValue: Trip.isoDateFormatter.date(from: existing.date) ?? Date())
        _notes = State(initialValue: existing.notes ?? "")
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty && amount != nil
    }

    var body: some View {
        EditSheetShell(
            title: title.isEmpty ? "Gasto" : title,
            isEditing: true,
            canSave: canSave,
            isSaving: saving,
            error: error,
            onCancel: onClose,
            onSave: save,
            onDelete: existing.id != nil ? Optional(delete) : nil
        ) {
            VStack(spacing: 12) {
                EditField(label: "Título") {
                    TextFieldInput(text: $title, placeholder: "Museo del Prado")
                }
                EditField(label: "Categoría") {
                    PickerInput(selection: $category, options: categoryOptions)
                }

                HStack(spacing: 10) {
                    EditField(label: "Monto") {
                        DoubleInput(value: $amount, placeholder: "25")
                    }
                    EditField(label: "Moneda") {
                        PickerInput(selection: $currency,
                                    options: CommonCurrencies.options.map { ($0, $0) })
                    }
                    EditField(label: "USD") {
                        DoubleInput(value: $amountUSD, placeholder: "25")
                    }
                }

                EditField(label: "Fecha") {
                    EditDatePicker(label: "", date: $date)
                }
                EditField(label: "Pagado") {
                    DoubleInput(value: $paidAmount, placeholder: "0")
                }
                EditField(label: "Notas") {
                    TextFieldInput(text: $notes, placeholder: "")
                }
            }
        }
    }

    private func save() {
        saving = true
        error = nil
        Task {
            do {
                var updated = existing
                updated.title = title.trimmingCharacters(in: .whitespaces)
                updated.category = category
                updated.amount = amount ?? 0
                updated.currency = currency
                updated.amountUSD = amountUSD
                updated.paidAmount = paidAmount
                updated.date = Trip.isoDateFormatter.string(from: date)
                updated.notes = notes.trimmingCharacters(in: .whitespaces).isEmpty ? nil : notes
                if existing.id == nil {
                    try await client.createExpense(updated, tripID: tripID)
                } else {
                    try await client.updateExpense(updated, tripID: tripID)
                }
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }

    private func delete() {
        guard let id = existing.id else { return }
        saving = true
        error = nil
        Task {
            do {
                try await client.deleteExpense(id: id, tripID: tripID)
                onClose()
            } catch {
                self.error = error.localizedDescription
                saving = false
            }
        }
    }
}

// MARK: - Shared

func parseUTC(local: String, tz: String) -> Date? {
    guard !local.isEmpty, let timeZone = TimeZone(identifier: tz) else { return nil }
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd'T'HH:mm"
    f.timeZone = timeZone
    f.locale = Locale(identifier: "en_US_POSIX")
    return f.date(from: local)
}
