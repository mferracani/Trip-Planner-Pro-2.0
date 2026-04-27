@preconcurrency import FirebaseFirestore
import Foundation
import SwiftUI

enum TripStatus: String, Codable, Sendable {
    case draft, planned, active, past
}

// MARK: - Trip

struct Trip: Identifiable, Codable, Sendable, Equatable, Hashable {
    @DocumentID var id: String?
    var name: String
    var startDateString: String
    var endDateString: String
    var coverURL: String?
    var createdAt: Date
    var updatedAt: Date?
    var totalUSD: Double?
    var citiesCount: Int?
    /// Persisted status — "draft" or "planned". When nil, status is inferred from dates.
    var statusStored: TripStatus?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case startDateString = "start_date"
        case endDateString = "end_date"
        case coverURL = "cover_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case totalUSD = "total_usd"
        case citiesCount = "cities_count"
        case statusStored = "status"
    }

    static let isoDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    var startDate: Date { Self.isoDateFormatter.date(from: startDateString) ?? createdAt }
    var endDate: Date { Self.isoDateFormatter.date(from: endDateString) ?? startDate }

    /// Returns the effective status:
    /// - If `statusStored == .draft`, always returns `.draft`.
    /// - Otherwise, infers from current date vs trip dates.
    var status: TripStatus {
        if statusStored == .draft { return .draft }
        return status_computed
    }

    var status_computed: TripStatus {
        let now = Date()
        if now < startDate { return .planned }
        if now > endDate { return .past }
        return .active
    }
    var daysUntilStart: Int { Calendar.current.dateComponents([.day], from: .now, to: startDate).day ?? 0 }
    var currentDayNumber: Int { Calendar.current.dateComponents([.day], from: startDate, to: .now).day.map { $0 + 1 } ?? 1 }
    var cityOrder: [String] { [] }

    init(
        id: String? = nil,
        name: String,
        startDate: Date,
        endDate: Date,
        coverURL: String? = nil,
        statusStored: TripStatus? = nil,
        createdAt: Date = .now,
        totalUSD: Double? = nil,
        citiesCount: Int? = nil
    ) {
        self._id = .init(wrappedValue: id)
        self.name = name
        self.startDateString = Self.isoDateFormatter.string(from: startDate)
        self.endDateString = Self.isoDateFormatter.string(from: endDate)
        self.coverURL = coverURL
        self.statusStored = statusStored
        self.createdAt = createdAt
        self.updatedAt = createdAt
        self.totalUSD = totalUSD
        self.citiesCount = citiesCount
    }

    init(
        id: String? = nil,
        name: String,
        startDate: Date,
        endDate: Date,
        status: TripStatus,
        cityOrder: [String],
        createdAt: Date
    ) {
        self.init(id: id, name: name, startDate: startDate, endDate: endDate, statusStored: status == .draft ? .draft : nil, createdAt: createdAt)
    }
}

// MARK: - TripCity

struct TripCity: Identifiable, Codable, Sendable {
    @DocumentID var id: String?
    var tripId: String?
    var name: String
    var country: String?
    var countryCode: String?
    var color: String?
    var days: [String]
    var lat: Double?
    var lng: Double?
    var timezone: String?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case name
        case country
        case countryCode = "country_code"
        case color
        case days
        case lat
        case lng
        case timezone
    }

    var swiftColor: Color {
        if let hex = color, let value = Self.parseHex(hex) {
            return Color(hex: value)
        }
        return Tokens.Color.cityPalette[abs(name.hashValue) % Tokens.Color.cityPalette.count]
    }

    var sortedDays: [String] { days.sorted() }

    static func parseHex(_ s: String) -> UInt32? {
        var hex = s
        if hex.hasPrefix("#") { hex.removeFirst() }
        return UInt32(hex, radix: 16)
    }
}

// MARK: - Flight
//
// Matches web schema exactly: flat fields, snake_case, Timestamps for UTC.
struct Flight: Identifiable, Codable, Sendable {
    @DocumentID var id: String?
    var tripId: String?
    var airline: String
    var flightNumber: String
    var originIATA: String
    var destinationIATA: String
    var departureLocalTime: String  // "yyyy-MM-ddTHH:mm"
    var departureTimezone: String?
    var departureUTC: Date?
    var arrivalLocalTime: String
    var arrivalTimezone: String?
    var arrivalUTC: Date?
    var durationMinutes: Int?
    var cabinClass: String?
    var seat: String?
    var bookingRef: String?
    var price: Double?
    var currency: String?
    var priceUSD: Double?
    var paidAmount: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case airline
        case flightNumber = "flight_number"
        case originIATA = "origin_iata"
        case destinationIATA = "destination_iata"
        case departureLocalTime = "departure_local_time"
        case departureTimezone = "departure_timezone"
        case departureUTC = "departure_utc"
        case arrivalLocalTime = "arrival_local_time"
        case arrivalTimezone = "arrival_timezone"
        case arrivalUTC = "arrival_utc"
        case durationMinutes = "duration_minutes"
        case cabinClass = "cabin_class"
        case seat
        case bookingRef = "booking_ref"
        case price
        case currency
        case priceUSD = "price_usd"
        case paidAmount = "paid_amount"
    }

    /// "YYYY-MM-DD" of departure — extracted from departure_local_time.
    var departureDate: String {
        String(departureLocalTime.prefix(10))
    }

    /// "YYYY-MM-DD" of arrival — extracted from arrival_local_time.
    var arrivalDate: String {
        String(arrivalLocalTime.prefix(10))
    }

    /// "HH:MM" — departure time in local zone.
    var departureTime: String {
        guard departureLocalTime.contains("T") else { return "" }
        return departureLocalTime.split(separator: "T").last.map { String($0.prefix(5)) } ?? ""
    }

    /// "HH:MM" — arrival time in local zone.
    var arrivalTime: String {
        guard arrivalLocalTime.contains("T") else { return "" }
        return arrivalLocalTime.split(separator: "T").last.map { String($0.prefix(5)) } ?? ""
    }
}

// MARK: - Hotel

struct Hotel: Identifiable, Codable, Sendable {
    @DocumentID var id: String?
    var tripId: String?
    var cityId: String?
    var name: String
    var brand: String?
    var checkIn: String   // "YYYY-MM-DD"
    var checkOut: String
    var roomType: String?
    var bookingRef: String?
    var pricePerNight: Double?
    var totalPrice: Double?
    var currency: String?
    var totalPriceUSD: Double?
    var paidAmount: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case cityId = "city_id"
        case name
        case brand
        case checkIn = "check_in"
        case checkOut = "check_out"
        case roomType = "room_type"
        case bookingRef = "booking_ref"
        case pricePerNight = "price_per_night"
        case totalPrice = "total_price"
        case currency
        case totalPriceUSD = "total_price_usd"
        case paidAmount = "paid_amount"
    }

    var nights: Int {
        guard let a = Trip.isoDateFormatter.date(from: checkIn),
              let b = Trip.isoDateFormatter.date(from: checkOut) else { return 0 }
        return Calendar.current.dateComponents([.day], from: a, to: b).day ?? 0
    }

    /// Returns all dates (as "YYYY-MM-DD") that this hotel occupies —
    /// inclusive of check-in, exclusive of check-out (standard hotel semantics).
    var occupiedDays: [String] {
        guard let start = Trip.isoDateFormatter.date(from: checkIn),
              let end = Trip.isoDateFormatter.date(from: checkOut) else { return [] }
        var days: [String] = []
        var cursor = Calendar.current.startOfDay(for: start)
        let endOfDay = Calendar.current.startOfDay(for: end)
        while cursor < endOfDay {
            days.append(Trip.isoDateFormatter.string(from: cursor))
            cursor = Calendar.current.date(byAdding: .day, value: 1, to: cursor)!
        }
        return days
    }
}

// MARK: - Transport

struct Transport: Identifiable, Codable, Sendable {
    @DocumentID var id: String?
    var tripId: String?
    var type: String  // "train" | "bus" | "ferry" | "car" | "taxi" | "subway" | "other"
    var origin: String
    var destination: String
    var departureLocalTime: String
    var departureTimezone: String?
    var departureUTC: Date?
    var arrivalLocalTime: String?
    var arrivalTimezone: String?
    var arrivalUTC: Date?
    var `operator`: String?
    var bookingRef: String?
    var price: Double?
    var currency: String?
    var priceUSD: Double?
    var paidAmount: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case type
        case origin
        case destination
        case departureLocalTime = "departure_local_time"
        case departureTimezone = "departure_timezone"
        case departureUTC = "departure_utc"
        case arrivalLocalTime = "arrival_local_time"
        case arrivalTimezone = "arrival_timezone"
        case arrivalUTC = "arrival_utc"
        case `operator`
        case bookingRef = "booking_ref"
        case price
        case currency
        case priceUSD = "price_usd"
        case paidAmount = "paid_amount"
    }

    var departureDate: String { String(departureLocalTime.prefix(10)) }

    var departureTime: String {
        guard departureLocalTime.contains("T") else { return "" }
        return departureLocalTime.split(separator: "T").last.map { String($0.prefix(5)) } ?? ""
    }

    var arrivalTime: String? {
        guard let s = arrivalLocalTime, s.contains("T") else { return nil }
        return s.split(separator: "T").last.map { String($0.prefix(5)) }
    }
}

// MARK: - Expense

struct Expense: Identifiable, Codable, Sendable, Hashable {
    @DocumentID var id: String?
    var tripId: String?
    var title: String
    var amount: Double
    var currency: String
    var amountUSD: Double?
    var paidAmount: Double?
    var date: String
    var category: String
    var notes: String?
    var linkedItemId: String?
    var linkedItemType: String?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case title
        case amount
        case currency
        case amountUSD = "amount_usd"
        case paidAmount = "paid_amount"
        case date
        case category
        case notes
        case linkedItemId = "linked_item_id"
        case linkedItemType = "linked_item_type"
    }

    var categoryKind: ExpenseCategory {
        ExpenseCategory(rawValue: category.lowercased()) ?? .other
    }
}

enum ExpenseCategory: String, CaseIterable, Sendable {
    case flight, hotel, transport, food, activity, shopping, other
    case lodging, transit, train, bus, taxi, meal, restaurant, tour, ticket

    var emoji: String {
        switch self {
        case .flight: return "✈"
        case .hotel, .lodging: return "🏨"
        case .transport, .transit, .train: return "🚆"
        case .bus: return "🚌"
        case .taxi: return "🚕"
        case .food, .meal, .restaurant: return "🍽"
        case .activity, .tour, .ticket: return "🎟"
        case .shopping: return "🛍"
        case .other: return "•"
        }
    }

    var systemImage: String {
        switch self {
        case .flight: return "airplane"
        case .hotel, .lodging: return "bed.double.fill"
        case .transport, .transit, .train: return "tram.fill"
        case .bus: return "bus.fill"
        case .taxi: return "car.fill"
        case .food, .meal, .restaurant: return "fork.knife"
        case .activity, .tour, .ticket: return "ticket.fill"
        case .shopping: return "bag.fill"
        case .other: return "circle.fill"
        }
    }

    var tint: Color {
        switch self {
        case .flight: return Tokens.Color.Category.flight
        case .hotel, .lodging: return Tokens.Color.Category.hotel
        case .transport, .transit, .train, .bus, .taxi: return Tokens.Color.Category.transit
        case .food, .meal, .restaurant: return Tokens.Color.accentOrange
        case .activity, .tour, .ticket: return Tokens.Color.accentGreen
        case .shopping: return Tokens.Color.accentRed
        case .other: return Tokens.Color.textSecondary
        }
    }
}
