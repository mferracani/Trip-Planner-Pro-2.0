@preconcurrency import FirebaseFirestore
import Foundation

extension FirestoreClient {

    // MARK: - One-shot trip fetch (used by OfflinePrefetcher)

    func fetchTripsOnce() async throws -> [Trip] {
        let ref = try userCollection("trips")
        let snapshot = try await ref.order(by: "start_date").getDocuments()
        return snapshot.documents.compactMap { try? $0.data(as: Trip.self) }
    }

    // MARK: - Prefetch all subcollections for a trip into cache

    func prefetchTripItems(tripID: String, into cache: CacheManager) async {
        guard let base = try? userCollection("trips").document(tripID) else { return }

        async let fSnap = try? base.collection("flights").getDocuments()
        async let hSnap = try? base.collection("hotels").getDocuments()
        async let tSnap = try? base.collection("transports").getDocuments()
        async let eSnap = try? base.collection("expenses").getDocuments()
        async let cSnap = try? base.collection("cities").getDocuments()

        let (f, h, t, e, c) = await (fSnap, hSnap, tSnap, eSnap, cSnap)

        let flights    = f?.documents.compactMap { try? $0.data(as: Flight.self) }    ?? []
        let hotels     = h?.documents.compactMap { try? $0.data(as: Hotel.self) }     ?? []
        let transports = t?.documents.compactMap { try? $0.data(as: Transport.self) } ?? []
        let expenses   = e?.documents.compactMap { try? $0.data(as: Expense.self) }   ?? []
        let cities     = c?.documents.compactMap { try? $0.data(as: TripCity.self) }  ?? []

        cache.upsertFlights(flights, tripID: tripID)
        cache.upsertHotels(hotels, tripID: tripID)
        cache.upsertTransports(transports, tripID: tripID)
        cache.upsertExpenses(expenses, tripID: tripID)
        cache.upsertCities(cities, tripID: tripID)
    }
}
