import Foundation
import SwiftData

// Lightweight offline cache for trips only. Item subcollections
// (flights/hotels/transports/expenses) stay online-only — the web is the
// source of truth and the schema is still evolving, so caching detailed
// items is deferred until the dust settles.

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
        let activeIDs = Set(trips.compactMap(\.id))
        let allCached = (try? modelContext.fetch(FetchDescriptor<CachedTrip>())) ?? []
        for cached in allCached where !activeIDs.contains(cached.firestoreID) {
            modelContext.delete(cached)
        }
        try? modelContext.save()
    }

    func cachedTrips() -> [Trip] {
        let descriptor = FetchDescriptor<CachedTrip>(sortBy: [SortDescriptor(\.startDate)])
        return (try? modelContext.fetch(descriptor))?.map { $0.toTrip() } ?? []
    }

    // MARK: - Items (online-only — cache stubs return empty)

    func upsertFlights(_ flights: [Flight], tripID: String) { /* deferred */ }
    func upsertHotels(_ hotels: [Hotel], tripID: String) { /* deferred */ }
    func upsertTransports(_ transports: [Transport], tripID: String) { /* deferred */ }
    func upsertExpenses(_ expenses: [Expense], tripID: String) { /* deferred */ }

    func cachedFlights(tripID: String) -> [Flight] { [] }
    func cachedHotels(tripID: String) -> [Hotel] { [] }
    func cachedTransports(tripID: String) -> [Transport] { [] }
    func cachedExpenses(tripID: String) -> [Expense] { [] }

    // MARK: - Private

    private func fetchCachedTrip(id: String) -> CachedTrip? {
        var descriptor = FetchDescriptor<CachedTrip>(
            predicate: #Predicate { $0.firestoreID == id }
        )
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }
}
