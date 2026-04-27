import Foundation
import Observation
import SwiftUI

@MainActor
@Observable
final class TripDetailViewModel {
    let trip: Trip
    private(set) var cities: [TripCity] = []
    private(set) var flights: [Flight] = []
    private(set) var hotels: [Hotel] = []
    private(set) var transports: [Transport] = []
    private(set) var expenses: [Expense] = []

    private(set) var isLoading = true
    private(set) var isOffline = false

    private var tasks: [Task<Void, Never>] = []
    private let client: FirestoreClient
    private let cache: CacheManager?

    init(trip: Trip, client: FirestoreClient, cache: CacheManager? = nil) {
        self.trip = trip
        self.client = client
        self.cache = cache
    }

    func start() {
        guard let tripID = trip.id else { return }
        tasks.forEach { $0.cancel() }
        tasks = []

        // Prefill from local cache for instant rendering while Firestore connects.
        // isOffline is cleared by markLoaded() on the first successful stream emission.
        if let cache {
            let cf = cache.cachedFlights(tripID: tripID)
            let ch = cache.cachedHotels(tripID: tripID)
            let ct = cache.cachedTransports(tripID: tripID)
            let ce = cache.cachedExpenses(tripID: tripID)
            let cc = cache.cachedCities(tripID: tripID)
            if !cf.isEmpty || !ch.isEmpty || !ct.isEmpty || !ce.isEmpty || !cc.isEmpty {
                flights = cf
                hotels = ch
                transports = ct
                expenses = ce
                cities = cc
                isLoading = false
                isOffline = true
            }
        }

        tasks.append(subscribe { try self.client.citiesStream(tripID: tripID) } onValue: { [weak self] items in
            self?.cities = items
            self?.cache?.upsertCities(items, tripID: tripID)
            self?.markLoaded()
        })

        tasks.append(subscribe { try self.client.flightsStream(tripID: tripID) } onValue: { [weak self] items in
            self?.flights = items
            self?.cache?.upsertFlights(items, tripID: tripID)
            self?.markLoaded()
        })

        tasks.append(subscribe { try self.client.hotelsStream(tripID: tripID) } onValue: { [weak self] items in
            self?.hotels = items
            self?.cache?.upsertHotels(items, tripID: tripID)
            self?.markLoaded()
        })

        tasks.append(subscribe { try self.client.transportsStream(tripID: tripID) } onValue: { [weak self] items in
            self?.transports = items
            self?.cache?.upsertTransports(items, tripID: tripID)
            self?.markLoaded()
        })

        tasks.append(subscribe { try self.client.expensesStream(tripID: tripID) } onValue: { [weak self] items in
            self?.expenses = items
            self?.cache?.upsertExpenses(items, tripID: tripID)
            self?.markLoaded()
        })
    }

    private func markLoaded() {
        isLoading = false
        isOffline = false
    }

    private func subscribe<T: Sendable>(
        stream: @escaping () throws -> AsyncThrowingStream<[T], Error>,
        onValue: @escaping ([T]) -> Void
    ) -> Task<Void, Never> {
        Task {
            do {
                for try await value in try stream() {
                    guard !Task.isCancelled else { break }
                    onValue(value)
                }
            } catch {
                guard !Task.isCancelled else { return }
                isOffline = true
            }
        }
    }

    func stop() {
        tasks.forEach { $0.cancel() }
        tasks = []
    }

    // MARK: - Mark as paid

    /// Sets paid_amount = total for a flight. No-op if already fully paid or no price.
    func markFlightPaid(_ flight: Flight) async throws {
        guard let tripID = trip.id else { return }
        var updated = flight
        updated.paidAmount = flight.price
        try await client.updateFlight(updated, tripID: tripID)
    }

    /// Sets paid_amount = total for a hotel.
    func markHotelPaid(_ hotel: Hotel) async throws {
        guard let tripID = trip.id else { return }
        var updated = hotel
        updated.paidAmount = hotel.totalPrice
        try await client.updateHotel(updated, tripID: tripID)
    }

    /// Sets paid_amount = total for a transport.
    func markTransportPaid(_ transport: Transport) async throws {
        guard let tripID = trip.id else { return }
        var updated = transport
        updated.paidAmount = transport.price
        try await client.updateTransport(updated, tripID: tripID)
    }

    /// Sets paid_amount = amount for an expense.
    func markExpensePaid(_ expense: Expense) async throws {
        guard let tripID = trip.id else { return }
        var updated = expense
        updated.paidAmount = expense.amount
        try await client.updateExpense(updated, tripID: tripID)
    }

    /// Marks all items in a category as paid.
    func markAllPaid(category: CostCategory) async throws {
        guard let tripID = trip.id else { return }
        switch category {
        case .flights:
            for f in flights where (f.paidAmount ?? 0) < (f.price ?? 0) {
                var updated = f; updated.paidAmount = f.price
                try await client.updateFlight(updated, tripID: tripID)
            }
        case .hotels:
            for h in hotels where (h.paidAmount ?? 0) < (h.totalPrice ?? 0) {
                var updated = h; updated.paidAmount = h.totalPrice
                try await client.updateHotel(updated, tripID: tripID)
            }
        case .transports:
            for t in transports where (t.paidAmount ?? 0) < (t.price ?? 0) {
                var updated = t; updated.paidAmount = t.price
                try await client.updateTransport(updated, tripID: tripID)
            }
        case .expenses:
            for e in expenses where (e.paidAmount ?? 0) < e.amount {
                var updated = e; updated.paidAmount = e.amount
                try await client.updateExpense(updated, tripID: tripID)
            }
        }
    }

    // MARK: - Calendar helpers

    var weeks: [[Date?]] {
        guard let start = calendar.dateInterval(of: .weekOfYear, for: trip.startDate),
              let end = calendar.dateInterval(of: .weekOfYear, for: trip.endDate) else {
            return []
        }
        var weeks: [[Date?]] = []
        var weekStart = start.start
        while weekStart <= end.start {
            var week: [Date?] = []
            for offset in 0..<7 {
                let day = calendar.date(byAdding: .day, value: offset, to: weekStart)!
                week.append(day >= trip.startDate && day <= trip.endDate ? day : nil)
            }
            weeks.append(week)
            weekStart = calendar.date(byAdding: .weekOfYear, value: 1, to: weekStart)!
        }
        return weeks
    }

    /// City lookup based on web schema: each city has a `days` array.
    func city(for date: Date) -> TripCity? {
        let key = Trip.isoDateFormatter.string(from: date)
        return cities.first { $0.days.contains(key) }
    }

    func cityColor(for date: Date) -> Color? {
        city(for: date)?.swiftColor
    }

    /// Flights happening on this date — departure OR arrival matches.
    func flights(on date: Date) -> [Flight] {
        let key = Trip.isoDateFormatter.string(from: date)
        return flights.filter { $0.departureDate == key || $0.arrivalDate == key }
    }

    /// Hotels occupying this date (between check_in inclusive and check_out exclusive).
    func hotels(on date: Date) -> [Hotel] {
        let key = Trip.isoDateFormatter.string(from: date)
        return hotels.filter { $0.occupiedDays.contains(key) }
    }

    func transports(on date: Date) -> [Transport] {
        let key = Trip.isoDateFormatter.string(from: date)
        return transports.filter { $0.departureDate == key }
    }

    func expenses(on date: Date) -> [Expense] {
        let key = Trip.isoDateFormatter.string(from: date)
        return expenses.filter { $0.date == key }
    }

    /// Returns true if any item (flight/hotel/transport/expense) exists for the date.
    func hasAnyItem(on date: Date) -> Bool {
        !flights(on: date).isEmpty
            || !hotels(on: date).isEmpty
            || !transports(on: date).isEmpty
            || !expenses(on: date).isEmpty
    }

    // MARK: - Totals (used by CostsView)

    /// Total number of flights in this trip (all, not per-day).
    var allFlightsCount: Int { flights.count }

    /// Unified total USD across all item types.
    var grandTotalUSD: Double {
        let f = flights.reduce(0) { $0 + ($1.priceUSD ?? 0) }
        let h = hotels.reduce(0) { $0 + ($1.totalPriceUSD ?? 0) }
        let t = transports.reduce(0) { $0 + ($1.priceUSD ?? 0) }
        let e = expenses.reduce(0) { $0 + ($1.amountUSD ?? 0) }
        return f + h + t + e
    }

    /// Unified total paid (so far) across all item types, in USD.
    /// Approximates paid USD via paid_amount × (price_usd / price) when
    /// original-currency amounts are available, otherwise falls back to 0.
    var paidTotalUSD: Double {
        func paidUSD(paid: Double?, price: Double?, priceUSD: Double?) -> Double {
            guard let paid = paid, paid > 0 else { return 0 }
            guard let price, let priceUSD, price > 0 else { return 0 }
            return paid * (priceUSD / price)
        }
        let f = flights.reduce(0) { $0 + paidUSD(paid: $1.paidAmount, price: $1.price, priceUSD: $1.priceUSD) }
        let h = hotels.reduce(0) { $0 + paidUSD(paid: $1.paidAmount, price: $1.totalPrice, priceUSD: $1.totalPriceUSD) }
        let t = transports.reduce(0) { $0 + paidUSD(paid: $1.paidAmount, price: $1.price, priceUSD: $1.priceUSD) }
        let e = expenses.reduce(0) { $0 + paidUSD(paid: $1.paidAmount, price: $1.amount, priceUSD: $1.amountUSD) }
        return f + h + t + e
    }

    // MARK: - City-range assignment

    /// Asigna una ciudad a un rango de fechas. Quita esas fechas de otras ciudades si ya las tenían.
    func assignCity(_ targetCity: TripCity, toDates dates: [String]) async throws {
        guard let tripID = trip.id else { return }
        for var other in cities where other.id != targetCity.id {
            let overlap = Set(other.days).intersection(dates)
            if !overlap.isEmpty {
                other.days = other.days.filter { !overlap.contains($0) }
                try await client.updateCity(other, tripID: tripID)
            }
        }
        var updated = targetCity
        updated.days = Array(Set(updated.days).union(dates)).sorted()
        try await client.updateCity(updated, tripID: tripID)
    }

    /// Quita la asignación de ciudad de un rango de fechas.
    func removeCityFromDates(_ dates: [String]) async throws {
        guard let tripID = trip.id else { return }
        for var city in cities {
            let overlap = Set(city.days).intersection(dates)
            if !overlap.isEmpty {
                city.days = city.days.filter { !overlap.contains($0) }
                try await client.updateCity(city, tripID: tripID)
            }
        }
    }

    private let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.firstWeekday = 2
        c.locale = Locale(identifier: "es-AR")
        return c
    }()
}
