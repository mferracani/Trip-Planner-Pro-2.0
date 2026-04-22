import FirebaseFirestore
import Foundation

extension FirestoreClient {

    // Saves a manually entered Flight to Firestore.
    func saveManualFlight(_ flight: Flight, tripID: String) throws {
        try userCollection("trips")
            .document(tripID)
            .collection("flights")
            .addDocument(from: flight)
    }

    // Saves a manually entered Hotel to Firestore.
    func saveManualHotel(_ hotel: Hotel, tripID: String) throws {
        try userCollection("trips")
            .document(tripID)
            .collection("hotels")
            .addDocument(from: hotel)
    }

    // Saves a manually entered Transport to Firestore.
    func saveManualTransport(_ transport: Transport, tripID: String) throws {
        try userCollection("trips")
            .document(tripID)
            .collection("transports")
            .addDocument(from: transport)
    }
}
