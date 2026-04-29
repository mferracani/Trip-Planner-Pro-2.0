import Foundation

enum MoneyFormatter {
    static func symbol(for currency: String) -> String {
        switch currency.uppercased() {
        case "USD":
            return "$"
        case "EUR":
            return "€"
        default:
            return currency.uppercased()
        }
    }

    static func amount(_ value: Double, currency: String) -> String {
        "\(symbol(for: currency)) \(number(value))"
    }

    private static func number(_ value: Double) -> String {
        if value == value.rounded() {
            return String(format: "%.0f", value)
        }
        return String(format: "%.2f", value)
    }
}
