import Foundation
import SwiftData

// Local SwiftData cache — Trip only. Detailed item caches are deferred.

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
