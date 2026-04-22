import Foundation
import Observation

@MainActor
@Observable
final class TripDetailViewModel {
    let trip: Trip
    private(set) var cities: [TripCity] = []
    private(set) var flights: [Flight] = []
    private(set) var hotels: [Hotel] = []
    private(set) var transports: [Transport] = []
    private(set) var isLoading = true

    private var tasks: [Task<Void, Never>] = []
    private let client: FirestoreClient

    init(trip: Trip, client: FirestoreClient) {
        self.trip = trip
        self.client = client
    }

    func start() {
        guard let tripID = trip.id else { return }
        tasks.forEach { $0.cancel() }
        tasks = []

        tasks.append(Task {
            do {
                for try await c in try client.citiesStream(tripID: tripID) {
                    guard !Task.isCancelled else { break }
                    cities = c
                    isLoading = false
                }
            } catch { isLoading = false }
        })

        tasks.append(Task {
            do {
                for try await f in try client.flightsStream(tripID: tripID) {
                    guard !Task.isCancelled else { break }
                    flights = f
                }
            } catch {}
        })

        tasks.append(Task {
            do {
                for try await h in try client.hotelsStream(tripID: tripID) {
                    guard !Task.isCancelled else { break }
                    hotels = h
                }
            } catch {}
        })

        tasks.append(Task {
            do {
                for try await t in try client.transportsStream(tripID: tripID) {
                    guard !Task.isCancelled else { break }
                    transports = t
                }
            } catch {}
        })
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

    func city(for date: Date) -> TripCity? {
        cities.first { c in
            let d = calendar.startOfDay(for: date)
            return d >= calendar.startOfDay(for: c.startDate) && d <= calendar.startOfDay(for: c.endDate)
        }
    }

    func flights(on date: Date) -> [Flight] {
        let d = calendar.startOfDay(for: date)
        return flights.filter { calendar.startOfDay(for: $0.departureUTC) == d }
    }

    func hotels(on date: Date) -> [Hotel] {
        let d = calendar.startOfDay(for: date)
        return hotels.filter {
            let ci = calendar.startOfDay(for: $0.checkInUTC)
            let co = calendar.startOfDay(for: $0.checkOutUTC)
            return d >= ci && d < co
        }
    }

    func transports(on date: Date) -> [Transport] {
        let d = calendar.startOfDay(for: date)
        return transports.filter { calendar.startOfDay(for: $0.departureUTC) == d }
    }

    func cityColor(for date: Date) -> Color? {
        guard let c = city(for: date) else { return nil }
        return Tokens.Color.cityPalette[c.colorIndex % Tokens.Color.cityPalette.count]
    }

    private let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.firstWeekday = 2  // Monday
        c.locale = Locale(identifier: "es-AR")
        return c
    }()
}

import SwiftUI
extension TripDetailViewModel {
    typealias Color = SwiftUI.Color
}
