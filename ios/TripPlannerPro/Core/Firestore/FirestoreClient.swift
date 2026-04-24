import FirebaseAuth
import FirebaseFirestore
import Foundation

@MainActor
@Observable
final class FirestoreClient {
    private let db = Firestore.firestore()

    // MARK: - Path

    private var userUID: String? {
        HouseholdConfig.ownerUID ?? Auth.auth().currentUser?.uid
    }

    func userCollection(_ name: String) throws -> CollectionReference {
        guard let uid = userUID else { throw FirestoreError.notAuthenticated }
        return db.collection("users").document(uid).collection(name)
    }

    // MARK: - Trips

    func tripsStream() throws -> AsyncThrowingStream<[Trip], Error> {
        let ref = try userCollection("trips")
        return AsyncThrowingStream { continuation in
            let listener = ref
                .order(by: "startDate")
                .addSnapshotListener { snapshot, error in
                    if let error {
                        continuation.finish(throwing: error)
                        return
                    }
                    let trips = (snapshot?.documents ?? []).compactMap {
                        try? $0.data(as: Trip.self)
                    }
                    continuation.yield(trips)
                }
            let listenerBox = ListenerRegistrationBox(listener)
            continuation.onTermination = { _ in listenerBox.remove() }
        }
    }

    func createTrip(_ trip: Trip) async throws {
        let ref = try userCollection("trips")
        try ref.addDocument(from: trip)
    }

    func updateTripDates(id: String, startDate: Date, endDate: Date) async throws {
        try await userCollection("trips").document(id).updateData([
            "startDate": startDate,
            "endDate": endDate,
        ])
    }

    func deleteTrip(id: String) async throws {
        try await userCollection("trips").document(id).delete()
    }

    // MARK: - Flights

    func flightsStream(tripID: String) throws -> AsyncThrowingStream<[Flight], Error> {
        let ref = try userCollection("trips").document(tripID).collection("flights")
            as CollectionReference
        // Re-route through trips subcollection
        return streamCollection(ref)
    }

    func hotelsStream(tripID: String) throws -> AsyncThrowingStream<[Hotel], Error> {
        let ref = try userCollection("trips").document(tripID).collection("hotels")
        return streamCollection(ref)
    }

    func transportsStream(tripID: String) throws -> AsyncThrowingStream<[Transport], Error> {
        let ref = try userCollection("trips").document(tripID).collection("transports")
        return streamCollection(ref)
    }

    func citiesStream(tripID: String) throws -> AsyncThrowingStream<[TripCity], Error> {
        let ref = try userCollection("trips").document(tripID).collection("cities")
        return streamCollection(ref)
    }

    // MARK: - Catalog (all items across trips)

    func allItemsStream() throws -> AsyncThrowingStream<CatalogItems, Error> {
        let tripsStream = try tripsStream()
        return AsyncThrowingStream { continuation in
            let task = Task { @MainActor [weak self] in
                guard let self else { return }
                do {
                    for try await trips in tripsStream {
                        let items = await self.fetchCatalogItems(for: trips)
                        continuation.yield(items)
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    // Fetches subcollection items for a list of trips sequentially on MainActor.
    private func fetchCatalogItems(for trips: [Trip]) async -> CatalogItems {
        var flights: [(trip: Trip, flight: Flight)] = []
        var hotels: [(trip: Trip, hotel: Hotel)] = []
        var transports: [(trip: Trip, transport: Transport)] = []

        for trip in trips {
            guard let tripID = trip.id else { continue }

            if let fDocs = try? await userCollection("trips")
                .document(tripID).collection("flights").getDocuments() {
                let fetched = fDocs.documents.compactMap { try? $0.data(as: Flight.self) }
                flights.append(contentsOf: fetched.map { (trip: trip, flight: $0) })
            }

            if let hDocs = try? await userCollection("trips")
                .document(tripID).collection("hotels").getDocuments() {
                let fetched = hDocs.documents.compactMap { try? $0.data(as: Hotel.self) }
                hotels.append(contentsOf: fetched.map { (trip: trip, hotel: $0) })
            }

            if let tDocs = try? await userCollection("trips")
                .document(tripID).collection("transports").getDocuments() {
                let fetched = tDocs.documents.compactMap { try? $0.data(as: Transport.self) }
                transports.append(contentsOf: fetched.map { (trip: trip, transport: $0) })
            }
        }

        return CatalogItems(
            flights: flights.sorted { $0.flight.departureUTC < $1.flight.departureUTC },
            hotels: hotels.sorted { $0.hotel.checkInUTC < $1.hotel.checkInUTC },
            transports: transports.sorted { $0.transport.departureUTC < $1.transport.departureUTC }
        )
    }

    // MARK: - Helpers

    private func streamCollection<T: Codable & Sendable>(_ ref: CollectionReference) -> AsyncThrowingStream<[T], Error> {
        AsyncThrowingStream { continuation in
            let listener = ref.addSnapshotListener { snapshot, error in
                if let error {
                    continuation.finish(throwing: error)
                    return
                }
                let items = (snapshot?.documents ?? []).compactMap { try? $0.data(as: T.self) }
                continuation.yield(items)
            }
            let listenerBox = ListenerRegistrationBox(listener)
            continuation.onTermination = { _ in listenerBox.remove() }
        }
    }
}

private final class ListenerRegistrationBox: @unchecked Sendable {
    private let listener: ListenerRegistration

    init(_ listener: ListenerRegistration) {
        self.listener = listener
    }

    func remove() {
        listener.remove()
    }
}

// MARK: - CatalogItems

struct CatalogItems: Sendable {
    var flights: [(trip: Trip, flight: Flight)]
    var hotels: [(trip: Trip, hotel: Hotel)]
    var transports: [(trip: Trip, transport: Transport)]

    static let empty = CatalogItems(flights: [], hotels: [], transports: [])
}

enum FirestoreError: Error {
    case notAuthenticated
}
