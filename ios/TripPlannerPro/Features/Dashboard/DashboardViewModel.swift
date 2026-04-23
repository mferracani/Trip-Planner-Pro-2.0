import Foundation
import Observation

@MainActor
@Observable
final class DashboardViewModel {
    private(set) var trips: [Trip] = []
    private(set) var isLoading = true
    private(set) var isOffline = false
    private(set) var error: Error?

    var filter: TripsFilter = .all

    enum TripsFilter: String, CaseIterable, Identifiable {
        case all = "Todos"
        case upcoming = "Próximos"
        case active = "En curso"
        case past = "Pasados"

        var id: String { rawValue }
    }

    private var streamTask: Task<Void, Never>?
    private let client: FirestoreClient
    private let cache: CacheManager?

    init(client: FirestoreClient, cache: CacheManager? = nil) {
        self.client = client
        self.cache = cache
    }

    func start() {
        if let cached = cache?.cachedTrips(), !cached.isEmpty {
            trips = cached
            isLoading = false
            isOffline = true
        }

        streamTask?.cancel()
        streamTask = Task {
            do {
                for try await t in try client.tripsStream() {
                    guard !Task.isCancelled else { break }
                    trips = t
                    isLoading = false
                    isOffline = false
                    cache?.upsertTrips(t)
                }
            } catch {
                guard !Task.isCancelled else { return }
                if trips.isEmpty {
                    self.error = error
                    isLoading = false
                }
                isOffline = true
            }
        }
    }

    func stop() {
        streamTask?.cancel()
        streamTask = nil
    }

    // MARK: - Greeting

    var greeting: String {
        if let active = trips.first(where: { $0.status_computed == .active }) {
            return "Día \(active.currentDayNumber) de tu viaje"
        }

        if let next = upcomingTrip {
            let days = next.daysUntilStart
            if days == 0 { return "Buen viaje, Mati" }
            if days == 1 { return "Mañana empieza" }
            if days <= 7 { return "Esta semana viajás" }
        }

        return "Hola, Mati"
    }

    var todayLabel: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.setLocalizedDateFormatFromTemplate("EEEEdMMMM")
        return f.string(from: Date())
    }

    // MARK: - Trips segmentation

    var upcomingTrip: Trip? {
        trips.filter { $0.status_computed == .planned }.min(by: { $0.startDate < $1.startDate })
    }

    var activeTrip: Trip? {
        trips.first(where: { $0.status_computed == .active })
    }

    /// Used for the hero card — active trip wins, else the next planned trip.
    var heroTrip: Trip? { activeTrip ?? upcomingTrip }

    var plannedTrips: [Trip] { trips.filter { $0.status_computed == .planned } }
    var activeTrips: [Trip] { trips.filter { $0.status_computed == .active } }
    var pastTrips: [Trip] { trips.filter { $0.status_computed == .past } }

    var filteredTrips: [Trip] {
        switch filter {
        case .all:      return trips.sorted { $0.startDate > $1.startDate }
        case .upcoming: return plannedTrips.sorted { $0.startDate < $1.startDate }
        case .active:   return activeTrips
        case .past:     return pastTrips.sorted { $0.startDate > $1.startDate }
        }
    }

    // MARK: - Annual stats

    var currentYear: Int {
        Calendar.current.component(.year, from: Date())
    }

    /// Trips that START this calendar year.
    var tripsThisYear: [Trip] {
        trips.filter { Calendar.current.component(.year, from: $0.startDate) == currentYear }
    }

    var statTripsThisYear: Int { tripsThisYear.count }

    var statCitiesVisited: Int {
        // Sum unique cityOrder counts across past + active trips this year.
        let relevant = tripsThisYear.filter { $0.status_computed != .planned }
        return relevant.reduce(0) { $0 + $1.cityOrder.count }
    }

    var statDaysTraveling: Int {
        tripsThisYear.reduce(0) { acc, trip in
            let days = Calendar.current.dateComponents([.day], from: trip.startDate, to: trip.endDate).day ?? 0
            return acc + max(0, days + 1)
        }
    }

    /// Placeholder — will be computed from trip items once catalog aggregates are available.
    var statTotalSpentUSD: Int { 0 }
}
