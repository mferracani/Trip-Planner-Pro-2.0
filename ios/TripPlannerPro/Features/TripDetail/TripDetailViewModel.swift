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

        tasks.append(subscribe { try self.client.citiesStream(tripID: tripID) } onValue: { [weak self] in
            self?.cities = $0
            self?.markLoaded()
        })

        tasks.append(subscribe { try self.client.flightsStream(tripID: tripID) } onValue: { [weak self] in
            self?.flights = $0
            self?.markLoaded()
        })

        tasks.append(subscribe { try self.client.hotelsStream(tripID: tripID) } onValue: { [weak self] in
            self?.hotels = $0
            self?.markLoaded()
        })

        tasks.append(subscribe { try self.client.transportsStream(tripID: tripID) } onValue: { [weak self] in
            self?.transports = $0
            self?.markLoaded()
        })

        tasks.append(subscribe { try self.client.expensesStream(tripID: tripID) } onValue: { [weak self] in
            self?.expenses = $0
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

    private let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.firstWeekday = 2
        c.locale = Locale(identifier: "es-AR")
        return c
    }()
}
