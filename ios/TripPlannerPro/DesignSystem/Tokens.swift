import SwiftUI

// MARK: - Atlas OS Tokens
//
// Visual language: "cartographer's console" — warm ink canvas, paper cream
// text, amber as primary signal. Serif display for editorial voice, mono for
// technical metadata. Expedition color palette for cities.

enum Tokens {
    enum Color {
        // MARK: Ink (surfaces)

        /// Canvas — warm near-black (not pure). Base of every screen.
        static let bgPrimary = SwiftUI.Color(hex: 0x0B0A09)
        /// Elevated surface (one step up from canvas).
        static let surface = SwiftUI.Color(hex: 0x1A1714)
        /// Raised surface (cards, sheets).
        static let elevated = SwiftUI.Color(hex: 0x2A2620)
        /// Strong divider.
        static let border = SwiftUI.Color(hex: 0x3A342C)
        /// Whisper-soft hairline — the building block of the grid.
        static let borderSoft = SwiftUI.Color(hex: 0x28241F)

        // MARK: Paper (text)

        /// Primary text — warm cream, not pure white.
        static let textPrimary = SwiftUI.Color(hex: 0xF6F1E7)
        /// Secondary text.
        static let textSecondary = SwiftUI.Color(hex: 0xC2B9A8)
        /// Tertiary text (metadata, captions).
        static let textTertiary = SwiftUI.Color(hex: 0x7A7466)
        /// Quaternary text (muted, placeholder).
        static let textQuaternary = SwiftUI.Color(hex: 0x504A40)

        // MARK: Signal (accents)
        //
        // `accentBlue` is the SEMANTIC primary action color — kept the legacy
        // name for zero-touch refactor, but visually it's Atlas Amber now.

        /// Primary action — warm amber gold. Replaces the iOS-default blue.
        static let accentBlue = SwiftUI.Color(hex: 0xFFC857)
        /// Success / paid / positive.
        static let accentGreen = SwiftUI.Color(hex: 0x6DD5A7)
        /// Warning / pending / warm.
        static let accentOrange = SwiftUI.Color(hex: 0xE8896E)
        /// Destructive / error.
        static let accentRed = SwiftUI.Color(hex: 0xFF6B5B)
        /// AI / magical / spark.
        static let accentPurple = SwiftUI.Color(hex: 0xB19CD9)
        static let accentPurpleDeep = SwiftUI.Color(hex: 0x8C74BA)

        /// Cold accent (kept for occasional use — the true sky blue).
        static let signalSky = SwiftUI.Color(hex: 0x6FC5FF)

        // MARK: Expedition palette (city signature colors)

        static let cityPalette: [SwiftUI.Color] = [
            SwiftUI.Color(hex: 0xE8896E), // clay
            SwiftUI.Color(hex: 0x6FC5FF), // sky
            SwiftUI.Color(hex: 0x6DD5A7), // mint
            SwiftUI.Color(hex: 0xB19CD9), // violet
            SwiftUI.Color(hex: 0xFFC857), // amber
            SwiftUI.Color(hex: 0xFF6B5B), // coral
            SwiftUI.Color(hex: 0xD4A574), // sand
            SwiftUI.Color(hex: 0x8BB796), // sage
        ]

        enum Category {
            /// Flights — sky.
            static let flight = SwiftUI.Color(hex: 0x6FC5FF)
            /// Hotels — clay.
            static let hotel = SwiftUI.Color(hex: 0xE8896E)
            /// Transit — violet.
            static let transit = SwiftUI.Color(hex: 0xB19CD9)
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
        static let md: CGFloat = 14
        static let lg: CGFloat = 20
        static let xl: CGFloat = 28
        static let pill: CGFloat = 999
    }

    enum Motion {
        static let fast: Double = 0.18
        static let base: Double = 0.24
        static let slow: Double = 0.42

        /// Atlas signature spring — slight overshoot, never bouncy.
        static let spring = Animation.spring(response: 0.42, dampingFraction: 0.82)
        /// Snappy spring — for taps and toggles.
        static let snap = Animation.spring(response: 0.26, dampingFraction: 0.76)
    }

    // MARK: - Typography
    //
    // Philosophy:
    // - DISPLAY uses semibold sans with tight negative tracking — matches the
    //   Revolut/Nubank visual register the user wants (not serif/editorial).
    // - BODY stays SF Pro for legibility.
    // - MONO reserved exclusively for metadata (dates, codes, prices).
    // Phase 4 will bundle a custom sans (Geist or Satoshi) as a final polish.
    enum Typo {
        // DISPLAY — large semibold sans with tight kerning
        static let displayXXL = Font.system(size: 40, weight: .semibold)
        static let displayXL = Font.system(size: 32, weight: .semibold)
        static let displayL = Font.system(size: 26, weight: .semibold)
        static let displayM = Font.system(size: 20, weight: .semibold)
        static let displayS = Font.system(size: 17, weight: .semibold)

        // BODY — SF Pro, readable
        static let bodyL = Font.system(size: 16, weight: .regular)
        static let bodyM = Font.system(size: 14, weight: .regular)
        static let bodyS = Font.system(size: 13, weight: .regular)

        // STRONG — emphasized body
        static let strongL = Font.system(size: 16, weight: .semibold)
        static let strongM = Font.system(size: 14, weight: .semibold)
        static let strongS = Font.system(size: 13, weight: .semibold)

        // MONO — metadata, codes, times, prices
        static let monoXL = Font.system(size: 28, weight: .bold, design: .monospaced)
        static let monoL = Font.system(size: 15, weight: .semibold, design: .monospaced)
        static let monoM = Font.system(size: 13, weight: .semibold, design: .monospaced)
        static let monoS = Font.system(size: 11, weight: .medium, design: .monospaced)
        static let monoXS = Font.system(size: 10, weight: .medium, design: .monospaced)
    }

    // Kerning presets applied with .tracking() in SwiftUI.
    enum Track {
        static let displayTight: CGFloat = -0.8
        static let headlineTight: CGFloat = -0.4
        static let bodyTight: CGFloat = -0.2
        static let none: CGFloat = 0
        static let labelWide: CGFloat = 0.8
        static let labelWider: CGFloat = 1.2
        static let labelWidest: CGFloat = 1.6
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
