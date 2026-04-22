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

    private func userCollection(_ name: String) throws -> CollectionReference {
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

enum FirestoreError: Error {
    case notAuthenticated
}
