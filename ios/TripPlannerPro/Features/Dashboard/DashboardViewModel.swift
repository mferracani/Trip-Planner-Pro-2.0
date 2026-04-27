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
        case draft = "Borradores"

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

    /// Confirmed trips only (excludes drafts).
    var confirmedTrips: [Trip] { trips.filter { $0.status != .draft } }

    var draftTrips: [Trip] { trips.filter { $0.status == .draft } }

    var upcomingTrip: Trip? {
        confirmedTrips.filter { $0.status_computed == .planned }.min(by: { $0.startDate < $1.startDate })
    }

    var activeTrip: Trip? {
        confirmedTrips.first(where: { $0.status_computed == .active })
    }

    /// Used for the hero card — active trip wins, else the next planned trip (drafts excluded).
    var heroTrip: Trip? { activeTrip ?? upcomingTrip }

    var plannedTrips: [Trip] { confirmedTrips.filter { $0.status_computed == .planned } }
    var activeTrips: [Trip] { confirmedTrips.filter { $0.status_computed == .active } }
    var pastTrips: [Trip] { confirmedTrips.filter { $0.status_computed == .past } }

    var filteredTrips: [Trip] {
        switch filter {
        case .all:      return confirmedTrips.sorted { $0.startDate > $1.startDate }
        case .upcoming: return plannedTrips.sorted { $0.startDate < $1.startDate }
        case .active:   return activeTrips
        case .past:     return pastTrips.sorted { $0.startDate > $1.startDate }
        case .draft:    return draftTrips.sorted { $0.startDate < $1.startDate }
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

    /// All cities across ALL trips this year (includes planned, for header subtitle).
    var statYearCities: Int {
        tripsThisYear.reduce(0) { $0 + ($1.citiesCount ?? 0) }
    }

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

    /// Sum of trip total_usd aggregates across all trips (past + current).
    var statTotalSpentUSD: Int {
        let total = trips.reduce(0.0) { $0 + ($1.totalUSD ?? 0) }
        return Int(total.rounded())
    }

    /// Days between today and the heroTrip's start (0 if active / past).
    var daysUntilHero: Int {
        guard let hero = heroTrip else { return 0 }
        if hero.status_computed == .active { return 0 }
        return max(0, hero.daysUntilStart)
    }

    /// Progress metric for the hero ring:
    /// - If a trip is active → % of trip time elapsed
    /// - If a next trip exists → inverse of days-until (clamped), so the ring
    ///   fills as the trip approaches
    /// - Otherwise → % of year elapsed
    var heroProgress: Double {
        if let active = activeTrip {
            let total = max(1, Calendar.current.dateComponents([.day], from: active.startDate, to: active.endDate).day ?? 0)
            let elapsed = max(0, Calendar.current.dateComponents([.day], from: active.startDate, to: Date()).day ?? 0)
            return min(1, Double(elapsed) / Double(total + 1))
        }
        if let next = upcomingTrip {
            let days = max(0, next.daysUntilStart)
            // 0 days → 1.0 (about to start); 90+ days → 0.1
            let p = max(0.05, 1 - Double(days) / 90.0)
            return min(1, p)
        }
        let dayOfYear = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 1
        return Double(dayOfYear) / 365.0
    }
}
