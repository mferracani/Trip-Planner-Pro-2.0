import Foundation
import SwiftData

// Infrastructure for TPP-53 (offline write queue).
// Operations are persisted here when a Firestore write fails due to no connectivity,
// then replayed by SyncQueue when the connection is restored.

enum PendingOpType: String, Codable {
    case create, update, delete
}

enum PendingEntityType: String, Codable {
    case flight, hotel, transport, expense, city
    case tripUpdate, tripStatusUpdate
}

@Model
final class CachedPendingOperation {
    @Attribute(.unique) var opID: String
    var tripID: String
    var documentID: String?
    var opTypeRaw: String
    var entityTypeRaw: String
    var payload: Data
    var createdAt: Date
    var retryCount: Int

    init(
        tripID: String,
        documentID: String? = nil,
        opType: PendingOpType,
        entityType: PendingEntityType,
        payload: Data
    ) {
        self.opID = UUID().uuidString
        self.tripID = tripID
        self.documentID = documentID
        self.opTypeRaw = opType.rawValue
        self.entityTypeRaw = entityType.rawValue
        self.payload = payload
        self.createdAt = Date()
        self.retryCount = 0
    }

    var opType: PendingOpType { PendingOpType(rawValue: opTypeRaw) ?? .update }
    var entityType: PendingEntityType { PendingEntityType(rawValue: entityTypeRaw) ?? .flight }
}
