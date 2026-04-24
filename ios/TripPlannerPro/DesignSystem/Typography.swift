import SwiftUI

extension Tokens {
    enum Typography {
        // SF Pro text scale
        static let largeTitle  = SwiftUI.Font.system(size: 34, weight: .bold)
        static let title1      = SwiftUI.Font.system(size: 28, weight: .bold)
        static let title2      = SwiftUI.Font.system(size: 22, weight: .semibold)
        static let title3      = SwiftUI.Font.system(size: 20, weight: .semibold)
        static let headline    = SwiftUI.Font.system(size: 17, weight: .semibold)
        static let body        = SwiftUI.Font.system(size: 17, weight: .regular)
        static let callout     = SwiftUI.Font.system(size: 16, weight: .regular)
        static let subheadline = SwiftUI.Font.system(size: 15, weight: .regular)
        static let footnote    = SwiftUI.Font.system(size: 13, weight: .regular)
        static let caption1    = SwiftUI.Font.system(size: 12, weight: .medium)
        static let caption2    = SwiftUI.Font.system(size: 11, weight: .regular)

        // Rounded numerics — stats and money amounts
        static let statLarge  = SwiftUI.Font.system(size: 34, weight: .bold,     design: .rounded)
        static let statMedium = SwiftUI.Font.system(size: 22, weight: .bold,     design: .rounded)
        static let statSmall  = SwiftUI.Font.system(size: 17, weight: .semibold, design: .rounded)

        // Monospaced — times, airport codes, booking refs
        static let timeLabel = SwiftUI.Font.system(size: 13, weight: .medium,   design: .monospaced)
        static let codeLabel = SwiftUI.Font.system(size: 12, weight: .semibold, design: .monospaced)
        static let iataCode  = SwiftUI.Font.system(size: 11, weight: .bold,     design: .monospaced)

        // Calendar cell
        static let dayDate   = SwiftUI.Font.system(size: 11, weight: .semibold)
        static let cellBadge = SwiftUI.Font.system(size: 9,  weight: .semibold)
        static let cityTag   = SwiftUI.Font.system(size: 9,  weight: .bold)
    }
}
