import FirebaseFirestore
import Foundation

extension FirestoreClient {

    /// Saves confirmed parsed items from AI parse to Firestore under the trip.
    /// Writes snake_case fields matching the web schema.
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
            tripId: tripID,
            airline: parsed.airline ?? "",
            flightNumber: parsed.flightNumber ?? "",
            originIATA: parsed.originIATA ?? "",
            destinationIATA: parsed.destIATA ?? "",
            departureLocalTime: parsed.departureLocalTime ?? "",
            departureTimezone: parsed.departureTimezone,
            departureUTC: depUTC,
            arrivalLocalTime: parsed.arrivalLocalTime ?? "",
            arrivalTimezone: parsed.arrivalTimezone,
            arrivalUTC: arrUTC,
            durationMinutes: Int(arrUTC.timeIntervalSince(depUTC) / 60),
            bookingRef: parsed.bookingRef
        )
        try userCollection("trips").document(tripID).collection("flights").addDocument(from: flight)
    }

    private func saveHotelFromParsed(_ parsed: ParsedHotel, tripID: String) async throws {
        let hotel = Hotel(
            tripId: tripID,
            name: parsed.name ?? "",
            checkIn: parsed.checkIn ?? "",
            checkOut: parsed.checkOut ?? "",
            bookingRef: parsed.bookingRef
        )
        try userCollection("trips").document(tripID).collection("hotels").addDocument(from: hotel)
    }

    private func saveTransportFromParsed(_ parsed: ParsedTransport, tripID: String) async throws {
        let depUTC = utcDate(from: parsed.departureLocalTime, tz: parsed.departureTimezone) ?? Date()

        let transport = Transport(
            tripId: tripID,
            type: parsed.mode ?? "other",
            origin: parsed.origin ?? "",
            destination: parsed.destination ?? "",
            departureLocalTime: parsed.departureLocalTime ?? "",
            departureTimezone: parsed.departureTimezone,
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
}
