import SwiftUI

// MARK: - FlightStatusBadge
//
// Displays a compact capsule badge for v1.1 flight tracking status.
// Populated by the `trackFlights` Cloud Function via `current_status` on Flight documents.
// Renders nothing when `status` is nil.

struct FlightStatusBadge: View {
    let status: String?

    private struct StatusAppearance {
        let label: String
        let color: Color
    }

    private var appearance: StatusAppearance? {
        guard let status else { return nil }
        switch status {
        case "Scheduled":
            return StatusAppearance(label: "Programado", color: Color(hex: 0x4D96FF))
        case "Active":
            return StatusAppearance(label: "En vuelo",   color: Color(hex: 0x71D3A6))
        case "Landed":
            return StatusAppearance(label: "Aterrizó",   color: Color(hex: 0x71D3A6))
        case "Delayed":
            return StatusAppearance(label: "Demorado",   color: Color(hex: 0xF29E7D))
        case "Canceled":
            return StatusAppearance(label: "Cancelado",  color: Color(hex: 0xE54B4B))
        default:
            return StatusAppearance(label: status,       color: Color(hex: 0x81786A))
        }
    }

    var body: some View {
        if let a = appearance {
            Text(a.label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(a.color)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(
                    Capsule()
                        .fill(a.color.opacity(0.12))
                )
        }
    }
}

#Preview {
    VStack(alignment: .leading, spacing: 10) {
        FlightStatusBadge(status: "Scheduled")
        FlightStatusBadge(status: "Active")
        FlightStatusBadge(status: "Landed")
        FlightStatusBadge(status: "Delayed")
        FlightStatusBadge(status: "Canceled")
        FlightStatusBadge(status: "Unknown")
        FlightStatusBadge(status: nil)
    }
    .padding(20)
    .background(Tokens.Color.bgPrimary)
    .preferredColorScheme(.dark)
}
