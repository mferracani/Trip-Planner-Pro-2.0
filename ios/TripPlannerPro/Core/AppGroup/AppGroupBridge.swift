import Foundation

/// Shared channel between the main app and the Share Extension.
/// Both targets have the `group.com.mferracani.tripplannerpro` App Group entitlement.
enum AppGroupBridge {
    private static let suiteName = "group.com.mferracani.tripplannerpro"
    private static let pendingParseKey = "pendingParse"
    private static let cachedTripsKey = "cachedTripSummaries"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    // MARK: - Pending Parse (Share Extension → Main App)

    struct PendingParse: Codable {
        let text: String
        let source: String       // "share_extension" | "deep_link"
        let createdAt: Date
    }

    static func writePendingParse(text: String, source: String = "share_extension") {
        let pending = PendingParse(text: text, source: source, createdAt: Date())
        let encoded = try? JSONEncoder().encode(pending)
        defaults?.set(encoded, forKey: pendingParseKey)
    }

    static func readPendingParse() -> PendingParse? {
        guard let data = defaults?.data(forKey: pendingParseKey) else { return nil }
        return try? JSONDecoder().decode(PendingParse.self, from: data)
    }

    static func clearPendingParse() {
        defaults?.removeObject(forKey: pendingParseKey)
    }

    // MARK: - Cached Trip Summaries (Main App → Share Extension)

    struct TripSummary: Codable, Identifiable {
        let id: String
        let name: String
        let startDate: Date
        let endDate: Date
    }

    static func writeTripSummaries(_ trips: [TripSummary]) {
        let encoded = try? JSONEncoder().encode(trips)
        defaults?.set(encoded, forKey: cachedTripsKey)
    }

    static func readTripSummaries() -> [TripSummary] {
        guard let data = defaults?.data(forKey: cachedTripsKey) else { return [] }
        return (try? JSONDecoder().decode([TripSummary].self, from: data)) ?? []
    }
}
