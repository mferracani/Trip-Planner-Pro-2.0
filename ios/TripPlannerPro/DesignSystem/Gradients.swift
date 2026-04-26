import SwiftUI

extension Tokens {
    enum Gradient {
        // Hero card photo overlay (dark forest green tint)
        static let heroOverlay = LinearGradient(
            stops: [
                .init(color: SwiftUI.Color(hex: 0x1B3A2E, opacity: 0.88), location: 0.0),
                .init(color: SwiftUI.Color(hex: 0x0D1A14, opacity: 0.94), location: 1.0),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        // Stats card background
        static let statsCard = LinearGradient(
            stops: [
                .init(color: SwiftUI.Color(hex: 0x1A3A2E), location: 0.0),
                .init(color: SwiftUI.Color(hex: 0x1A1A22), location: 1.0),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        // AI sparkles button
        static let aiButton = LinearGradient(
            colors: [
                SwiftUI.Color(hex: 0xBF5AF2),
                SwiftUI.Color(hex: 0x9335D4),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )

        // Gold progress ring
        static let progressRing = AngularGradient(
            gradient: SwiftUI.Gradient(colors: [
                SwiftUI.Color(hex: 0xE8A500),
                SwiftUI.Color(hex: 0xFFCC44),
                SwiftUI.Color(hex: 0xE8A500),
            ]),
            center: .center,
            startAngle: .degrees(-90),
            endAngle: .degrees(270)
        )

        // Tab bar bottom fade
        static let tabBarFade = LinearGradient(
            colors: [SwiftUI.Color.clear, SwiftUI.Color(hex: 0x0D0D0D).opacity(0.95)],
            startPoint: .top,
            endPoint: .bottom
        )
    }
}
