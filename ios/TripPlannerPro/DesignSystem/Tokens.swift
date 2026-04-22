import SwiftUI

enum Tokens {
    enum Color {
        static let bgPrimary = SwiftUI.Color(hex: 0x0D0D0D)
        static let surface = SwiftUI.Color(hex: 0x1A1A1A)
        static let elevated = SwiftUI.Color(hex: 0x242424)
        static let border = SwiftUI.Color(hex: 0x333333)

        static let textPrimary = SwiftUI.Color(hex: 0xFFFFFF)
        static let textSecondary = SwiftUI.Color(hex: 0xA0A0A0)
        static let textTertiary = SwiftUI.Color(hex: 0x707070)

        static let accentBlue = SwiftUI.Color(hex: 0x0A84FF)
        static let accentGreen = SwiftUI.Color(hex: 0x30D158)
        static let accentOrange = SwiftUI.Color(hex: 0xFF9F0A)
        static let accentRed = SwiftUI.Color(hex: 0xFF453A)
        static let accentPurple = SwiftUI.Color(hex: 0xBF5AF2)

        static let cityPalette: [SwiftUI.Color] = [
            SwiftUI.Color(hex: 0xFF6B6B),
            SwiftUI.Color(hex: 0x4ECDC4),
            SwiftUI.Color(hex: 0xFFD93D),
            SwiftUI.Color(hex: 0x95E1D3),
            SwiftUI.Color(hex: 0xC77DFF),
            SwiftUI.Color(hex: 0xFF8FA3),
            SwiftUI.Color(hex: 0x6BCB77),
            SwiftUI.Color(hex: 0x4D96FF),
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
        static let xl: CGFloat = 20
        static let pill: CGFloat = 999
    }

    enum Motion {
        static let fast: Double = 0.18
        static let base: Double = 0.24
        static let slow: Double = 0.32
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
