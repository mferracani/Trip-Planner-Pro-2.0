import SwiftUI

enum Tokens {
    enum Color {
        static let bgPrimary = SwiftUI.Color(hex: 0x090806)
        static let bgSecondary = SwiftUI.Color(hex: 0x12100D)
        static let surface = SwiftUI.Color(hex: 0x171512)
        static let elevated = SwiftUI.Color(hex: 0x242018)
        static let surfaceGlass = SwiftUI.Color(hex: 0x1D1A15).opacity(0.78)
        static let border = SwiftUI.Color(hex: 0x332E25)
        static let borderSoft = SwiftUI.Color(hex: 0x252119)

        static let textPrimary = SwiftUI.Color(hex: 0xFFFFFF)
        static let textSecondary = SwiftUI.Color(hex: 0xC6BDAE)
        static let textTertiary = SwiftUI.Color(hex: 0x81786A)

        static let travelMint = SwiftUI.Color(hex: 0x71D3A6)
        static let travelMintDeep = SwiftUI.Color(hex: 0x244437)
        static let sunGold = SwiftUI.Color(hex: 0xFFD16A)
        static let sand = SwiftUI.Color(hex: 0xF3ECE1)
        static let accentBlue = SwiftUI.Color(hex: 0x6CAFE8)
        static let accentGreen = SwiftUI.Color(hex: 0x30D158)
        static let accentOrange = SwiftUI.Color(hex: 0xFFD16A)
        static let accentRed = SwiftUI.Color(hex: 0xFF453A)
        static let accentPurple = SwiftUI.Color(hex: 0xA891E8)

        static let cityPalette: [SwiftUI.Color] = [
            SwiftUI.Color(hex: 0x71D3A6),
            SwiftUI.Color(hex: 0x74ACDF),
            SwiftUI.Color(hex: 0xFFD16A),
            SwiftUI.Color(hex: 0xF29E7D),
            SwiftUI.Color(hex: 0xA891E8),
            SwiftUI.Color(hex: 0xE98A9A),
            SwiftUI.Color(hex: 0x6BCB77),
            SwiftUI.Color(hex: 0x6CAFE8),
        ]

        enum Category {
            static let flight = SwiftUI.Color(hex: 0x0A84FF)
            static let hotel = SwiftUI.Color(hex: 0xFF9F0A)
            static let transit = SwiftUI.Color(hex: 0xBF5AF2)
        }
    }

    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let base: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    enum Radius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
        static let pill: CGFloat = 999
    }

    enum Motion {
        static let fast: Double = 0.18
        static let base: Double = 0.24
        static let slow: Double = 0.32
    }

    enum Country {
        static func flag(_ countryCode: String) -> String {
            let code = countryCode.uppercased()
            guard code.count == 2 else { return "" }
            let base: UInt32 = 127397
            return code.unicodeScalars.compactMap { scalar in
                UnicodeScalar(base + scalar.value).map(String.init)
            }.joined()
        }
    }
}

extension Color {
    init(hex: UInt32, opacity: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
    }
}
