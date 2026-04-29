import Foundation
import Observation

@MainActor
@Observable
final class CatalogViewModel {
    private(set) var items: CatalogItems = .empty
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
        // Seed from disk cache so the catalog is not blank while the stream loads.
        if let cached = cache?.cachedCatalogSnapshot() {
            items = cached
            isLoading = false
            isOffline = true
        }

        streamTask?.cancel()
        streamTask = Task {
            do {
                for try await newItems in try client.allItemsStream() {
                    guard !Task.isCancelled else { break }
                    items = newItems
                    isLoading = false
                    isOffline = false
                    cache?.upsertCatalogSnapshot(newItems)
                }
            } catch {
                guard !Task.isCancelled else { return }
                // If we already have cached data, stay in the loaded-offline state
                // rather than pushing an error screen.
                if items.isEmpty {
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
}

// MARK: - CatalogItems convenience

private extension CatalogItems {
    var isEmpty: Bool {
        flights.isEmpty && hotels.isEmpty && transports.isEmpty && cities.isEmpty
    }
}
