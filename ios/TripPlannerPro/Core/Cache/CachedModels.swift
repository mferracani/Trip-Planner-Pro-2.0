import Foundation
import SwiftData

// MARK: - CachedTrip

@Model
final class CachedTrip {
    @Attribute(.unique) var firestoreID: String
    var name: String
    var startDate: Date
    var endDate: Date
    var startDateString: String
    var endDateString: String
    var updatedAt: Date
    // Extended fields (schema v5) — optional so existing rows read as nil on migration.
    var statusRaw: String?
    var totalUSD: Double?
    var paidUSD: Double?
    var citiesCount: Int?
    var flightsCount: Int?
    var coverURL: String?

    init(from trip: Trip) {
        self.firestoreID = trip.id ?? UUID().uuidString
        self.name = trip.name
        self.startDate = trip.startDate
        self.endDate = trip.endDate
        self.startDateString = trip.startDateString
        self.endDateString = trip.endDateString
        self.updatedAt = trip.updatedAt ?? Date()
        self.statusRaw = trip.statusStored?.rawValue
        self.totalUSD = trip.totalUSD
        self.paidUSD = trip.paidUSD
        self.citiesCount = trip.citiesCount
        self.flightsCount = trip.flightsCount
        self.coverURL = trip.coverURL
    }

    func update(from trip: Trip) {
        name = trip.name
        startDate = trip.startDate
        endDate = trip.endDate
        startDateString = trip.startDateString
        endDateString = trip.endDateString
        updatedAt = trip.updatedAt ?? Date()
        statusRaw = trip.statusStored?.rawValue
        totalUSD = trip.totalUSD
        paidUSD = trip.paidUSD
        citiesCount = trip.citiesCount
        flightsCount = trip.flightsCount
        coverURL = trip.coverURL
    }

    func toTrip() -> Trip {
        Trip(
            id: firestoreID,
            name: name,
            startDate: startDate,
            endDate: endDate,
            coverURL: coverURL,
            statusStored: statusRaw.flatMap(TripStatus.init(rawValue:)),
            createdAt: updatedAt,
            totalUSD: totalUSD,
            paidUSD: paidUSD,
            citiesCount: citiesCount,
            flightsCount: flightsCount
        )
    }
}

// MARK: - CachedTripItems
//
// One row per trip — stores all item subcollections as JSON blobs.
// Using blobs instead of individual columns keeps the schema stable as
// item models evolve; the cost is full-replacement on each write.

@Model
final class CachedTripItems {
    @Attribute(.unique) var tripID: String
    var flightsData: Data
    var hotelsData: Data
    var transportsData: Data
    var expensesData: Data
    var citiesData: Data
    var cachedAt: Date

    init(tripID: String) {
        self.tripID = tripID
        self.flightsData = Data()
        self.hotelsData = Data()
        self.transportsData = Data()
        self.expensesData = Data()
        self.citiesData = Data()
        self.cachedAt = Date()
    }
}

// MARK: - CachedCatalogSnapshot
//
// Singleton row (singletonKey = "catalog") that stores the full cross-trip
// CatalogItems as JSON blobs. Encoding uses CatalogFlightEntry / etc. wrappers
// so we capture both the Trip context and the item in one serialisable struct.

@Model
final class CachedCatalogSnapshot {
    /// Always "catalog" — used as the unique lookup key.
    @Attribute(.unique) var singletonKey: String
    var flightsData: Data
    var hotelsData: Data
    var transportsData: Data
    var citiesData: Data
    var cachedAt: Date

    init() {
        self.singletonKey = "catalog"
        self.flightsData = Data()
        self.hotelsData = Data()
        self.transportsData = Data()
        self.citiesData = Data()
        self.cachedAt = Date()
    }
}

// MARK: - Catalog serialisation helpers
//
// `CatalogItems` contains tuples which are not Codable. These flat structs
// replicate the data in a form that JSONEncoder can handle.

struct CatalogFlightEntry: Codable, Sendable {
    let trip: Trip
    let flight: Flight
}

struct CatalogHotelEntry: Codable, Sendable {
    let trip: Trip
    let hotel: Hotel
}

struct CatalogTransportEntry: Codable, Sendable {
    let trip: Trip
    let transport: Transport
}

struct CatalogCityEntry: Codable, Sendable {
    let trip: Trip
    let city: TripCity
}
