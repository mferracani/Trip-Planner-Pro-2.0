@preconcurrency import FirebaseFirestore
import Foundation

// MARK: - Per-item CRUD helpers
//
// Mirrors the web's firestore.ts writes: update/delete per collection +
// recalcTripAggregates to keep trips/{id}.total_usd and cities_count in sync.

extension FirestoreClient {

    // MARK: Flights

    func updateFlight(_ flight: Flight, tripID: String) async throws {
        guard let id = flight.id else { return }
        let ref = try userCollection("trips").document(tripID).collection("flights").document(id)
        try ref.setData(from: flight, merge: true)
        try await recalcTripAggregates(tripID: tripID)
    }

    func deleteFlight(id: String, tripID: String) async throws {
        let ref = try userCollection("trips").document(tripID).collection("flights").document(id)
        try await ref.delete()
        try await recalcTripAggregates(tripID: tripID)
    }

    // MARK: Hotels

    func updateHotel(_ hotel: Hotel, tripID: String) async throws {
        guard let id = hotel.id else { return }
        let ref = try userCollection("trips").document(tripID).collection("hotels").document(id)
        try ref.setData(from: hotel, merge: true)
        try await recalcTripAggregates(tripID: tripID)
    }

    func deleteHotel(id: String, tripID: String) async throws {
        let ref = try userCollection("trips").document(tripID).collection("hotels").document(id)
        try await ref.delete()
        try await recalcTripAggregates(tripID: tripID)
    }

    // MARK: Transports

    func updateTransport(_ transport: Transport, tripID: String) async throws {
        guard let id = transport.id else { return }
        let ref = try userCollection("trips").document(tripID).collection("transports").document(id)
        try ref.setData(from: transport, merge: true)
        try await recalcTripAggregates(tripID: tripID)
    }

    func deleteTransport(id: String, tripID: String) async throws {
        let ref = try userCollection("trips").document(tripID).collection("transports").document(id)
        try await ref.delete()
        try await recalcTripAggregates(tripID: tripID)
    }

    // MARK: Expenses

    func createExpense(_ expense: Expense, tripID: String) async throws {
        let ref = try userCollection("trips").document(tripID).collection("expenses")
        _ = try ref.addDocument(from: expense)
        try await recalcTripAggregates(tripID: tripID)
    }

    func updateExpense(_ expense: Expense, tripID: String) async throws {
        guard let id = expense.id else { return }
        let ref = try userCollection("trips").document(tripID).collection("expenses").document(id)
        try ref.setData(from: expense, merge: true)
        try await recalcTripAggregates(tripID: tripID)
    }

    func deleteExpense(id: String, tripID: String) async throws {
        let ref = try userCollection("trips").document(tripID).collection("expenses").document(id)
        try await ref.delete()
        try await recalcTripAggregates(tripID: tripID)
    }

    // MARK: - Recalc

    /// Recomputes total_usd and cities_count for a trip — matches the web's
    /// `recalcTripAggregates` function so the dashboard stays in sync.
    func recalcTripAggregates(tripID: String) async throws {
        let flightsRef = try userCollection("trips").document(tripID).collection("flights")
        let hotelsRef = try userCollection("trips").document(tripID).collection("hotels")
        let transportsRef = try userCollection("trips").document(tripID).collection("transports")
        let expensesRef = try userCollection("trips").document(tripID).collection("expenses")
        let citiesRef = try userCollection("trips").document(tripID).collection("cities")

        async let flightsSnap = try flightsRef.getDocuments()
        async let hotelsSnap = try hotelsRef.getDocuments()
        async let transportsSnap = try transportsRef.getDocuments()
        async let expensesSnap = try expensesRef.getDocuments()
        async let citiesSnap = try citiesRef.getDocuments()

        let (f, h, t, e, c) = try await (flightsSnap, hotelsSnap, transportsSnap, expensesSnap, citiesSnap)

        let flightsTotal = f.documents.compactMap { try? $0.data(as: Flight.self) }
            .reduce(0.0) { $0 + ($1.priceUSD ?? 0) }
        let hotelsTotal = h.documents.compactMap { try? $0.data(as: Hotel.self) }
            .reduce(0.0) { $0 + ($1.totalPriceUSD ?? 0) }
        let transportsTotal = t.documents.compactMap { try? $0.data(as: Transport.self) }
            .reduce(0.0) { $0 + ($1.priceUSD ?? 0) }
        let expensesTotal = e.documents.compactMap { try? $0.data(as: Expense.self) }
            .reduce(0.0) { $0 + ($1.amountUSD ?? 0) }

        let total = flightsTotal + hotelsTotal + transportsTotal + expensesTotal

        let tripRef = try userCollection("trips").document(tripID)
        try await tripRef.updateData([
            "total_usd": Int(total.rounded()),
            "cities_count": c.documents.count,
            "updated_at": FieldValue.serverTimestamp()
        ])
    }
}
