import FirebaseAuth
@preconcurrency import FirebaseFirestore
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
                .order(by: "start_date")
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
            continuation.onTermination = { _ in listener.remove() }
        }
    }

    func createTrip(_ trip: Trip) async throws {
        let ref = try userCollection("trips")
        try ref.addDocument(from: trip)
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

    func expensesStream(tripID: String) throws -> AsyncThrowingStream<[Expense], Error> {
        let ref = try userCollection("trips").document(tripID).collection("expenses")
        return streamCollection(ref)
    }

    // MARK: - Catalog (all items across trips)

    func allItemsStream() throws -> AsyncThrowingStream<CatalogItems, Error> {
        let tripsStream = try tripsStream()
        return AsyncThrowingStream { continuation in
            let task = Task { @MainActor in
                do {
                    for try await trips in tripsStream {
                        // Build Firestore refs on MainActor before spawning tasks
                        typealias TripRefs = (trip: Trip, flights: CollectionReference, hotels: CollectionReference, transports: CollectionReference, cities: CollectionReference)
                        var tripRefs: [TripRefs] = []
                        for trip in trips {
                            guard let tripID = trip.id else { continue }
                            guard let uid = userUID else { continue }
                            let base = db.collection("users").document(uid).collection("trips").document(tripID)
                            tripRefs.append((
                                trip: trip,
                                flights: base.collection("flights"),
                                hotels: base.collection("hotels"),
                                transports: base.collection("transports"),
                                cities: base.collection("cities")
                            ))
                        }

                        // Fetch all subcollections (parallel, off main actor)
                        typealias TripBatch = (
                            flights: [(trip: Trip, flight: Flight)],
                            hotels: [(trip: Trip, hotel: Hotel)],
                            transports: [(trip: Trip, transport: Transport)],
                            cities: [(trip: Trip, city: TripCity)]
                        )

                        let batches: [TripBatch] = await withTaskGroup(of: TripBatch.self) { group in
                            for refs in tripRefs {
                                let trip = refs.trip
                                let fRef = refs.flights
                                let hRef = refs.hotels
                                let tRef = refs.transports
                                let cRef = refs.cities

                                group.addTask {
                                    async let fDocs = (try? fRef.getDocuments())?.documents ?? []
                                    async let hDocs = (try? hRef.getDocuments())?.documents ?? []
                                    async let tDocs = (try? tRef.getDocuments())?.documents ?? []
                                    async let cDocs = (try? cRef.getDocuments())?.documents ?? []

                                    let flights = await fDocs.compactMap { try? $0.data(as: Flight.self) }
                                        .map { (trip: trip, flight: $0) }
                                    let hotels = await hDocs.compactMap { try? $0.data(as: Hotel.self) }
                                        .map { (trip: trip, hotel: $0) }
                                    let transports = await tDocs.compactMap { try? $0.data(as: Transport.self) }
                                        .map { (trip: trip, transport: $0) }
                                    let cities = await cDocs.compactMap { try? $0.data(as: TripCity.self) }
                                        .map { (trip: trip, city: $0) }

                                    return (flights: flights, hotels: hotels, transports: transports, cities: cities)
                                }
                            }

                            var result: [TripBatch] = []
                            for await batch in group { result.append(batch) }
                            return result
                        }

                        let allFlights = batches.flatMap(\.flights)
                            .sorted { $0.flight.departureLocalTime < $1.flight.departureLocalTime }
                        let allHotels = batches.flatMap(\.hotels)
                            .sorted { $0.hotel.checkIn < $1.hotel.checkIn }
                        let allTransports = batches.flatMap(\.transports)
                            .sorted { $0.transport.departureLocalTime < $1.transport.departureLocalTime }
                        let allCities = batches.flatMap(\.cities)
                            .sorted { $0.city.name < $1.city.name }

                        continuation.yield(CatalogItems(
                            flights: allFlights,
                            hotels: allHotels,
                            transports: allTransports,
                            cities: allCities
                        ))
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
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
            continuation.onTermination = { _ in listener.remove() }
        }
    }
}

// MARK: - CatalogItems

struct CatalogItems: Sendable {
    var flights: [(trip: Trip, flight: Flight)]
    var hotels: [(trip: Trip, hotel: Hotel)]
    var transports: [(trip: Trip, transport: Transport)]
    var cities: [(trip: Trip, city: TripCity)]

    static let empty = CatalogItems(flights: [], hotels: [], transports: [], cities: [])
}

enum FirestoreError: Error {
    case notAuthenticated
}
