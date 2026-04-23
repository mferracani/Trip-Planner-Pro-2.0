import SwiftUI

// MARK: - CalendarView
//
// "Flight Plan Matrix" — a dense, editorial month calendar. Sticky month
// header, monospaced day numbers with leading zeros, city color bands that
// span the days a city is assigned, badges with mono times. The most
// information-rich surface in the app.

private struct SelectedDate: Identifiable {
    let date: Date
    var id: TimeInterval { date.timeIntervalSince1970 }
}

struct CalendarView: View {
    let vm: TripDetailViewModel
    @Environment(FirestoreClient.self) private var client
    @State private var selectedDate: SelectedDate?
    @State private var selectedCity: TripCity?

    private let weekdayLabels = ["L", "M", "M", "J", "V", "S", "D"]
    private let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.firstWeekday = 2
        c.locale = Locale(identifier: "es-AR")
        return c
    }()

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                tripMeta
                Hairline()
                weekdayRow
                Hairline()

                ForEach(Array(vm.weeks.enumerated()), id: \.offset) { weekIdx, week in
                    WeekRow(
                        week: week,
                        weekIndex: weekIdx,
                        vm: vm,
                        calendar: calendar,
                        onTap: { date in
                            let generator = UIImpactFeedbackGenerator(style: .soft)
                            generator.impactOccurred()
                            selectedDate = SelectedDate(date: date)
                        }
                    )
                    Hairline()
                }

                cityLegend
                    .padding(.top, 18)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 40)
            }
        }
        .background(Tokens.Color.bgPrimary)
        .scrollIndicators(.hidden)
        .sheet(item: $selectedDate) { wrapper in
            DayDetailSheet(date: wrapper.date, vm: vm)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
                .presentationBackground(Tokens.Color.bgPrimary)
        }
        .sheet(item: $selectedCity) { city in
            CityEditSheet(city: city, tripID: vm.trip.id ?? "", onClose: { selectedCity = nil })
                .environment(client)
                .presentationBackground(Tokens.Color.bgPrimary)
        }
    }

    // MARK: - Trip meta header (inside scroll, before the grid)

    private var tripMeta: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 6) {
                MonoLabel(text: monthSpan, color: Tokens.Color.textTertiary, size: .xs)
                Text(vm.trip.name)
                    .font(.system(size: 22, weight: .bold))
                    .tracking(Tokens.Track.headlineTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 2) {
                    Text("\(totalDays)")
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
                        .foregroundStyle(Tokens.Color.textPrimary)
                    Text("d")
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
                MonoLabel(text: cityCount, color: Tokens.Color.textTertiary, size: .xs)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
    }

    private var monthSpan: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        let fromM = DateFormatter()
        fromM.locale = Locale(identifier: "es-AR")
        fromM.setLocalizedDateFormatFromTemplate("MMMMyyyy")
        let s = fromM.string(from: vm.trip.startDate)
        let e = fromM.string(from: vm.trip.endDate)
        if s == e { return s }
        return "\(s) → \(e)"
    }

    private var totalDays: Int {
        (calendar.dateComponents([.day], from: vm.trip.startDate, to: vm.trip.endDate).day ?? 0) + 1
    }

    private var cityCount: String {
        let n = vm.cities.count
        if n == 0 { return "sin ciudades" }
        if n == 1 { return "1 ciudad" }
        return "\(n) ciudades"
    }

    // MARK: - Weekday row

    private var weekdayRow: some View {
        HStack(spacing: 0) {
            ForEach(Array(weekdayLabels.enumerated()), id: \.offset) { idx, letter in
                let isWeekend = idx >= 5
                VStack(spacing: 4) {
                    Text(letter)
                        .font(.system(size: 10, weight: .semibold, design: .monospaced))
                        .tracking(Tokens.Track.labelWidest)
                        .foregroundStyle(isWeekend ? Tokens.Color.textSecondary : Tokens.Color.textTertiary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)

                if idx < 6 {
                    Hairline(vertical: true)
                }
            }
        }
        .background(Tokens.Color.bgPrimary)
    }

    // MARK: - City legend

    private var cityLegend: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Ciudades del viaje")

            if vm.cities.isEmpty {
                HStack {
                    Text("Aún no agregaste ciudades a este viaje")
                        .font(Tokens.Typo.bodyS)
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Spacer()
                }
                .padding(.vertical, 14)
            } else {
                FlowLayout(spacing: 6) {
                    ForEach(vm.cities) { city in
                        let color = city.swiftColor
                        Button { selectedCity = city } label: {
                            HStack(spacing: 7) {
                                Circle().fill(color).frame(width: 6, height: 6)
                                Text(city.name)
                                    .font(Tokens.Typo.strongS)
                                    .foregroundStyle(Tokens.Color.textPrimary)
                                Text("\(cityDayCount(city))d")
                                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                    .foregroundStyle(Tokens.Color.textTertiary)
                                Image(systemName: "pencil")
                                    .font(.system(size: 8, weight: .semibold))
                                    .foregroundStyle(Tokens.Color.textTertiary.opacity(0.6))
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(
                                Capsule()
                                    .fill(color.opacity(0.14))
                                    .overlay(
                                        Capsule()
                                            .strokeBorder(color.opacity(0.35), lineWidth: 0.5)
                                    )
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func cityDayCount(_ city: TripCity) -> Int {
        city.days.count
    }
}

// MARK: - WeekRow

private struct WeekRow: View {
    let week: [Date?]
    let weekIndex: Int
    let vm: TripDetailViewModel
    let calendar: Calendar
    let onTap: (Date) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(week.enumerated()), id: \.offset) { idx, date in
                DayCell(
                    date: date,
                    isWeekend: idx >= 5,
                    vm: vm,
                    calendar: calendar,
                    onTap: onTap
                )
                if idx < 6 {
                    Hairline(vertical: true)
                }
            }
        }
        .frame(minHeight: 100)
    }
}

// MARK: - DayCell

private struct DayCell: View {
    let date: Date?
    let isWeekend: Bool
    let vm: TripDetailViewModel
    let calendar: Calendar
    let onTap: (Date) -> Void

    private var isToday: Bool {
        guard let date else { return false }
        return calendar.isDateInToday(date)
    }

    private var cityColor: Color? {
        guard let date else { return nil }
        return vm.cityColor(for: date)
    }

    private var flights: [Flight] {
        guard let date else { return [] }
        return vm.flights(on: date)
    }

    private var hotels: [Hotel] {
        guard let date else { return [] }
        return vm.hotels(on: date)
    }

    private var transports: [Transport] {
        guard let date else { return [] }
        return vm.transports(on: date)
    }

    private var expenses: [Expense] {
        guard let date else { return [] }
        // Skip expenses that are linked to flights/hotels/transports — those are
        // already shown via the dedicated subcollections (avoid double badges).
        return vm.expenses(on: date).filter { $0.linkedItemId == nil }
    }

    private var dayNumber: Int {
        guard let date else { return 0 }
        return calendar.component(.day, from: date)
    }

    var body: some View {
        Button {
            if let date { onTap(date) }
        } label: {
            ZStack {
                // Background fill (city color or weekend tint)
                backgroundFill

                // Content
                VStack(alignment: .leading, spacing: 4) {
                    // Top row: day number + today indicator
                    HStack(alignment: .firstTextBaseline, spacing: 0) {
                        if date != nil {
                            MonoNumber(
                                value: dayNumber,
                                size: 13,
                                color: isToday ? Tokens.Color.accentBlue : Tokens.Color.textPrimary,
                                padded: true
                            )
                        } else {
                            Color.clear.frame(width: 1, height: 13)
                        }
                        Spacer()
                        if isToday {
                            Circle()
                                .fill(Tokens.Color.accentBlue)
                                .frame(width: 5, height: 5)
                        }
                    }
                    .padding(.horizontal, 6)
                    .padding(.top, 6)

                    // Badges — flights, hotels, transports, then unlinked expenses.
                    VStack(alignment: .leading, spacing: 2) {
                        ForEach(flights.prefix(2), id: \.id) { flight in
                            ItemBadge(
                                icon: "✈",
                                text: flightBadgeText(flight),
                                color: Tokens.Color.Category.flight
                            )
                        }
                        ForEach(hotels.prefix(1), id: \.id) { hotel in
                            ItemBadge(
                                icon: "🏨",
                                text: hotelBadgeText(hotel),
                                color: Tokens.Color.Category.hotel
                            )
                        }
                        ForEach(transports.prefix(1), id: \.id) { transport in
                            ItemBadge(
                                icon: transportIcon(transport),
                                text: transportBadgeText(transport),
                                color: Tokens.Color.Category.transit
                            )
                        }
                        ForEach(prioritizedExpenses.prefix(2), id: \.id) { exp in
                            ItemBadge(
                                icon: exp.categoryKind.emoji,
                                text: shortName(exp.title),
                                color: exp.categoryKind.tint
                            )
                        }
                    }
                    .padding(.horizontal, 5)

                    Spacer(minLength: 0)

                    // Bottom: city tag
                    if let date, let city = vm.city(for: date), let color = cityColor {
                        Text(cityShort(city.name))
                            .font(.system(size: 8, weight: .bold, design: .monospaced))
                            .tracking(1.0)
                            .foregroundStyle(color)
                            .padding(.horizontal, 6)
                            .padding(.bottom, 5)
                    }
                }
            }
        }
        .buttonStyle(DayCellButtonStyle())
        .frame(maxWidth: .infinity)
        .frame(minHeight: 100)
        .opacity(date == nil ? 0.25 : 1)
        .disabled(date == nil)
    }

    @ViewBuilder
    private var backgroundFill: some View {
        if let color = cityColor {
            color.opacity(0.13)
        } else if isWeekend, date != nil {
            Tokens.Color.surface.opacity(0.4)
        } else {
            Tokens.Color.bgPrimary
        }
    }

    private var prioritizedExpenses: [Expense] {
        // Food/activity/shopping — items that aren't already shown as
        // flight/hotel/transport badges.
        let priority: [ExpenseCategory] = [
            .food, .meal, .restaurant,
            .activity, .tour, .ticket,
            .shopping, .other
        ]
        return expenses.sorted { a, b in
            let ia = priority.firstIndex(of: a.categoryKind) ?? Int.max
            let ib = priority.firstIndex(of: b.categoryKind) ?? Int.max
            return ia < ib
        }
    }

    private func flightBadgeText(_ flight: Flight) -> String {
        // Show destination IATA + departure time ("21:35 MAD").
        // On the arrival date we show the arrival time instead.
        guard let date else { return flight.destinationIATA }
        let key = Trip.isoDateFormatter.string(from: date)
        let time = key == flight.arrivalDate ? flight.arrivalTime : flight.departureTime
        return time.isEmpty ? flight.destinationIATA : "\(time) \(flight.destinationIATA)"
    }

    private func hotelBadgeText(_ hotel: Hotel) -> String {
        hotel.brand ?? shortName(hotel.name)
    }

    private func transportBadgeText(_ transport: Transport) -> String {
        let time = transport.departureTime
        return time.isEmpty ? shortName(transport.destination) : time
    }

    private func transportIcon(_ transport: Transport) -> String {
        switch transport.type.lowercased() {
        case "train":  return "🚆"
        case "bus":    return "🚌"
        case "ferry":  return "⛴"
        case "car":    return "🚗"
        case "taxi":   return "🚕"
        case "subway": return "🚇"
        default:       return "🚆"
        }
    }

    private func shortName(_ name: String) -> String {
        String(name.split(separator: " ").first ?? "").prefix(8).description
    }

    private func cityShort(_ name: String) -> String {
        name.prefix(3).description
    }
}

// MARK: - ItemBadge (calendar)

private struct ItemBadge: View {
    let icon: String
    let text: String
    let color: Color

    var body: some View {
        HStack(spacing: 2) {
            Text(icon).font(.system(size: 8))
            Text(text)
                .font(.system(size: 9, weight: .semibold, design: .monospaced))
                .tracking(-0.2)
                .lineLimit(1)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
        .background(
            RoundedRectangle(cornerRadius: 3)
                .fill(color.opacity(0.18))
        )
    }
}

// MARK: - DayCellButtonStyle

private struct DayCellButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

// MARK: - FlowLayout
//
// Simple wrap layout for the city legend chips.
private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        let result = layout(in: width, subviews: subviews)
        return CGSize(width: width, height: result.height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let width = bounds.width
        let result = layout(in: width, subviews: subviews)
        for (idx, subview) in subviews.enumerated() {
            let origin = result.positions[idx]
            subview.place(at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y), proposal: .unspecified)
        }
    }

    private func layout(in width: CGFloat, subviews: Subviews) -> (positions: [CGPoint], height: CGFloat) {
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return (positions, y + rowHeight)
    }
}

// MARK: - DayDetailSheet

struct DayDetailSheet: View {
    let date: Date
    let vm: TripDetailViewModel

    @State private var selected: SelectedItem?

    private var flights: [Flight] { vm.flights(on: date) }
    private var hotels: [Hotel] { vm.hotels(on: date) }
    private var transports: [Transport] { vm.transports(on: date) }
    private var expenses: [Expense] { vm.expenses(on: date).filter { $0.linkedItemId == nil } }
    private var city: TripCity? { vm.city(for: date) }

    private var expensesByCategory: [(ExpenseCategory, [Expense])] {
        let grouped = Dictionary(grouping: expenses) { $0.categoryKind }
        let priority: [ExpenseCategory] = [
            .food, .meal, .restaurant,
            .activity, .tour, .ticket,
            .shopping, .other
        ]
        return priority.compactMap { cat in
            guard let items = grouped[cat], !items.isEmpty else { return nil }
            return (cat, items)
        }
    }

    private var hasAnyItem: Bool {
        !flights.isEmpty || !hotels.isEmpty || !transports.isEmpty || !expenses.isEmpty
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Day number + weekday
                        HStack(alignment: .firstTextBaseline, spacing: 14) {
                            Text("\(Calendar.current.component(.day, from: date))")
                                .font(.system(size: 72, weight: .bold))
                                .tracking(Tokens.Track.displayTight)
                                .foregroundStyle(Tokens.Color.textPrimary)
                            VStack(alignment: .leading, spacing: 4) {
                                MonoLabel(text: weekdayLong, color: Tokens.Color.textSecondary, size: .s)
                                MonoLabel(text: monthYear, color: Tokens.Color.textTertiary, size: .xs)
                            }
                            Spacer()
                        }

                        if let city {
                            cityChip(city)
                        }

                        Hairline()

                        if !hasAnyItem {
                            emptyDayState
                        } else {
                            if !flights.isEmpty {
                                itemSection(title: "Vuelos") {
                                    ForEach(flights) { flight in
                                        Button { selected = .flight(flight) } label: {
                                            FlightCard(flight: flight, date: date)
                                        }
                                        .buttonStyle(RowButtonStyle())
                                    }
                                }
                            }
                            if !hotels.isEmpty {
                                itemSection(title: "Hoteles") {
                                    ForEach(hotels) { hotel in
                                        Button { selected = .hotel(hotel) } label: {
                                            HotelCard(hotel: hotel)
                                        }
                                        .buttonStyle(RowButtonStyle())
                                    }
                                }
                            }
                            if !transports.isEmpty {
                                itemSection(title: "Transportes") {
                                    ForEach(transports) { transport in
                                        Button { selected = .transport(transport) } label: {
                                            TransportCard(transport: transport)
                                        }
                                        .buttonStyle(RowButtonStyle())
                                    }
                                }
                            }
                            ForEach(expensesByCategory, id: \.0) { (category, items) in
                                itemSection(title: sectionTitle(for: category)) {
                                    ForEach(items) { expense in
                                        Button { selected = .expense(expense) } label: {
                                            ExpenseCard(expense: expense)
                                        }
                                        .buttonStyle(RowButtonStyle())
                                    }
                                }
                            }
                        }
                    }
                    .padding(20)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
        .editSheet(item: $selected, tripID: vm.trip.id ?? "")
        .preferredColorScheme(.dark)
    }

    private var weekdayLong: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.dateFormat = "EEEE"
        return f.string(from: date)
    }

    private var monthYear: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.setLocalizedDateFormatFromTemplate("MMMM yyyy")
        return f.string(from: date)
    }

    private func cityChip(_ city: TripCity) -> some View {
        let color = city.swiftColor
        return HStack(spacing: 8) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(city.name)
                .font(Tokens.Typo.strongM)
                .foregroundStyle(Tokens.Color.textPrimary)
            Spacer()
            if let country = city.countryCode ?? city.country {
                MonoLabel(text: country, color: color, size: .xs)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(color.opacity(0.14))
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .strokeBorder(color.opacity(0.3), lineWidth: 0.5)
                )
        )
    }

    private func sectionTitle(for category: ExpenseCategory) -> String {
        switch category {
        case .flight: return "Vuelos"
        case .hotel, .lodging: return "Hoteles"
        case .transit, .transport, .train, .bus, .taxi: return "Transportes"
        case .food, .meal, .restaurant: return "Comidas"
        case .activity, .tour, .ticket: return "Actividades"
        case .shopping: return "Compras"
        case .other: return "Otros"
        }
    }

    private func itemSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            MonoLabel(text: title, color: Tokens.Color.textSecondary, size: .s)
            content()
        }
    }

    private var emptyDayState: some View {
        VStack(spacing: 10) {
            Image(systemName: "calendar")
                .font(.system(size: 26, weight: .light))
                .foregroundStyle(Tokens.Color.textTertiary)
            Text("Sin actividad este día")
                .font(Tokens.Typo.bodyM)
                .foregroundStyle(Tokens.Color.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
    }
}

// MARK: - FlightCard

private struct FlightCard: View {
    let flight: Flight
    let date: Date

    private var isArrivalLeg: Bool {
        let key = Trip.isoDateFormatter.string(from: date)
        return key == flight.arrivalDate && flight.arrivalDate != flight.departureDate
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("\(flight.originIATA) → \(flight.destinationIATA)")
                    .font(.system(size: 20, weight: .bold, design: .monospaced))
                    .tracking(-0.4)
                    .foregroundStyle(Tokens.Color.textPrimary)
                Spacer()
                MonoLabel(
                    text: "\(flight.airline) \(flight.flightNumber)",
                    color: Tokens.Color.textSecondary,
                    size: .xs
                )
            }

            HStack(spacing: 24) {
                timeBlock(label: "Salida", time: flight.departureTime, active: !isArrivalLeg)
                Image(systemName: "arrow.right")
                    .font(.system(size: 12))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .padding(.top, 6)
                timeBlock(label: "Llegada", time: flight.arrivalTime, active: isArrivalLeg)
                Spacer()
                if let mins = flight.durationMinutes, mins > 0 {
                    VStack(alignment: .trailing, spacing: 3) {
                        Text(durationText(mins))
                            .font(.system(size: 14, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Tokens.Color.textPrimary)
                        MonoLabel(text: "Duración", color: Tokens.Color.textTertiary, size: .xs)
                    }
                }
            }

            if flight.seat != nil || flight.cabinClass != nil || flight.priceUSD != nil {
                Hairline()
                HStack(spacing: 20) {
                    if let seat = flight.seat, !seat.isEmpty {
                        metaBlock(label: "Asiento", value: seat)
                    }
                    if let cabin = flight.cabinClass, !cabin.isEmpty {
                        metaBlock(label: "Clase", value: cabin)
                    }
                    Spacer()
                    if let usd = flight.priceUSD, usd > 0 {
                        priceBlock(currency: flight.currency, price: flight.price, priceUSD: usd)
                    }
                }
            }

            if let ref = flight.bookingRef {
                BookingRefRow(ref: ref)
            }
        }
        .itemCard(color: Tokens.Color.Category.flight)
    }

    private func timeBlock(label: String, time: String, active: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(time)
                .font(.system(size: 22, weight: .bold, design: .monospaced))
                .foregroundStyle(active ? Tokens.Color.textPrimary : Tokens.Color.textSecondary)
            MonoLabel(text: label, color: Tokens.Color.textTertiary, size: .xs)
        }
    }

    private func durationText(_ mins: Int) -> String {
        let h = mins / 60
        let m = mins % 60
        return "\(h)h \(m)m"
    }
}

// MARK: - HotelCard

private struct HotelCard: View {
    let hotel: Hotel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(hotel.name)
                    .font(Tokens.Typo.strongL)
                    .tracking(Tokens.Track.bodyTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(2)
                Spacer()
                if hotel.nights > 0 {
                    MonoLabel(text: "\(hotel.nights) noches", color: Tokens.Color.textSecondary, size: .xs)
                }
            }

            HStack(spacing: 24) {
                dateBlock(label: "Check-in", iso: hotel.checkIn)
                Image(systemName: "arrow.right")
                    .font(.system(size: 12))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .padding(.top, 6)
                dateBlock(label: "Check-out", iso: hotel.checkOut)
                Spacer()
                if let usd = hotel.totalPriceUSD, usd > 0 {
                    priceBlock(currency: hotel.currency, price: hotel.totalPrice, priceUSD: usd)
                }
            }

            if let room = hotel.roomType, !room.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "bed.double")
                        .font(.system(size: 11))
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Text(room)
                        .font(Tokens.Typo.bodyS)
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
            }

            if let ref = hotel.bookingRef {
                BookingRefRow(ref: ref)
            }
        }
        .itemCard(color: Tokens.Color.Category.hotel)
    }

    private func dateBlock(label: String, iso: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(shortDate(iso))
                .font(.system(size: 18, weight: .bold, design: .monospaced))
                .foregroundStyle(Tokens.Color.textPrimary)
            MonoLabel(text: label, color: Tokens.Color.textTertiary, size: .xs)
        }
    }

    private func shortDate(_ iso: String) -> String {
        guard let d = Trip.isoDateFormatter.date(from: iso) else { return iso }
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.dateFormat = "dd MMM"
        return f.string(from: d)
    }
}

// MARK: - TransportCard

private struct TransportCard: View {
    let transport: Transport

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("\(transport.origin) → \(transport.destination)")
                    .font(.system(size: 16, weight: .bold))
                    .tracking(Tokens.Track.bodyTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(2)
                Spacer()
                MonoLabel(
                    text: transport.type,
                    color: Tokens.Color.Category.transit,
                    size: .xs
                )
            }

            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(transport.departureTime)
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
                        .foregroundStyle(Tokens.Color.textPrimary)
                    MonoLabel(text: "Salida", color: Tokens.Color.textTertiary, size: .xs)
                }
                if let arrTime = transport.arrivalTime {
                    Image(systemName: "arrow.right")
                        .font(.system(size: 12))
                        .foregroundStyle(Tokens.Color.textTertiary)
                        .padding(.top, 6)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(arrTime)
                            .font(.system(size: 22, weight: .bold, design: .monospaced))
                            .foregroundStyle(Tokens.Color.textPrimary)
                        MonoLabel(text: "Llegada", color: Tokens.Color.textTertiary, size: .xs)
                    }
                }
                Spacer()
                if let usd = transport.priceUSD, usd > 0 {
                    priceBlock(currency: transport.currency, price: transport.price, priceUSD: usd)
                }
            }

            if let op = transport.operator, !op.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "building.2")
                        .font(.system(size: 11))
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Text(op)
                        .font(Tokens.Typo.bodyS)
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
            }

            if let ref = transport.bookingRef {
                BookingRefRow(ref: ref)
            }
        }
        .itemCard(color: Tokens.Color.Category.transit)
    }
}

// MARK: - ExpenseCard

private struct ExpenseCard: View {
    let expense: Expense

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(expense.categoryKind.tint.opacity(0.18))
                Image(systemName: expense.categoryKind.systemImage)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(expense.categoryKind.tint)
            }
            .frame(width: 38, height: 38)

            VStack(alignment: .leading, spacing: 2) {
                Text(expense.title)
                    .font(Tokens.Typo.strongM)
                    .tracking(Tokens.Track.bodyTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                MonoLabel(text: expense.category, color: Tokens.Color.textTertiary, size: .xs)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 2) {
                Text("\(expense.currency) \(formatted(expense.amount))")
                    .font(.system(size: 14, weight: .semibold, design: .monospaced))
                    .tracking(-0.2)
                    .foregroundStyle(Tokens.Color.textPrimary)
                if let usd = expense.amountUSD, usd > 0 {
                    MonoLabel(
                        text: "$\(Int(usd.rounded())) USD",
                        color: Tokens.Color.textTertiary,
                        size: .xs
                    )
                }
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                )
        )
    }

    private func formatted(_ n: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: n)) ?? "\(Int(n))"
    }
}

// MARK: - Shared blocks

@ViewBuilder
private func metaBlock(label: String, value: String) -> some View {
    VStack(alignment: .leading, spacing: 3) {
        Text(value)
            .font(.system(size: 14, weight: .semibold, design: .monospaced))
            .foregroundStyle(Tokens.Color.textPrimary)
        MonoLabel(text: label, color: Tokens.Color.textTertiary, size: .xs)
    }
}

@ViewBuilder
private func priceBlock(currency: String?, price: Double?, priceUSD: Double) -> some View {
    VStack(alignment: .trailing, spacing: 3) {
        Text("$\(Int(priceUSD.rounded()))")
            .font(.system(size: 16, weight: .bold, design: .monospaced))
            .tracking(-0.2)
            .foregroundStyle(Tokens.Color.textPrimary)
        if let price, let currency, currency != "USD" {
            MonoLabel(
                text: "\(currency) \(Int(price.rounded()))",
                color: Tokens.Color.textTertiary,
                size: .xs
            )
        } else {
            MonoLabel(text: "USD", color: Tokens.Color.textTertiary, size: .xs)
        }
    }
}

private struct BookingRefRow: View {
    let ref: String
    @State private var copied = false

    var body: some View {
        Button {
            UIPasteboard.general.string = ref
            withAnimation { copied = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                withAnimation { copied = false }
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: copied ? "checkmark" : "doc.on.doc")
                    .font(.system(size: 10, weight: .semibold))
                Text(copied ? "Copiado" : ref)
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .tracking(0.3)
                    .lineLimit(1)
            }
            .foregroundStyle(copied ? Tokens.Color.accentGreen : Tokens.Color.textSecondary)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(Tokens.Color.elevated)
            )
        }
        .buttonStyle(.plain)
    }
}

private extension View {
    func itemCard(color: Color) -> some View {
        self
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(alignment: .leading) {
                        Rectangle()
                            .fill(color)
                            .frame(width: 3)
                    }
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
    }
}
