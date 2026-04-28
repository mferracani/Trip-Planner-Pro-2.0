import Foundation
import SwiftData

@MainActor
final class CacheManager {
    private let modelContext: ModelContext
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

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

    // MARK: - Items

    func upsertFlights(_ flights: [Flight], tripID: String) {
        guard let data = try? encoder.encode(flights) else { return }
        let entry = itemEntry(tripID: tripID)
        entry.flightsData = data
        entry.cachedAt = Date()
        try? modelContext.save()
    }

    func upsertHotels(_ hotels: [Hotel], tripID: String) {
        guard let data = try? encoder.encode(hotels) else { return }
        let entry = itemEntry(tripID: tripID)
        entry.hotelsData = data
        entry.cachedAt = Date()
        try? modelContext.save()
    }

    func upsertTransports(_ transports: [Transport], tripID: String) {
        guard let data = try? encoder.encode(transports) else { return }
        let entry = itemEntry(tripID: tripID)
        entry.transportsData = data
        entry.cachedAt = Date()
        try? modelContext.save()
    }

    func upsertExpenses(_ expenses: [Expense], tripID: String) {
        guard let data = try? encoder.encode(expenses) else { return }
        let entry = itemEntry(tripID: tripID)
        entry.expensesData = data
        entry.cachedAt = Date()
        try? modelContext.save()
    }

    func upsertCities(_ cities: [TripCity], tripID: String) {
        guard let data = try? encoder.encode(cities) else { return }
        let entry = itemEntry(tripID: tripID)
        entry.citiesData = data
        entry.cachedAt = Date()
        try? modelContext.save()
    }

    func cachedFlights(tripID: String) -> [Flight] {
        guard let d = fetchItemEntry(tripID: tripID)?.flightsData, !d.isEmpty else { return [] }
        return (try? decoder.decode([Flight].self, from: d)) ?? []
    }

    func cachedHotels(tripID: String) -> [Hotel] {
        guard let d = fetchItemEntry(tripID: tripID)?.hotelsData, !d.isEmpty else { return [] }
        return (try? decoder.decode([Hotel].self, from: d)) ?? []
    }

    func cachedTransports(tripID: String) -> [Transport] {
        guard let d = fetchItemEntry(tripID: tripID)?.transportsData, !d.isEmpty else { return [] }
        return (try? decoder.decode([Transport].self, from: d)) ?? []
    }

    func cachedExpenses(tripID: String) -> [Expense] {
        guard let d = fetchItemEntry(tripID: tripID)?.expensesData, !d.isEmpty else { return [] }
        return (try? decoder.decode([Expense].self, from: d)) ?? []
    }

    func cachedCities(tripID: String) -> [TripCity] {
        guard let d = fetchItemEntry(tripID: tripID)?.citiesData, !d.isEmpty else { return [] }
        return (try? decoder.decode([TripCity].self, from: d)) ?? []
    }

    // MARK: - Catalog snapshot (cross-trip)

    func upsertCatalogSnapshot(_ items: CatalogItems) {
        let snapshot = fetchOrCreateCatalogSnapshot()

        let flights = items.flights.map { CatalogFlightEntry(trip: $0.trip, flight: $0.flight) }
        let hotels = items.hotels.map { CatalogHotelEntry(trip: $0.trip, hotel: $0.hotel) }
        let transports = items.transports.map { CatalogTransportEntry(trip: $0.trip, transport: $0.transport) }
        let cities = items.cities.map { CatalogCityEntry(trip: $0.trip, city: $0.city) }

        snapshot.flightsData = (try? encoder.encode(flights)) ?? Data()
        snapshot.hotelsData = (try? encoder.encode(hotels)) ?? Data()
        snapshot.transportsData = (try? encoder.encode(transports)) ?? Data()
        snapshot.citiesData = (try? encoder.encode(cities)) ?? Data()
        snapshot.cachedAt = Date()
        try? modelContext.save()
    }

    func cachedCatalogSnapshot() -> CatalogItems? {
        guard let snapshot = fetchCatalogSnapshot() else { return nil }

        func decode<T: Decodable>(_ type: T.Type, from data: Data) -> [T] {
            guard !data.isEmpty else { return [] }
            return (try? decoder.decode([T].self, from: data)) ?? []
        }

        let flightEntries   = decode(CatalogFlightEntry.self, from: snapshot.flightsData)
        let hotelEntries    = decode(CatalogHotelEntry.self, from: snapshot.hotelsData)
        let transportEntries = decode(CatalogTransportEntry.self, from: snapshot.transportsData)
        let cityEntries     = decode(CatalogCityEntry.self, from: snapshot.citiesData)

        guard !flightEntries.isEmpty || !hotelEntries.isEmpty || !transportEntries.isEmpty || !cityEntries.isEmpty else {
            return nil
        }

        return CatalogItems(
            flights:    flightEntries.map { (trip: $0.trip, flight: $0.flight) },
            hotels:     hotelEntries.map { (trip: $0.trip, hotel: $0.hotel) },
            transports: transportEntries.map { (trip: $0.trip, transport: $0.transport) },
            cities:     cityEntries.map { (trip: $0.trip, city: $0.city) }
        )
    }

    // MARK: - Private

    private func fetchCachedTrip(id: String) -> CachedTrip? {
        var descriptor = FetchDescriptor<CachedTrip>(
            predicate: #Predicate { $0.firestoreID == id }
        )
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    private func fetchItemEntry(tripID: String) -> CachedTripItems? {
        var descriptor = FetchDescriptor<CachedTripItems>(
            predicate: #Predicate { $0.tripID == tripID }
        )
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    private func itemEntry(tripID: String) -> CachedTripItems {
        if let existing = fetchItemEntry(tripID: tripID) { return existing }
        let new = CachedTripItems(tripID: tripID)
        modelContext.insert(new)
        return new
    }

    private func fetchCatalogSnapshot() -> CachedCatalogSnapshot? {
        var descriptor = FetchDescriptor<CachedCatalogSnapshot>(
            predicate: #Predicate { $0.singletonKey == "catalog" }
        )
        descriptor.fetchLimit = 1
        return try? modelContext.fetch(descriptor).first
    }

    private func fetchOrCreateCatalogSnapshot() -> CachedCatalogSnapshot {
        if let existing = fetchCatalogSnapshot() { return existing }
        let new = CachedCatalogSnapshot()
        modelContext.insert(new)
        return new
    }
}
