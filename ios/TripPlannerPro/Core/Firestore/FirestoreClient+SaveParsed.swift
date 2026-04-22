import FirebaseFirestore
import Foundation

extension FirestoreClient {

    // Saves confirmed parsed items from AI parse to Firestore under the trip.
    func saveParsedItems(_ items: [ParsedItem], tripID: String) async throws {
        for item in items {
            switch item {
            case .flight(let parsed):
                try await saveFlightFromParsed(parsed, tripID: tripID)
            case .hotel(let parsed):
                try await saveHotelFromParsed(parsed, tripID: tripID)
            case .transport(let parsed):
                try await saveTransportFromParsed(parsed, tripID: tripID)
            }
        }
    }

    private func saveFlightFromParsed(_ parsed: ParsedFlight, tripID: String) async throws {
        let depUTC = utcDate(from: parsed.departureLocalTime, tz: parsed.departureTimezone) ?? Date()
        let arrUTC = utcDate(from: parsed.arrivalLocalTime, tz: parsed.arrivalTimezone) ?? depUTC

        let flight = Flight(
            airline: parsed.airline ?? "",
            flightNumber: parsed.flightNumber ?? "",
            originIATA: parsed.originIATA ?? "",
            destIATA: parsed.destIATA ?? "",
            departureLocal: parsed.departureLocalTime ?? "",
            arrivalLocal: parsed.arrivalLocalTime ?? "",
            departureUTC: depUTC,
            arrivalUTC: arrUTC,
            durationMinutes: Int(arrUTC.timeIntervalSince(depUTC) / 60),
            bookingRef: parsed.bookingRef
        )
        try userCollection("trips").document(tripID).collection("flights").addDocument(from: flight)
    }

    private func saveHotelFromParsed(_ parsed: ParsedHotel, tripID: String) async throws {
        let checkInUTC = dateFromISO(parsed.checkIn) ?? Date()
        let checkOutUTC = dateFromISO(parsed.checkOut) ?? checkInUTC

        let hotel = Hotel(
            name: parsed.name ?? "",
            checkInLocal: parsed.checkIn ?? "",
            checkOutLocal: parsed.checkOut ?? "",
            checkInUTC: checkInUTC,
            checkOutUTC: checkOutUTC,
            bookingRef: parsed.bookingRef
        )
        try userCollection("trips").document(tripID).collection("hotels").addDocument(from: hotel)
    }

    private func saveTransportFromParsed(_ parsed: ParsedTransport, tripID: String) async throws {
        let depUTC = utcDate(from: parsed.departureLocalTime, tz: parsed.departureTimezone) ?? Date()

        let transport = Transport(
            type: parsed.mode ?? "other",
            description: [parsed.origin, parsed.destination].compactMap { $0 }.joined(separator: " → "),
            departureLocal: parsed.departureLocalTime ?? "",
            departureUTC: depUTC,
            bookingRef: parsed.bookingRef
        )
        try userCollection("trips").document(tripID).collection("transports").addDocument(from: transport)
    }

    // MARK: - Date helpers

    private func utcDate(from localISO: String?, tz tzString: String?) -> Date? {
        guard let local = localISO, let tz = tzString else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime]
        guard let timeZone = TimeZone(identifier: tz) else { return nil }
        formatter.timeZone = timeZone
        return formatter.date(from: local)
    }

    private func dateFromISO(_ string: String?) -> Date? {
        guard let s = string else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter.date(from: s)
    }
}
