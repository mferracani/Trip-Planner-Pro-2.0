import FirebaseFirestore
import Foundation

enum TripStatus: String, Codable, Sendable {
    case planned, active, past
}

struct Trip: Identifiable, Codable, Sendable, Equatable {
    @DocumentID var id: String?
    var name: String
    var startDate: Date
    var endDate: Date
    var coverImageURL: String?
    var status: TripStatus
    var cityOrder: [String]
    var createdAt: Date

    // Computed, not stored
    var status_computed: TripStatus {
        let now = Date()
        if now < startDate { return .planned }
        if now > endDate { return .past }
        return .active
    }

    var daysUntilStart: Int {
        Calendar.current.dateComponents([.day], from: .now, to: startDate).day ?? 0
    }

    var currentDayNumber: Int {
        Calendar.current.dateComponents([.day], from: startDate, to: .now).day.map { $0 + 1 } ?? 1
    }
}

struct TripCity: Identifiable, Codable, Sendable {
    @DocumentID var id: String?
    var name: String
    var countryCode: String
    var colorIndex: Int
    var startDate: Date
    var endDate: Date

    var color: some Hashable { colorIndex }
}

struct Flight: Identifiable, Codable, Sendable {
    @DocumentID var id: String?
    var airline: String
    var flightNumber: String
    var originIATA: String
    var destIATA: String
    var departureLocal: String
    var arrivalLocal: String
    var departureUTC: Date
    var arrivalUTC: Date
    var durationMinutes: Int
    var bookingRef: String?
    var price: Double?
    var currency: String?
    var cityId: String?
}

struct Hotel: Identifiable, Codable, Sendable {
    @DocumentID var id: String?
    var name: String
    var address: String?
    var checkInLocal: String
    var checkOutLocal: String
    var checkInUTC: Date
    var checkOutUTC: Date
    var bookingRef: String?
    var price: Double?
    var currency: String?
    var cityId: String?
}

struct Transport: Identifiable, Codable, Sendable {
    @DocumentID var id: String?
    var type: String
    var description: String
    var departureLocal: String
    var arrivalLocal: String?
    var departureUTC: Date
    var bookingRef: String?
    var price: Double?
    var currency: String?
    var cityId: String?
}
