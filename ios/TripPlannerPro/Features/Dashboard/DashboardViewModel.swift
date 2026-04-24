import Foundation
import Observation

@MainActor
@Observable
final class DashboardViewModel {
    private(set) var trips: [Trip] = []
    private(set) var isLoading = true
    private(set) var isOffline = false
    private(set) var error: Error?

    private var streamTask: Task<Void, Never>?
    private let client: FirestoreClient
    private let cache: CacheManager?

    init(client: FirestoreClient, cache: CacheManager? = nil) {
        self.client = client
        self.cache = cache
    }

    func start() {
        // Show cached data immediately while Firestore loads
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
                // If Firestore fails and we have no cache yet, show error
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
        let now = Date()

        if let active = trips.first(where: { $0.status_computed == .active }) {
            let day = active.currentDayNumber
            return "Día \(day) de tu viaje"
        }

        if let next = upcomingTrip {
            let days = next.daysUntilStart
            if days == 0 { return "Buen viaje, Mati ✈️" }
            if days == 1 { return "Mañana empieza" }
            if days <= 7 { return "Esta semana · faltan \(days) días" }
        }

        return "Hola, Mati"
    }

    var countdownText: String? {
        guard let next = upcomingTrip else { return nil }
        let days = next.daysUntilStart
        if days <= 0 { return nil }
        if days > 30 { return "Faltan \(days) días" }
        if days <= 7 { return "Faltan \(days) días" }
        return "Faltan \(days) días"
    }

    var countdownUrgent: Bool {
        guard let days = upcomingTrip?.daysUntilStart else { return false }
        return days <= 7
    }

    var upcomingTrip: Trip? {
        trips.filter { $0.status_computed == .planned }.min(by: { $0.startDate < $1.startDate })
    }

    var heroTrip: Trip? {
        trips.first(where: { $0.status_computed == .active }) ?? upcomingTrip ?? trips.first
    }

    var tripsThisYear: [Trip] {
        let year = Calendar.current.component(.year, from: Date())
        return trips.filter { Calendar.current.component(.year, from: $0.startDate) == year }
    }

    var totalTravelDaysThisYear: Int {
        tripsThisYear.reduce(0) { total, trip in
            let days = Calendar.current.dateComponents([.day], from: trip.startDate, to: trip.endDate).day ?? 0
            return total + max(days + 1, 0)
        }
    }

    var plannedTrips: [Trip] { trips.filter { $0.status_computed == .planned } }
    var activeTrips: [Trip] { trips.filter { $0.status_computed == .active } }
    var pastTrips: [Trip] { trips.filter { $0.status_computed == .past } }
}
