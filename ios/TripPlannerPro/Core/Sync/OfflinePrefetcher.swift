import Foundation
import Observation

// Proactively caches the active trip + next 2 planned trips so the app
// works read-only when offline. Triggered on WiFi connect and on first launch.

@MainActor
@Observable
final class OfflinePrefetcher {
    private(set) var isPrefetching = false

    private var lastPrefetchAt: Date?
    private let minInterval: TimeInterval = 300  // 5-min cooldown between prefetches

    func prefetchIfNeeded(client: FirestoreClient, cache: CacheManager) {
        guard !isPrefetching else { return }
        if let last = lastPrefetchAt, Date().timeIntervalSince(last) < minInterval { return }

        Task { [weak self] in
            guard let self else { return }
            self.isPrefetching = true
            defer { self.isPrefetching = false }

            do {
                // 1. Fetch fresh trip list and update cache.
                let allTrips = try await client.fetchTripsOnce()
                cache.upsertTrips(allTrips)

                // 2. Pick targets: active trip (if any) + up to 2 next planned trips.
                let now = Date()
                let active = allTrips.first { $0.status_computed == .active }
                let upcoming = allTrips
                    .filter { $0.status != .draft && $0.startDate > now }
                    .sorted { $0.startDate < $1.startDate }
                    .prefix(2)

                var targets: [Trip] = []
                if let active { targets.append(active) }
                targets.append(contentsOf: upcoming)

                // 3. Fetch all subcollections in parallel and store in cache.
                await withTaskGroup(of: Void.self) { group in
                    for trip in targets {
                        guard let tripID = trip.id else { continue }
                        group.addTask {
                            await client.prefetchTripItems(tripID: tripID, into: cache)
                        }
                    }
                }

                self.lastPrefetchAt = Date()
            } catch {
                // Silent failure — existing cache is still usable offline.
            }
        }
    }
}
