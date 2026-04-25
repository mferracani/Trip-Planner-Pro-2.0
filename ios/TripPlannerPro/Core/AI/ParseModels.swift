import Foundation

// Mirrors the TypeScript ParsedItem union type from the Cloud Function.

enum ParsedItem: Codable, Identifiable, Sendable {
    case flight(ParsedFlight)
    case hotel(ParsedHotel)
    case transport(ParsedTransport)

    var id: String {
        switch self {
        case .flight(let f): return "flight-\(f.flightNumber ?? "")-\(f.departureLocalTime ?? "")"
        case .hotel(let h): return "hotel-\(h.name ?? "")-\(h.checkIn ?? "")"
        case .transport(let t): return "transport-\(t.origin ?? "")-\(t.departureLocalTime ?? "")"
        }
    }

    var confidence: Double {
        switch self {
        case .flight(let f): return f.confidence
        case .hotel(let h): return h.confidence
        case .transport(let t): return t.confidence
        }
    }

    var type: String {
        switch self {
        case .flight: return "flight"
        case .hotel: return "hotel"
        case .transport: return "transport"
        }
    }

    private enum TypeKey: String, CodingKey { case type }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: TypeKey.self)
        let type = try container.decode(String.self, forKey: .type)
        switch type {
        case "flight":   self = .flight(try ParsedFlight(from: decoder))
        case "hotel":    self = .hotel(try ParsedHotel(from: decoder))
        case "transport": self = .transport(try ParsedTransport(from: decoder))
        default: throw DecodingError.dataCorrupted(.init(codingPath: [], debugDescription: "Unknown type: \(type)"))
        }
    }

    func encode(to encoder: Encoder) throws {
        switch self {
        case .flight(let f): try f.encode(to: encoder)
        case .hotel(let h): try h.encode(to: encoder)
        case .transport(let t): try t.encode(to: encoder)
        }
    }
}

struct ParsedFlight: Codable, Sendable {
    var confidence: Double
    var airline: String?
    var flightNumber: String?
    var originIATA: String?
    var destIATA: String?
    var departureLocalTime: String?
    var departureTimezone: String?
    var arrivalLocalTime: String?
    var arrivalTimezone: String?
    var bookingRef: String?

    enum CodingKeys: String, CodingKey {
        case confidence, airline
        case flightNumber = "flight_number"
        case originIATA = "origin_iata"
        case destIATA = "destination_iata"
        case departureLocalTime = "departure_local_time"
        case departureTimezone = "departure_timezone"
        case arrivalLocalTime = "arrival_local_time"
        case arrivalTimezone = "arrival_timezone"
        case bookingRef = "booking_ref"
    }
}

struct ParsedHotel: Codable, Sendable {
    var confidence: Double
    var name: String?
    var city: String?
    var checkIn: String?
    var checkOut: String?
    var bookingRef: String?

    enum CodingKeys: String, CodingKey {
        case confidence, name, city
        case checkIn = "check_in"
        case checkOut = "check_out"
        case bookingRef = "booking_ref"
    }
}

struct ParsedTransport: Codable, Sendable {
    var confidence: Double
    var mode: String?
    var origin: String?
    var destination: String?
    var departureLocalTime: String?
    var departureTimezone: String?
    var bookingRef: String?

    enum CodingKeys: String, CodingKey {
        case confidence, mode, origin, destination
        case departureLocalTime = "departure_local_time"
        case departureTimezone = "departure_timezone"
        case bookingRef = "booking_ref"
    }
}

struct ParseResponse: Codable, Sendable {
    let jobId: String
    let items: [ParsedItem]
}
