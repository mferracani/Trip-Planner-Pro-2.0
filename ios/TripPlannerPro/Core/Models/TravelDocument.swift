@preconcurrency import FirebaseFirestore
import Foundation
import SwiftUI

enum TravelDocumentType: String, Codable, CaseIterable, Sendable {
    case passport
    case visa
    case insurance
    case other

    var label: String {
        switch self {
        case .passport:  return "Pasaporte"
        case .visa:      return "Visa"
        case .insurance: return "Seguro"
        case .other:     return "Otro"
        }
    }

    var systemImage: String {
        switch self {
        case .passport:  return "person.text.rectangle"
        case .visa:      return "doc.text.magnifyingglass"
        case .insurance: return "shield.lefthalf.filled"
        case .other:     return "doc.fill"
        }
    }

    var tint: Color {
        switch self {
        case .passport:  return Tokens.Color.accentBlue
        case .visa:      return Tokens.Color.accentGreen
        case .insurance: return Tokens.Color.accentOrange
        case .other:     return Tokens.Color.textSecondary
        }
    }
}

struct TravelDocument: Identifiable, Codable, Sendable {
    @DocumentID var id: String?
    var type: TravelDocumentType
    var title: String
    var storageRef: String      // "users/{uid}/documents/{filename}"
    var fileName: String
    var mimeType: String
    var expiresAt: String?      // "YYYY-MM-DD"
    var notes: String?
    var createdAt: Date
    var updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case type
        case title
        case storageRef = "storage_ref"
        case fileName = "file_name"
        case mimeType = "mime_type"
        case expiresAt = "expires_at"
        case notes
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var isExpired: Bool {
        guard let s = expiresAt, let date = Trip.isoDateFormatter.date(from: s) else { return false }
        return date < Date()
    }

    var expiresInDays: Int? {
        guard let s = expiresAt, let date = Trip.isoDateFormatter.date(from: s) else { return nil }
        return Calendar.current.dateComponents([.day], from: .now, to: date).day
    }

    var isPDF: Bool { mimeType == "application/pdf" }
}
