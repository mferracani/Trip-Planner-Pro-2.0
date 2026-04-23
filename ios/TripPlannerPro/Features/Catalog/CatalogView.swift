import SwiftUI

// MARK: - CatalogTab

private enum CatalogTab: String, CaseIterable {
    case flights = "Vuelos"
    case hotels = "Hoteles"
    case transports = "Traslados"

    var icon: String {
        switch self {
        case .flights: return "airplane"
        case .hotels: return "bed.double"
        case .transports: return "tram"
        }
    }

    var color: Color {
        switch self {
        case .flights: return Tokens.Color.Category.flight
        case .hotels: return Tokens.Color.Category.hotel
        case .transports: return Tokens.Color.Category.transit
        }
    }
}

// MARK: - CatalogView

struct CatalogView: View {
    @Environment(FirestoreClient.self) private var client
    @State private var loadState: LoadState = .loading
    @State private var activeTab: CatalogTab = .flights

    private enum LoadState {
        case loading
        case loaded(CatalogItems)
        case error(String)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                switch loadState {
                case .loading:
                    CatalogSkeletonView()
                case .error(let msg):
                    CatalogErrorView(message: msg)
                case .loaded(let items):
                    loadedContent(items)
                }
            }
            .navigationTitle("Catálogo")
            .navigationBarTitleDisplayMode(.large)
            .toolbarBackground(Tokens.Color.bgPrimary, for: .navigationBar)
        }
        .task {
            await loadItems()
        }
    }

    // MARK: - Loaded content

    private func loadedContent(_ items: CatalogItems) -> some View {
        VStack(spacing: 0) {
            tabSelector
            Divider().background(Tokens.Color.border)

            switch activeTab {
            case .flights:
                FlightsTab(entries: items.flights)
            case .hotels:
                HotelsTab(entries: items.hotels)
            case .transports:
                TransportsTab(entries: items.transports)
            }
        }
    }

    // MARK: - Tab selector

    private var tabSelector: some View {
        HStack(spacing: 0) {
            ForEach(CatalogTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: Tokens.Motion.fast)) {
                        activeTab = tab
                    }
                } label: {
                    HStack(spacing: Tokens.Spacing.xs) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 13))
                        Text(tab.rawValue)
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundStyle(activeTab == tab ? tab.color : Tokens.Color.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Tokens.Spacing.md)
                    .overlay(alignment: .bottom) {
                        if activeTab == tab {
                            Rectangle()
                                .fill(tab.color)
                                .frame(height: 2)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .background(Tokens.Color.surface)
    }

    // MARK: - Load

    private func loadItems() async {
        do {
            let stream = try client.allItemsStream()
            for try await items in stream {
                loadState = .loaded(items)
            }
        } catch {
            loadState = .error(error.localizedDescription)
        }
    }
}

// MARK: - FlightsTab

private struct FlightsTab: View {
    let entries: [(trip: Trip, flight: Flight)]
    @State private var search = ""

    private var filtered: [(trip: Trip, flight: Flight)] {
        guard !search.trimmingCharacters(in: .whitespaces).isEmpty else { return entries }
        let q = search.lowercased()
        return entries.filter { entry in
            let f = entry.flight
            return [f.airline, f.flightNumber, f.originIATA, f.destinationIATA, f.bookingRef, entry.trip.name]
                .compactMap { $0 }
                .contains { $0.lowercased().contains(q) }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            SearchBar(text: $search, placeholder: "Aerolínea, IATA, booking, viaje...")
                .padding(.horizontal, Tokens.Spacing.base)
                .padding(.vertical, Tokens.Spacing.sm)

            if filtered.isEmpty {
                EmptyCatalogState(tab: .flights, hasSearch: !search.isEmpty)
            } else {
                ScrollView {
                    LazyVStack(spacing: Tokens.Spacing.sm) {
                        ForEach(filtered, id: \.flight.id) { entry in
                            FlightCatalogCard(trip: entry.trip, flight: entry.flight)
                        }
                    }
                    .padding(.horizontal, Tokens.Spacing.base)
                    .padding(.vertical, Tokens.Spacing.sm)
                }
            }
        }
    }
}

// MARK: - HotelsTab

private struct HotelsTab: View {
    let entries: [(trip: Trip, hotel: Hotel)]
    @State private var search = ""

    private var filtered: [(trip: Trip, hotel: Hotel)] {
        guard !search.trimmingCharacters(in: .whitespaces).isEmpty else { return entries }
        let q = search.lowercased()
        return entries.filter { entry in
            let h = entry.hotel
            return [h.name, h.brand, h.roomType, h.bookingRef, entry.trip.name]
                .compactMap { $0 }
                .contains { $0.lowercased().contains(q) }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            SearchBar(text: $search, placeholder: "Hotel, ciudad, booking, viaje...")
                .padding(.horizontal, Tokens.Spacing.base)
                .padding(.vertical, Tokens.Spacing.sm)

            if filtered.isEmpty {
                EmptyCatalogState(tab: .hotels, hasSearch: !search.isEmpty)
            } else {
                ScrollView {
                    LazyVStack(spacing: Tokens.Spacing.sm) {
                        ForEach(filtered, id: \.hotel.id) { entry in
                            HotelCatalogCard(trip: entry.trip, hotel: entry.hotel)
                        }
                    }
                    .padding(.horizontal, Tokens.Spacing.base)
                    .padding(.vertical, Tokens.Spacing.sm)
                }
            }
        }
    }
}

// MARK: - TransportsTab

private struct TransportsTab: View {
    let entries: [(trip: Trip, transport: Transport)]
    @State private var search = ""
    @State private var typeFilter: String = "all"

    private let typeFilters: [(value: String, label: String, icon: String)] = [
        ("all", "Todos", "tram"),
        ("train", "Tren", "train.side.front.car"),
        ("bus", "Bus", "bus"),
        ("ferry", "Ferry", "ferry"),
        ("car", "Auto", "car"),
        ("other", "Otro", "questionmark.circle"),
    ]

    private var afterTypeFilter: [(trip: Trip, transport: Transport)] {
        guard typeFilter != "all" else { return entries }
        return entries.filter { $0.transport.type == typeFilter }
    }

    private var filtered: [(trip: Trip, transport: Transport)] {
        guard !search.trimmingCharacters(in: .whitespaces).isEmpty else { return afterTypeFilter }
        let q = search.lowercased()
        return afterTypeFilter.filter { entry in
            let t = entry.transport
            return [t.type, t.origin, t.destination, t.operator, t.bookingRef, entry.trip.name]
                .compactMap { $0 }
                .contains { $0.lowercased().contains(q) }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            SearchBar(text: $search, placeholder: "Tipo, descripción, booking, viaje...")
                .padding(.horizontal, Tokens.Spacing.base)
                .padding(.top, Tokens.Spacing.sm)

            // Type filter chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Tokens.Spacing.xs) {
                    ForEach(typeFilters, id: \.value) { filter in
                        let countForFilter = filter.value == "all"
                            ? entries.count
                            : entries.filter { $0.transport.type == filter.value }.count
                        if filter.value == "all" || countForFilter > 0 {
                            TransportFilterChip(
                                label: filter.label,
                                icon: filter.icon,
                                count: countForFilter,
                                isActive: typeFilter == filter.value
                            ) {
                                withAnimation(.easeInOut(duration: Tokens.Motion.fast)) {
                                    typeFilter = filter.value
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, Tokens.Spacing.base)
                .padding(.vertical, Tokens.Spacing.sm)
            }

            if filtered.isEmpty {
                EmptyCatalogState(tab: .transports, hasSearch: !search.isEmpty || typeFilter != "all")
            } else {
                ScrollView {
                    LazyVStack(spacing: Tokens.Spacing.sm) {
                        ForEach(filtered, id: \.transport.id) { entry in
                            TransportCatalogCard(trip: entry.trip, transport: entry.transport)
                        }
                    }
                    .padding(.horizontal, Tokens.Spacing.base)
                    .padding(.vertical, Tokens.Spacing.sm)
                }
            }
        }
    }
}

// MARK: - Cards

private struct FlightCatalogCard: View {
    let trip: Trip
    let flight: Flight

    var body: some View {
        HStack(alignment: .center, spacing: Tokens.Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(Tokens.Color.Category.flight.opacity(0.15))
                    .frame(width: 40, height: 40)
                Image(systemName: "airplane")
                    .font(.system(size: 16))
                    .foregroundStyle(Tokens.Color.Category.flight)
            }

            // Main content
            VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
                Text(trip.name)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .textCase(.uppercase)
                    .tracking(0.5)

                HStack(spacing: Tokens.Spacing.xs) {
                    Text("\(flight.originIATA) → \(flight.destinationIATA)")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textPrimary)
                    if !flight.airline.isEmpty || !flight.flightNumber.isEmpty {
                        Text("·")
                            .foregroundStyle(Tokens.Color.textTertiary)
                        Text("\(flight.airline) \(flight.flightNumber)")
                            .font(.system(size: 13))
                            .foregroundStyle(Tokens.Color.textSecondary)
                    }
                }

                HStack(spacing: Tokens.Spacing.xs) {
                    let depDate = formatLocalDate(flight.departureLocalTime)
                    let depTime = formatLocalTime(flight.departureLocalTime)
                    let arrTime = formatLocalTime(flight.arrivalLocalTime)

                    if !depDate.isEmpty {
                        Text(depDate)
                            .font(.system(size: 12))
                            .foregroundStyle(Tokens.Color.textTertiary)
                    }
                    if !depTime.isEmpty {
                        Text("·")
                            .foregroundStyle(Tokens.Color.textTertiary)
                        Text("\(depTime) → \(arrTime)")
                            .font(.system(size: 12))
                            .foregroundStyle(Tokens.Color.textTertiary)
                    }
                    if let ref = flight.bookingRef {
                        Text("·")
                            .foregroundStyle(Tokens.Color.textTertiary)
                        Text(ref)
                            .font(.system(size: 12).monospaced())
                            .foregroundStyle(Tokens.Color.accentPurple)
                    }
                }
            }

            Spacer(minLength: 0)

            // Price (right side)
            if let price = flight.price, let currency = flight.currency {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(currency)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Text(formatPrice(price))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Tokens.Color.accentGreen)
                }
            }
        }
        .padding(Tokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.surface)
        )
    }
}

private struct HotelCatalogCard: View {
    let trip: Trip
    let hotel: Hotel

    var body: some View {
        HStack(alignment: .center, spacing: Tokens.Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(Tokens.Color.Category.hotel.opacity(0.15))
                    .frame(width: 40, height: 40)
                Image(systemName: "bed.double")
                    .font(.system(size: 16))
                    .foregroundStyle(Tokens.Color.Category.hotel)
            }

            // Main content
            VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
                Text(trip.name)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .textCase(.uppercase)
                    .tracking(0.5)

                Text(hotel.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textPrimary)

                HStack(spacing: Tokens.Spacing.xs) {
                    let checkIn = formatISODate(hotel.checkIn)
                    let checkOut = formatISODate(hotel.checkOut)
                    let nights = nightsBetween(hotel.checkIn, hotel.checkOut)

                    Text("\(checkIn) → \(checkOut)")
                        .font(.system(size: 12))
                        .foregroundStyle(Tokens.Color.textTertiary)

                    Text("·")
                        .foregroundStyle(Tokens.Color.textTertiary)

                    Text("\(nights) \(nights == 1 ? "noche" : "noches")")
                        .font(.system(size: 12))
                        .foregroundStyle(Tokens.Color.textTertiary)

                    if let ref = hotel.bookingRef {
                        Text("·")
                            .foregroundStyle(Tokens.Color.textTertiary)
                        Text(ref)
                            .font(.system(size: 12).monospaced())
                            .foregroundStyle(Tokens.Color.accentPurple)
                    }
                }
            }

            Spacer(minLength: 0)

            if let price = hotel.totalPrice, let currency = hotel.currency {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(currency)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Text(formatPrice(price))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Tokens.Color.accentGreen)
                }
            }
        }
        .padding(Tokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.surface)
        )
    }
}

private struct TransportCatalogCard: View {
    let trip: Trip
    let transport: Transport

    private var typeIcon: String {
        switch transport.type {
        case "train": return "train.side.front.car"
        case "bus": return "bus"
        case "ferry": return "ferry"
        case "car": return "car"
        default: return "tram"
        }
    }

    private var typeLabel: String {
        switch transport.type {
        case "train": return "Tren"
        case "bus": return "Bus"
        case "ferry": return "Ferry"
        case "car": return "Auto"
        default: return "Otro"
        }
    }

    var body: some View {
        HStack(alignment: .center, spacing: Tokens.Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(Tokens.Color.Category.transit.opacity(0.15))
                    .frame(width: 40, height: 40)
                Image(systemName: typeIcon)
                    .font(.system(size: 16))
                    .foregroundStyle(Tokens.Color.Category.transit)
            }

            // Main content
            VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
                Text(trip.name)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .textCase(.uppercase)
                    .tracking(0.5)

                HStack(spacing: Tokens.Spacing.xs) {
                    Text(transport.destination)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textPrimary)
                    Text("·")
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Text(typeLabel)
                        .font(.system(size: 13))
                        .foregroundStyle(Tokens.Color.textSecondary)
                }

                HStack(spacing: Tokens.Spacing.xs) {
                    let depDate = formatLocalDate(transport.departureLocalTime)
                    let depTime = formatLocalTime(transport.departureLocalTime)

                    if !depDate.isEmpty {
                        Text(depDate)
                            .font(.system(size: 12))
                            .foregroundStyle(Tokens.Color.textTertiary)
                    }
                    if !depTime.isEmpty {
                        Text("·")
                            .foregroundStyle(Tokens.Color.textTertiary)
                        Text(depTime)
                            .font(.system(size: 12))
                            .foregroundStyle(Tokens.Color.textTertiary)
                    }
                    if let ref = transport.bookingRef {
                        Text("·")
                            .foregroundStyle(Tokens.Color.textTertiary)
                        Text(ref)
                            .font(.system(size: 12).monospaced())
                            .foregroundStyle(Tokens.Color.accentPurple)
                    }
                }
            }

            Spacer(minLength: 0)

            if let price = transport.price, let currency = transport.currency {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(currency)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Text(formatPrice(price))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Tokens.Color.accentGreen)
                }
            }
        }
        .padding(Tokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.surface)
        )
    }
}

// MARK: - Transport Filter Chip

private struct TransportFilterChip: View {
    let label: String
    let icon: String
    let count: Int
    let isActive: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                Text(label)
                    .font(.system(size: 12, weight: .semibold))
                Text("· \(count)")
                    .font(.system(size: 11))
                    .foregroundStyle(isActive ? Tokens.Color.accentPurple : Tokens.Color.textTertiary)
            }
            .foregroundStyle(isActive ? Tokens.Color.accentPurple : Tokens.Color.textTertiary)
            .padding(.horizontal, Tokens.Spacing.sm)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(isActive ? Tokens.Color.accentPurple.opacity(0.15) : Tokens.Color.elevated)
                    .overlay(
                        Capsule()
                            .stroke(
                                isActive ? Tokens.Color.accentPurple.opacity(0.35) : Tokens.Color.border,
                                lineWidth: 1
                            )
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Search Bar

private struct SearchBar: View {
    @Binding var text: String
    let placeholder: String

    var body: some View {
        HStack(spacing: Tokens.Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14))
                .foregroundStyle(Tokens.Color.textTertiary)

            TextField(placeholder, text: $text)
                .font(.system(size: 14))
                .foregroundStyle(Tokens.Color.textPrimary)
                .tint(Tokens.Color.accentPurple)

            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, Tokens.Spacing.md)
        .padding(.vertical, Tokens.Spacing.sm)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                .fill(Tokens.Color.elevated)
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                        .stroke(Tokens.Color.border, lineWidth: 1)
                )
        )
    }
}

// MARK: - Empty State

private struct EmptyCatalogState: View {
    let tab: CatalogTab
    let hasSearch: Bool

    var body: some View {
        VStack(spacing: Tokens.Spacing.md) {
            Spacer()
            Image(systemName: hasSearch ? "magnifyingglass" : tab.icon)
                .font(.system(size: 36))
                .foregroundStyle(Tokens.Color.textTertiary)
            Text(hasSearch ? "Sin resultados" : "No hay \(tab.rawValue.lowercased()) todavía")
                .font(.system(size: 15))
                .foregroundStyle(Tokens.Color.textSecondary)
            if hasSearch {
                Text("Probá con otro término de búsqueda")
                    .font(.system(size: 13))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Skeleton

private struct CatalogSkeletonView: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: Tokens.Spacing.sm) {
                ForEach(0..<8, id: \.self) { _ in
                    SkeletonCard()
                }
            }
            .padding(Tokens.Spacing.base)
        }
    }
}

private struct SkeletonCard: View {
    @State private var phase: CGFloat = 0

    var body: some View {
        HStack(spacing: Tokens.Spacing.md) {
            Circle()
                .fill(Tokens.Color.elevated)
                .frame(width: 40, height: 40)

            VStack(alignment: .leading, spacing: Tokens.Spacing.xs) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Tokens.Color.elevated)
                    .frame(width: 80, height: 10)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Tokens.Color.elevated)
                    .frame(width: 160, height: 14)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Tokens.Color.elevated)
                    .frame(width: 120, height: 10)
            }

            Spacer()
        }
        .padding(Tokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.surface)
        )
        .shimmer(phase: phase)
        .onAppear {
            withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                phase = 1
            }
        }
    }
}

// MARK: - Error View

private struct CatalogErrorView: View {
    let message: String

    var body: some View {
        VStack(spacing: Tokens.Spacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 36))
                .foregroundStyle(Tokens.Color.accentRed)
            Text("Error al cargar el catálogo")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Tokens.Color.textPrimary)
            Text(message)
                .font(.system(size: 13))
                .foregroundStyle(Tokens.Color.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Tokens.Spacing.xl)
        }
    }
}

// MARK: - View Modifier: Shimmer

private struct ShimmerModifier: ViewModifier {
    let phase: CGFloat

    func body(content: Content) -> some View {
        content.overlay(
            LinearGradient(
                gradient: Gradient(stops: [
                    .init(color: .clear, location: 0),
                    .init(color: Color.white.opacity(0.04), location: 0.4),
                    .init(color: Color.white.opacity(0.08), location: 0.5),
                    .init(color: Color.white.opacity(0.04), location: 0.6),
                    .init(color: .clear, location: 1),
                ]),
                startPoint: UnitPoint(x: phase - 0.6, y: 0),
                endPoint: UnitPoint(x: phase + 0.6, y: 0)
            )
            .allowsHitTesting(false)
        )
    }
}

private extension View {
    func shimmer(phase: CGFloat) -> some View {
        modifier(ShimmerModifier(phase: phase))
    }
}

// MARK: - Date helpers (file-private)

private func formatLocalDate(_ iso: String) -> String {
    let parts = iso.split(separator: "T")
    guard let datePart = parts.first else { return "" }
    let components = datePart.split(separator: "-")
    guard components.count == 3 else { return String(datePart) }
    return "\(components[2])/\(components[1])/\(String(components[0]).suffix(2))"
}

private func formatLocalTime(_ iso: String) -> String {
    let parts = iso.split(separator: "T")
    guard parts.count > 1 else { return "" }
    return String(parts[1].prefix(5))
}

private func formatISODate(_ iso: String) -> String {
    formatLocalDate(iso)
}

private func nightsBetween(_ checkIn: String, _ checkOut: String) -> Int {
    guard let a = Trip.isoDateFormatter.date(from: checkIn),
          let b = Trip.isoDateFormatter.date(from: checkOut) else { return 0 }
    return max(0, Calendar.current.dateComponents([.day], from: a, to: b).day ?? 0)
}

private func formatPrice(_ price: Double) -> String {
    if price == price.rounded() {
        return String(format: "%.0f", price)
    }
    return String(format: "%.2f", price)
}
