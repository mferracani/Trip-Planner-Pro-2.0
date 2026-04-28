import SwiftUI

// MARK: - Design Tokens — mirrors web (Next.js) design system exactly.
// Any change here must be reflected in the web Tailwind classes and vice versa.

enum Tokens {

    // MARK: - Color
    enum Color {
        // MARK: Surfaces — matches web bg/card classes

        /// Base canvas. Web: bg-[#090806]
        static let bgPrimary = SwiftUI.Color(hex: 0x090806)
        /// Primary card surface. Web: bg-[#171717]
        static let surface = SwiftUI.Color(hex: 0x171717)
        /// Elevated card / input surface. Web: bg-[#1A1A1A]
        static let elevated = SwiftUI.Color(hex: 0x1A1A1A)
        /// Raised input / pressed state. Web: bg-[#242424]
        static let raised = SwiftUI.Color(hex: 0x242424)
        /// Strong border. Web: border-[#333333]
        static let border = SwiftUI.Color(hex: 0x333333)
        /// Soft border / divider. Web: border-[#262626]
        static let borderSoft = SwiftUI.Color(hex: 0x262626)
        /// Hairline divider. Web: border-[#1E1E1E]
        static let borderHair = SwiftUI.Color(hex: 0x1E1E1E)
        /// Modal / sheet overlay
        static let overlay = SwiftUI.Color.black.opacity(0.6)

        // MARK: Text — matches web text color classes

        /// Primary text. Web: text-white
        static let textPrimary = SwiftUI.Color(hex: 0xFFFFFF)
        /// Secondary text. Web: text-[#A0A0A0]
        static let textSecondary = SwiftUI.Color(hex: 0xA0A0A0)
        /// Tertiary text. Web: text-[#707070]
        static let textTertiary = SwiftUI.Color(hex: 0x707070)
        /// Quaternary / placeholder. Web: text-[#4D4D4D]
        static let textQuaternary = SwiftUI.Color(hex: 0x4D4D4D)

        // MARK: Accents — iOS system colors, same values used in web

        /// Primary action / links. Web: text-[#0A84FF] / bg-[#0A84FF]
        static let accentBlue = SwiftUI.Color(hex: 0x0A84FF)
        /// Success / confirmed / paid. Web: text-[#30D158]
        static let accentGreen = SwiftUI.Color(hex: 0x30D158)
        /// Warning / pending. Web: text-[#FF9F0A]
        static let accentOrange = SwiftUI.Color(hex: 0xFF9F0A)
        /// Destructive / error. Web: text-[#FF453A]
        static let accentRed = SwiftUI.Color(hex: 0xFF453A)
        /// AI / parse / magic. Web: text-[#BF5AF2]
        static let accentPurple = SwiftUI.Color(hex: 0xBF5AF2)
        static let accentPurpleDeep = SwiftUI.Color(hex: 0x9B3FD6)
        /// Highlight / greeting accent. Web: text-[#FFD16A]
        static let accentGold = SwiftUI.Color(hex: 0xFFD16A)
        /// Sky blue — upcoming trip status indicator. Web: text-[#4D96FF]
        static let signalSky  = SwiftUI.Color(hex: 0x4D96FF)

        // MARK: City palette — matches web CITY_COLORS array (types.ts)
        // 16 colores. Índices 0-7 son los originales — no reordenar para no romper ciudades existentes.

        static let cityPalette: [SwiftUI.Color] = [
            // — originales (índices 0-7) —
            SwiftUI.Color(hex: 0x71D3A6), // menta viaje
            SwiftUI.Color(hex: 0x74ACDF), // cielo
            SwiftUI.Color(hex: 0xFFD16A), // sol
            SwiftUI.Color(hex: 0xF29E7D), // coral cálido
            SwiftUI.Color(hex: 0xA891E8), // lavanda IA
            SwiftUI.Color(hex: 0xE98A9A), // rosa atardecer
            SwiftUI.Color(hex: 0x6BCB77), // verde fresco
            SwiftUI.Color(hex: 0x6CAFE8), // azul costa
            // — nuevos (índices 8-15) —
            SwiftUI.Color(hex: 0xFF6B6B), // coral rojo
            SwiftUI.Color(hex: 0x4ECDC4), // teal
            SwiftUI.Color(hex: 0xFFB347), // naranja durazno
            SwiftUI.Color(hex: 0x48DBFB), // celeste eléctrico
            SwiftUI.Color(hex: 0xA29BFE), // lavanda brillante
            SwiftUI.Color(hex: 0xFD79A8), // rosa chicle
            SwiftUI.Color(hex: 0x55EFC4), // menta neón
            SwiftUI.Color(hex: 0xFDCB6E), // dorado cálido
        ]

        static let cityBgOpacity: Double     = 0.14
        static let cityBorderOpacity: Double = 0.30

        enum Category {
            /// Flights. Web: bg-[#0A84FF]/15
            static let flight = SwiftUI.Color(hex: 0x0A84FF)
            /// Hotels. Web: bg-[#FF9F0A]/15
            static let hotel = SwiftUI.Color(hex: 0xFF9F0A)
            /// Transit. Web: bg-[#BF5AF2]/15
            static let transit = SwiftUI.Color(hex: 0xBF5AF2)
        }

        enum Status {
            static let active    = SwiftUI.Color(hex: 0x30D158)
            static let upcoming  = SwiftUI.Color(hex: 0x0A84FF)
            static let past      = SwiftUI.Color(hex: 0x707070)
            static let activeBg   = SwiftUI.Color(hex: 0x0D2818)
            static let upcomingBg = SwiftUI.Color(hex: 0x0D1A2A)
            static let pastBg     = SwiftUI.Color(hex: 0x1A1A1A)
        }
    }

    // MARK: - Spacing
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let base: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    // MARK: - Radius
    enum Radius {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 14
        static let lg: CGFloat = 20
        static let xl: CGFloat = 28
        static let pill: CGFloat = 999
    }

    // MARK: - Calendar layout
    enum Calendar {
        static let cellHeightMobile:      CGFloat = 92
        static let cellHeightDesktop:     CGFloat = 120
        static let cellRadius:            CGFloat = 10
        static let cellGapMobile:         CGFloat = 6
        static let cellGapDesktop:        CGFloat = 8
        static let cellBorderWidth:       CGFloat = 1
        static let cellActiveBorderWidth: CGFloat = 2
        static let maxBadgesVisible:      Int     = 3
    }

    // MARK: - Motion
    enum Motion {
        static let fast: Double = 0.18
        static let base: Double = 0.24
        static let slow: Double = 0.42
        static let springResponse: Double = 0.30
        static let springDamping:  Double = 0.72

        /// Atlas signature spring — slight overshoot, never bouncy.
        static let spring = Animation.spring(response: 0.42, dampingFraction: 0.82)
        /// Snappy spring — for taps and toggles.
        static let snap = Animation.spring(response: 0.26, dampingFraction: 0.76)
    }

    // MARK: - Shadow
    enum Shadow {
        static let color:  SwiftUI.Color = .black.opacity(0.4)
        static let radius: CGFloat = 24
        static let x:      CGFloat = 0
        static let y:      CGFloat = 8
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

extension SwiftUI.Color {
    init(hex: UInt32, opacity: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8)  & 0xFF) / 255
        let b = Double(hex         & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: opacity)
    }
}
