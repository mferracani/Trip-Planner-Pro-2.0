import SwiftUI

enum Tokens {
    enum Color {
        static let bgPrimary = SwiftUI.Color(hex: 0x0D0D0D)
        static let surface = SwiftUI.Color(hex: 0x1A1A1A)
        static let elevated = SwiftUI.Color(hex: 0x242424)
        static let border = SwiftUI.Color(hex: 0x333333)
        static let borderSoft = SwiftUI.Color(hex: 0x262626)

        static let textPrimary = SwiftUI.Color(hex: 0xFFFFFF)
        static let textSecondary = SwiftUI.Color(hex: 0xA0A0A0)
        static let textTertiary = SwiftUI.Color(hex: 0x707070)
        static let textQuaternary = SwiftUI.Color(hex: 0x4D4D4D)

        static let accentBlue = SwiftUI.Color(hex: 0x0A84FF)
        static let accentGreen = SwiftUI.Color(hex: 0x30D158)
        static let accentOrange = SwiftUI.Color(hex: 0xFF9F0A)
        static let accentRed = SwiftUI.Color(hex: 0xFF453A)
        static let accentPurple = SwiftUI.Color(hex: 0xBF5AF2)
        static let accentPurpleDeep = SwiftUI.Color(hex: 0x9647D4)

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

    // MARK: - Typography
    //
    // Philosophy: mono for metadata (boarding-pass feel), tight display for titles,
    // wide tracking on uppercase labels. These are the "premium" signals.
    enum Typo {
        // DISPLAY — big, tight, expensive
        static let displayXL = Font.system(size: 34, weight: .bold)
        static let displayL = Font.system(size: 28, weight: .bold)
        static let displayM = Font.system(size: 22, weight: .bold)
        static let displayS = Font.system(size: 18, weight: .semibold)

        // BODY — readable content
        static let bodyL = Font.system(size: 17, weight: .regular)
        static let bodyM = Font.system(size: 15, weight: .regular)
        static let bodyS = Font.system(size: 13, weight: .regular)

        // STRONG — emphasized body
        static let strongL = Font.system(size: 17, weight: .semibold)
        static let strongM = Font.system(size: 15, weight: .semibold)
        static let strongS = Font.system(size: 13, weight: .semibold)

        // MONO — metadata, data points, hours, prices
        static let monoXL = Font.system(size: 28, weight: .bold, design: .monospaced)
        static let monoL = Font.system(size: 15, weight: .semibold, design: .monospaced)
        static let monoM = Font.system(size: 13, weight: .semibold, design: .monospaced)
        static let monoS = Font.system(size: 11, weight: .medium, design: .monospaced)
        static let monoXS = Font.system(size: 10, weight: .medium, design: .monospaced)
    }

    // Kerning presets applied with .tracking() in SwiftUI.
    enum Track {
        static let displayTight: CGFloat = -1.2
        static let headlineTight: CGFloat = -0.6
        static let bodyTight: CGFloat = -0.3
        static let none: CGFloat = 0
        static let labelWide: CGFloat = 0.8
        static let labelWider: CGFloat = 1.2
        static let labelWidest: CGFloat = 1.4
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
