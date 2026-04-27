import SwiftUI

// MARK: - TripTheme
//
// Mirrors web/next/lib/themes.ts exactly.
// Each theme maps a coverUrl (SVG path) to gradient colors used as fallback
// when the SVG is not bundled or when rendering a tinted background.

struct TripTheme: Identifiable, Sendable {
    let id: String
    let label: String
    let emoji: String
    let coverUrl: String          // e.g. "/themes/beach.svg" — matches web path
    let gradientFrom: Color
    let gradientMid: Color
    let category: Category
    let groupId: String

    enum Category: String, Sendable {
        case nature
        case city
    }
}

// MARK: - RGBA color helper (file-private)

private func tc(_ r: Int, _ g: Int, _ b: Int, _ a: Double) -> Color {
    Color(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: a)
}

// MARK: - All themes (52 total, mirrors web TRIP_THEMES)

extension TripTheme {
    // swiftlint:disable line_length
    static let all: [TripTheme] = [
        // Nature — Beach
        .init(id: "beach",     label: "Playa",       emoji: "🏖️", coverUrl: "/themes/beach.svg",     gradientFrom: tc(230,150,20,0.80), gradientMid: tc(180,80,10,0.65),  category: .nature, groupId: "beach"),
        .init(id: "beach-2",   label: "Playa II",    emoji: "🏖️", coverUrl: "/themes/beach-2.svg",   gradientFrom: tc(0,150,210,0.80),  gradientMid: tc(0,90,150,0.65),   category: .nature, groupId: "beach"),
        .init(id: "beach-3",   label: "Playa III",   emoji: "🏖️", coverUrl: "/themes/beach-3.svg",   gradientFrom: tc(2,12,40,0.90),    gradientMid: tc(1,8,30,0.75),     category: .nature, groupId: "beach"),
        .init(id: "beach-4",   label: "Playa IV",    emoji: "🏖️", coverUrl: "/themes/beach-4.svg",   gradientFrom: tc(0,90,170,0.82),   gradientMid: tc(0,60,120,0.68),   category: .nature, groupId: "beach"),
        // Nature — Mountain
        .init(id: "mountain",   label: "Montaña",    emoji: "🏔️", coverUrl: "/themes/mountain.svg",   gradientFrom: tc(50,80,160,0.82),  gradientMid: tc(20,40,100,0.68),  category: .nature, groupId: "mountain"),
        .init(id: "mountain-2", label: "Montaña II", emoji: "🏔️", coverUrl: "/themes/mountain-2.svg", gradientFrom: tc(220,80,10,0.82),  gradientMid: tc(150,30,5,0.68),   category: .nature, groupId: "mountain"),
        .init(id: "mountain-3", label: "Montaña III",emoji: "🏔️", coverUrl: "/themes/mountain-3.svg", gradientFrom: tc(20,100,50,0.80),  gradientMid: tc(10,60,30,0.65),   category: .nature, groupId: "mountain"),
        .init(id: "mountain-4", label: "Montaña IV", emoji: "🏔️", coverUrl: "/themes/mountain-4.svg", gradientFrom: tc(180,30,5,0.88),   gradientMid: tc(80,10,2,0.75),    category: .nature, groupId: "mountain"),
        // Nature — Forest
        .init(id: "forest",   label: "Bosque",    emoji: "🌲", coverUrl: "/themes/forest.svg",   gradientFrom: tc(15,65,25,0.88),   gradientMid: tc(8,45,15,0.72),    category: .nature, groupId: "forest"),
        .init(id: "forest-2", label: "Bosque II", emoji: "🌲", coverUrl: "/themes/forest-2.svg", gradientFrom: tc(180,80,10,0.85),  gradientMid: tc(120,40,5,0.70),   category: .nature, groupId: "forest"),
        .init(id: "forest-3", label: "Bosque III",emoji: "🌲", coverUrl: "/themes/forest-3.svg", gradientFrom: tc(50,80,100,0.78),  gradientMid: tc(30,55,75,0.63),   category: .nature, groupId: "forest"),
        .init(id: "forest-4", label: "Bosque IV", emoji: "🌲", coverUrl: "/themes/forest-4.svg", gradientFrom: tc(10,80,30,0.88),   gradientMid: tc(5,50,18,0.73),    category: .nature, groupId: "forest"),
        // Nature — Ocean
        .init(id: "ocean",   label: "Mar",    emoji: "🌊", coverUrl: "/themes/ocean.svg",   gradientFrom: tc(8,75,150,0.85),   gradientMid: tc(4,45,100,0.70),   category: .nature, groupId: "ocean"),
        .init(id: "ocean-2", label: "Mar II", emoji: "🌊", coverUrl: "/themes/ocean-2.svg", gradientFrom: tc(0,100,190,0.82),  gradientMid: tc(0,60,130,0.68),   category: .nature, groupId: "ocean"),
        .init(id: "ocean-3", label: "Mar III",emoji: "🌊", coverUrl: "/themes/ocean-3.svg", gradientFrom: tc(160,40,8,0.82),   gradientMid: tc(100,20,5,0.68),   category: .nature, groupId: "ocean"),
        .init(id: "ocean-4", label: "Mar IV", emoji: "🌊", coverUrl: "/themes/ocean-4.svg", gradientFrom: tc(0,160,180,0.80),  gradientMid: tc(0,100,120,0.65),  category: .nature, groupId: "ocean"),
        // Nature — Desert
        .init(id: "desert",   label: "Desierto",    emoji: "🏜️", coverUrl: "/themes/desert.svg",   gradientFrom: tc(195,90,15,0.82),  gradientMid: tc(150,50,8,0.68),   category: .nature, groupId: "desert"),
        .init(id: "desert-2", label: "Desierto II", emoji: "🏜️", coverUrl: "/themes/desert-2.svg", gradientFrom: tc(200,130,20,0.82), gradientMid: tc(160,90,10,0.68),  category: .nature, groupId: "desert"),
        .init(id: "desert-3", label: "Desierto III",emoji: "🏜️", coverUrl: "/themes/desert-3.svg", gradientFrom: tc(140,30,8,0.85),   gradientMid: tc(90,15,4,0.70),    category: .nature, groupId: "desert"),
        .init(id: "desert-4", label: "Desierto IV", emoji: "🏜️", coverUrl: "/themes/desert-4.svg", gradientFrom: tc(4,8,28,0.92),     gradientMid: tc(2,5,18,0.78),     category: .nature, groupId: "desert"),
        // Nature — Cold
        .init(id: "cold",   label: "Nieve",    emoji: "❄️", coverUrl: "/themes/cold.svg",   gradientFrom: tc(70,150,220,0.78),  gradientMid: tc(30,90,160,0.63),  category: .nature, groupId: "cold"),
        .init(id: "cold-2", label: "Nieve II", emoji: "❄️", coverUrl: "/themes/cold-2.svg", gradientFrom: tc(120,150,180,0.80), gradientMid: tc(80,110,140,0.65), category: .nature, groupId: "cold"),
        .init(id: "cold-3", label: "Nieve III",emoji: "❄️", coverUrl: "/themes/cold-3.svg", gradientFrom: tc(60,20,80,0.80),    gradientMid: tc(40,10,55,0.65),   category: .nature, groupId: "cold"),
        .init(id: "cold-4", label: "Nieve IV", emoji: "❄️", coverUrl: "/themes/cold-4.svg", gradientFrom: tc(2,15,30,0.88),     gradientMid: tc(1,8,20,0.73),     category: .nature, groupId: "cold"),
        // City — City
        .init(id: "city",   label: "Ciudad",    emoji: "🏙️", coverUrl: "/themes/city.svg",   gradientFrom: tc(25,45,110,0.82),  gradientMid: tc(10,25,70,0.68),   category: .city, groupId: "city"),
        .init(id: "city-2", label: "Ciudad II", emoji: "🏙️", coverUrl: "/themes/city-2.svg", gradientFrom: tc(80,10,120,0.85),  gradientMid: tc(40,5,70,0.70),    category: .city, groupId: "city"),
        .init(id: "city-3", label: "Ciudad III",emoji: "🏙️", coverUrl: "/themes/city-3.svg", gradientFrom: tc(2,4,12,0.95),     gradientMid: tc(1,2,8,0.80),      category: .city, groupId: "city"),
        .init(id: "city-4", label: "Ciudad IV", emoji: "🏙️", coverUrl: "/themes/city-4.svg", gradientFrom: tc(10,25,90,0.85),   gradientMid: tc(5,15,60,0.70),    category: .city, groupId: "city"),
        // City — Paris
        .init(id: "paris",   label: "París",    emoji: "🗼", coverUrl: "/themes/paris.svg",   gradientFrom: tc(110,80,20,0.82),  gradientMid: tc(70,50,10,0.68),   category: .city, groupId: "paris"),
        .init(id: "paris-2", label: "París II", emoji: "🗼", coverUrl: "/themes/paris-2.svg", gradientFrom: tc(2,8,35,0.90),     gradientMid: tc(1,5,25,0.75),     category: .city, groupId: "paris"),
        .init(id: "paris-3", label: "París III",emoji: "🗼", coverUrl: "/themes/paris-3.svg", gradientFrom: tc(80,40,10,0.82),   gradientMid: tc(50,25,5,0.68),    category: .city, groupId: "paris"),
        .init(id: "paris-4", label: "París IV", emoji: "🗼", coverUrl: "/themes/paris-4.svg", gradientFrom: tc(90,45,8,0.85),    gradientMid: tc(50,20,4,0.70),    category: .city, groupId: "paris"),
        // City — London
        .init(id: "london",   label: "Londres",    emoji: "🎡", coverUrl: "/themes/london.svg",   gradientFrom: tc(140,15,15,0.78),  gradientMid: tc(90,8,8,0.63),     category: .city, groupId: "london"),
        .init(id: "london-2", label: "Londres II", emoji: "🎡", coverUrl: "/themes/london-2.svg", gradientFrom: tc(5,15,45,0.88),    gradientMid: tc(3,8,30,0.73),     category: .city, groupId: "london"),
        .init(id: "london-3", label: "Londres III",emoji: "🎡", coverUrl: "/themes/london-3.svg", gradientFrom: tc(12,22,48,0.85),   gradientMid: tc(8,15,35,0.70),    category: .city, groupId: "london"),
        .init(id: "london-4", label: "Londres IV", emoji: "🎡", coverUrl: "/themes/london-4.svg", gradientFrom: tc(20,30,40,0.85),   gradientMid: tc(12,20,28,0.70),   category: .city, groupId: "london"),
        // City — New York
        .init(id: "newyork",   label: "New York",    emoji: "🗽", coverUrl: "/themes/newyork.svg",   gradientFrom: tc(15,45,110,0.82),  gradientMid: tc(8,25,70,0.68),    category: .city, groupId: "newyork"),
        .init(id: "newyork-2", label: "New York II", emoji: "🗽", coverUrl: "/themes/newyork-2.svg", gradientFrom: tc(4,10,35,0.90),    gradientMid: tc(2,5,22,0.75),     category: .city, groupId: "newyork"),
        .init(id: "newyork-3", label: "New York III",emoji: "🗽", coverUrl: "/themes/newyork-3.svg", gradientFrom: tc(15,60,120,0.82),  gradientMid: tc(8,40,85,0.68),    category: .city, groupId: "newyork"),
        .init(id: "newyork-4", label: "New York IV", emoji: "🗽", coverUrl: "/themes/newyork-4.svg", gradientFrom: tc(2,4,12,0.92),     gradientMid: tc(1,2,8,0.78),      category: .city, groupId: "newyork"),
        // City — Tokyo
        .init(id: "tokyo",   label: "Tokyo",    emoji: "⛩️", coverUrl: "/themes/tokyo.svg",   gradientFrom: tc(160,15,35,0.78),  gradientMid: tc(100,8,20,0.63),   category: .city, groupId: "tokyo"),
        .init(id: "tokyo-2", label: "Tokyo II", emoji: "⛩️", coverUrl: "/themes/tokyo-2.svg", gradientFrom: tc(1,2,6,0.95),      gradientMid: tc(0,1,4,0.80),      category: .city, groupId: "tokyo"),
        .init(id: "tokyo-3", label: "Tokyo III",emoji: "⛩️", coverUrl: "/themes/tokyo-3.svg", gradientFrom: tc(140,40,10,0.85),  gradientMid: tc(80,15,5,0.70),    category: .city, groupId: "tokyo"),
        .init(id: "tokyo-4", label: "Tokyo IV", emoji: "⛩️", coverUrl: "/themes/tokyo-4.svg", gradientFrom: tc(2,4,8,0.92),      gradientMid: tc(1,2,5,0.78),      category: .city, groupId: "tokyo"),
        // City — Buenos Aires
        .init(id: "buenosaires",   label: "Bs. Aires",    emoji: "🫶", coverUrl: "/themes/buenosaires.svg",   gradientFrom: tc(20,70,170,0.82),  gradientMid: tc(10,45,120,0.68),  category: .city, groupId: "buenosaires"),
        .init(id: "buenosaires-2", label: "Bs. Aires II", emoji: "🫶", coverUrl: "/themes/buenosaires-2.svg", gradientFrom: tc(15,80,160,0.82),  gradientMid: tc(8,50,110,0.68),   category: .city, groupId: "buenosaires"),
        .init(id: "buenosaires-3", label: "Bs. Aires III",emoji: "🫶", coverUrl: "/themes/buenosaires-3.svg", gradientFrom: tc(15,80,168,0.85),  gradientMid: tc(8,50,115,0.70),   category: .city, groupId: "buenosaires"),
        .init(id: "buenosaires-4", label: "Bs. Aires IV", emoji: "🫶", coverUrl: "/themes/buenosaires-4.svg", gradientFrom: tc(8,20,80,0.85),    gradientMid: tc(4,12,55,0.70),    category: .city, groupId: "buenosaires"),
        // City — Rio de Janeiro
        .init(id: "rio",   label: "Rio",    emoji: "🌴", coverUrl: "/themes/rio.svg",   gradientFrom: tc(0,120,100,0.82),  gradientMid: tc(0,70,60,0.68),    category: .city, groupId: "rio"),
        .init(id: "rio-2", label: "Rio II", emoji: "🌴", coverUrl: "/themes/rio-2.svg", gradientFrom: tc(60,10,100,0.88),  gradientMid: tc(30,5,60,0.73),    category: .city, groupId: "rio"),
        .init(id: "rio-3", label: "Rio III",emoji: "🌴", coverUrl: "/themes/rio-3.svg", gradientFrom: tc(0,100,160,0.82),  gradientMid: tc(0,60,100,0.68),   category: .city, groupId: "rio"),
        .init(id: "rio-4", label: "Rio IV", emoji: "🌴", coverUrl: "/themes/rio-4.svg", gradientFrom: tc(80,5,50,0.88),    gradientMid: tc(40,2,25,0.73),    category: .city, groupId: "rio"),
    ]
    // swiftlint:enable line_length

    // MARK: - Lookup by coverUrl

    static func getTheme(coverUrl: String?) -> TripTheme? {
        guard let coverUrl else { return nil }
        return all.first { $0.coverUrl == coverUrl }
    }

    // MARK: - Gradient background view
    //
    // Returns a gradient that matches the theme's palette.
    // Used in hero cards and trip row cards.
    var gradientBackground: LinearGradient {
        LinearGradient(
            colors: [
                gradientFrom,
                gradientMid,
                Color(.sRGB, red: 13/255, green: 13/255, blue: 13/255, opacity: 0.98)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}
