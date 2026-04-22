import Foundation
import SwiftData

// Writes Firestore data to the local SwiftData store.
// Called from ViewModels after each stream update.
// Reading from cache is done directly via @Query in views or via modelContext.fetch.

@MainActor
final class CacheManager {
    private let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Trips

    func upsertTrips(_ trips: [Trip]) {
        for trip in trips {
            guard let id = trip.id else { continue }
            let existing = fetchCachedTrip(id: id)
            if let existing {
                existing.update(from: trip)
            } else {
                modelContext.insert(CachedTrip(from: trip))
            }
        }
        // Remove cached trips no longer in Firestore
        let activeIDs = Set(trips.compactMap(\.id))
        let allCached = (try? modelContext.fetch(FetchDescriptor<CachedTrip>())) ?? []
        for cached in allCached where !activeIDs.contains(cached.firestoreID) {
            modelContext.delete(cached)
        }
        try? modelContext.save()
    }

    // MARK: - Trip Detail

    func upsertFlights(_ flights: [Flight], tripID: String) {
        let activeIDs = Set(flights.compactMap(\.id))
        let existing = fetchCachedFlights(tripID: tripID)

        for cached in existing where !activeIDs.contains(cached.firestoreID) {
            modelContext.delete(cached)
        }
        let existingIDs = Set(existing.map(\.firestoreID))
        for flight in flights where !existingIDs.contains(flight.id ?? "") {
            modelContext.insert(CachedFlight(from: flight, tripID: tripID))
        }
        try? modelContext.save()
    }

    func upsertHotels(_ hotels: [Hotel], tripID: String) {
        let activeIDs = Set(hotels.compactMap(\.id))
        let existing = fetchCachedHotels(tripID: tripID)

        for cached in existing where !activeIDs.contains(cached.firestoreID) {
            modelContext.delete(cached)
        }
        let existingIDs = Set(existing.map(\.firestoreID))
        for hotel in hotels where !existingIDs.contains(hotel.id ?? "") {
            modelContext.insert(CachedHotel(from: hotel, tripID: tripID))
        }
        try? modelContext.save()
    }

    func upsertTransports(_ transports: [Transport], tripID: String) {
        let activeIDs = Set(transports.compactMap(\.id))
        let existing = fetchCachedTransports(tripID: tripID)

        for cached in existing where !activeIDs.contains(cached.firestoreID) {
            modelContext.delete(cached)
        }
        let existingIDs = Set(existing.map(\.firestoreID))
        for transport in transports where !existingIDs.contains(transport.id ?? "") {
            modelContext.insert(CachedTransport(from: transport, tripID: tripID))
        }
        try? modelContext.save()
    }

    // MARK: - Read (offline fallback)

    func cachedTrips() -> [Trip] {
        let descriptor = FetchDescriptor<CachedTrip>(sortBy: [SortDescriptor(\.startDate)])
        return (try? modelContext.fetch(descriptor))?.map { $0.toTrip() } ?? []
    }

    func cachedFlights(tripID: String) -> [Flight] {
        fetchCachedFlights(tripID: tripID).map { $0.toFlight() }
    }

    func cachedHotels(tripID: String) -> [Hotel] {
        fetchCachedHotels(tripID: tripID).map { $0.toHotel() }
    }

    func cachedTransports(tripID: String) -> [Transport] {
        fetchCachedTransports(tripID: tripID).map { $0.toTransport() }
    }

    // MARK: - Private helpers

    private func fetchCachedTrip(id: String) -> CachedTrip? {
        var descriptor = FetchDescriptor<CachedTrip>(
            predicate: #Predicate { $0.firestoreID == id }
        )
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    private func fetchCachedFlights(tripID: String) -> [CachedFlight] {
        let descriptor = FetchDescriptor<CachedFlight>(
            predicate: #Predicate { $0.tripID == tripID }
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    private func fetchCachedHotels(tripID: String) -> [CachedHotel] {
        let descriptor = FetchDescriptor<CachedHotel>(
            predicate: #Predicate { $0.tripID == tripID }
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }

    private func fetchCachedTransports(tripID: String) -> [CachedTransport] {
        let descriptor = FetchDescriptor<CachedTransport>(
            predicate: #Predicate { $0.tripID == tripID }
        )
        return (try? modelContext.fetch(descriptor)) ?? []
    }
}
