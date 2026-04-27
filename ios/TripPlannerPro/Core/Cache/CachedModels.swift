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

    init(from trip: Trip) {
        self.firestoreID = trip.id ?? UUID().uuidString
        self.name = trip.name
        self.startDate = trip.startDate
        self.endDate = trip.endDate
        self.startDateString = trip.startDateString
        self.endDateString = trip.endDateString
        self.updatedAt = trip.updatedAt ?? Date()
    }

    func update(from trip: Trip) {
        name = trip.name
        startDate = trip.startDate
        endDate = trip.endDate
        startDateString = trip.startDateString
        endDateString = trip.endDateString
        updatedAt = trip.updatedAt ?? Date()
    }

    func toTrip() -> Trip {
        Trip(
            id: firestoreID,
            name: name,
            startDate: startDate,
            endDate: endDate,
            createdAt: updatedAt
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
