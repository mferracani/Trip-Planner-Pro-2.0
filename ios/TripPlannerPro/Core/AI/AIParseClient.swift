import FirebaseAuth
import Foundation

// TODO: Después del primer deploy, reemplazá esto con la URL real de la Cloud Function.
// La encontrás en: Firebase Console → Functions → parseWithAI → "Trigger URL"
// Ejemplo: https://us-east1-trip-planner-pro-2.cloudfunctions.net/parseWithAI
private let PARSE_FUNCTION_URL = "https://parsewithai-onxomw4ntq-ue.a.run.app"

enum AIProvider: String, CaseIterable, Identifiable {
    case claude = "claude"
    case gemini = "gemini"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .claude: return "Claude"
        case .gemini: return "Gemini"
        }
    }

    var systemImage: String {
        switch self {
        case .claude: return "brain"
        case .gemini: return "sparkles"
        }
    }
}

enum AIParseError: LocalizedError {
    case notAuthenticated
    case functionURLNotConfigured
    case networkError(String)
    case serverError(Int, String)
    case decodingError(String)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated: return "No hay sesión activa."
        case .functionURLNotConfigured: return "La URL de la función no está configurada."
        case .networkError(let msg): return "Error de red: \(msg)"
        case .serverError(let code, let msg): return "Error del servidor (\(code)): \(msg)"
        case .decodingError(let msg): return "Error al procesar respuesta: \(msg)"
        }
    }
}

actor AIParseClient {
    static let shared = AIParseClient()

    func parse(
        input: String,
        inputType: String = "text",
        provider: AIProvider = .claude,
        tripId: String
    ) async throws -> ParseResponse {
        guard !PARSE_FUNCTION_URL.contains("REPLACE_WITH_PROJECT_ID") else {
            throw AIParseError.functionURLNotConfigured
        }

        guard let user = Auth.auth().currentUser else {
            throw AIParseError.notAuthenticated
        }

        let idToken = try await user.getIDToken()

        guard let url = URL(string: PARSE_FUNCTION_URL) else {
            throw AIParseError.functionURLNotConfigured
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 90

        let body: [String: String] = [
            "input": input,
            "inputType": inputType,
            "provider": provider.rawValue,
            "tripId": tripId,
        ]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AIParseError.networkError("Respuesta inválida")
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            let msg = String(data: data, encoding: .utf8) ?? "Sin detalles"
            throw AIParseError.serverError(httpResponse.statusCode, msg)
        }

        do {
            return try JSONDecoder().decode(ParseResponse.self, from: data)
        } catch {
            throw AIParseError.decodingError(error.localizedDescription)
        }
    }
}
