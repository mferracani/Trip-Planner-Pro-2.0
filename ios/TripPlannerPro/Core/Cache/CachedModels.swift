import Foundation
import SwiftData

// Local SwiftData cache — mirrors the Firestore models.
// Used as read-only fallback when there's no network.

@Model
final class CachedTrip {
    @Attribute(.unique) var firestoreID: String
    var name: String
    var startDate: Date
    var endDate: Date
    var statusRaw: String
    var updatedAt: Date

    @Relationship(deleteRule: .cascade) var flights: [CachedFlight] = []
    @Relationship(deleteRule: .cascade) var hotels: [CachedHotel] = []
    @Relationship(deleteRule: .cascade) var transports: [CachedTransport] = []

    init(from trip: Trip) {
        self.firestoreID = trip.id ?? UUID().uuidString
        self.name = trip.name
        self.startDate = trip.startDate
        self.endDate = trip.endDate
        self.statusRaw = trip.status.rawValue
        self.updatedAt = Date()
    }

    func update(from trip: Trip) {
        name = trip.name
        startDate = trip.startDate
        endDate = trip.endDate
        statusRaw = trip.status.rawValue
        updatedAt = Date()
    }

    func toTrip() -> Trip {
        Trip(
            id: firestoreID,
            name: name,
            startDate: startDate,
            endDate: endDate,
            status: TripStatus(rawValue: statusRaw) ?? .planned,
            cityOrder: [],
            createdAt: updatedAt
        )
    }
}

@Model
final class CachedFlight {
    @Attribute(.unique) var firestoreID: String
    var tripID: String
    var airline: String
    var flightNumber: String
    var originIATA: String
    var destIATA: String
    var departureLocal: String
    var arrivalLocal: String
    var departureUTC: Date
    var arrivalUTC: Date

    init(from flight: Flight, tripID: String) {
        self.firestoreID = flight.id ?? UUID().uuidString
        self.tripID = tripID
        self.airline = flight.airline
        self.flightNumber = flight.flightNumber
        self.originIATA = flight.originIATA
        self.destIATA = flight.destIATA
        self.departureLocal = flight.departureLocal
        self.arrivalLocal = flight.arrivalLocal
        self.departureUTC = flight.departureUTC
        self.arrivalUTC = flight.arrivalUTC
    }

    func toFlight() -> Flight {
        Flight(
            id: firestoreID,
            airline: airline,
            flightNumber: flightNumber,
            originIATA: originIATA,
            destIATA: destIATA,
            departureLocal: departureLocal,
            arrivalLocal: arrivalLocal,
            departureUTC: departureUTC,
            arrivalUTC: arrivalUTC,
            durationMinutes: Int(arrivalUTC.timeIntervalSince(departureUTC) / 60)
        )
    }
}

@Model
final class CachedHotel {
    @Attribute(.unique) var firestoreID: String
    var tripID: String
    var name: String
    var checkInLocal: String
    var checkOutLocal: String
    var checkInUTC: Date
    var checkOutUTC: Date

    init(from hotel: Hotel, tripID: String) {
        self.firestoreID = hotel.id ?? UUID().uuidString
        self.tripID = tripID
        self.name = hotel.name
        self.checkInLocal = hotel.checkInLocal
        self.checkOutLocal = hotel.checkOutLocal
        self.checkInUTC = hotel.checkInUTC
        self.checkOutUTC = hotel.checkOutUTC
    }

    func toHotel() -> Hotel {
        Hotel(
            id: firestoreID,
            name: name,
            checkInLocal: checkInLocal,
            checkOutLocal: checkOutLocal,
            checkInUTC: checkInUTC,
            checkOutUTC: checkOutUTC
        )
    }
}

@Model
final class CachedTransport {
    @Attribute(.unique) var firestoreID: String
    var tripID: String
    var type: String
    var transportDescription: String
    var departureLocal: String
    var departureUTC: Date

    init(from transport: Transport, tripID: String) {
        self.firestoreID = transport.id ?? UUID().uuidString
        self.tripID = tripID
        self.type = transport.type
        self.transportDescription = transport.description
        self.departureLocal = transport.departureLocal
        self.departureUTC = transport.departureUTC
    }

    func toTransport() -> Transport {
        Transport(
            id: firestoreID,
            type: type,
            description: transportDescription,
            departureLocal: departureLocal,
            departureUTC: departureUTC
        )
    }
}
