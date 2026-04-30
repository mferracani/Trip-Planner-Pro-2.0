import FirebaseAuth
import FirebaseStorage
import Foundation

@MainActor
final class StorageClient: Sendable {
    static let shared = StorageClient()
    private init() {}

    private var userUID: String? {
        HouseholdConfig.ownerUID ?? Auth.auth().currentUser?.uid
    }

    // MARK: - Travel Documents

    /// Uploads a file to `users/{uid}/documents/{filename}` and returns the storage path.
    func uploadTravelDocument(data: Data, fileName: String, mimeType: String) async throws -> String {
        guard let uid = userUID else { throw StorageClientError.notAuthenticated }
        let storagePath = "users/\(uid)/documents/\(fileName)"
        let ref = Storage.storage().reference().child(storagePath)
        let metadata = StorageMetadata()
        metadata.contentType = mimeType
        _ = try await ref.putDataAsync(data, metadata: metadata)
        return storagePath
    }

    /// Downloads the file at the given storage path into a temporary URL for preview/share.
    func downloadTravelDocument(storagePath: String) async throws -> URL {
        let ref = Storage.storage().reference().child(storagePath)
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension(storagePath.components(separatedBy: ".").last ?? "bin")
        _ = try await ref.writeAsync(toFile: tempURL)
        return tempURL
    }

    /// Deletes the file at the given storage path.
    func deleteTravelDocument(storagePath: String) async throws {
        let ref = Storage.storage().reference().child(storagePath)
        try await ref.delete()
    }
}

enum StorageClientError: Error {
    case notAuthenticated
}
