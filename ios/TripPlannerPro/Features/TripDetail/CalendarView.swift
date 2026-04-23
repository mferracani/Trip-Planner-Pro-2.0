import SwiftUI

// MARK: - CalendarView
//
// 3-column grid of trip-days (not a month calendar). Each card shows the
// date, an optional country flag for the day's city, and a compact stack of
// item chips (flight / hotel / transport / expense). Tap → DayDetailSheet.

private struct SelectedDate: Identifiable {
    let date: Date
    var id: TimeInterval { date.timeIntervalSince1970 }
}

struct CalendarView: View {
    let vm: TripDetailViewModel
    @Environment(FirestoreClient.self) private var client
    @State private var selectedDate: SelectedDate?
    @State private var selectedCity: TripCity?

    private let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10),
    ]
    private let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.firstWeekday = 2
        c.locale = Locale(identifier: "es-AR")
        return c
    }()

    private var tripDays: [Date] {
        var result: [Date] = []
        var day = vm.trip.startDate
        while day <= vm.trip.endDate {
            result.append(day)
            guard let next = calendar.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
        }
        return result
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(tripDays, id: \.self) { day in
                        DayCard(date: day, vm: vm, calendar: calendar) {
                            let h = UIImpactFeedbackGenerator(style: .soft)
                            h.impactOccurred()
                            selectedDate = SelectedDate(date: day)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 18)

                cityLegend
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 100)
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

    // MARK: - City legend

    private var cityLegend: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("CIUDADES DEL VIAJE")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .tracking(Tokens.Track.labelWider)
                .foregroundStyle(Tokens.Color.textTertiary)

            if vm.cities.isEmpty {
                Text("Aún no agregaste ciudades a este viaje")
                    .font(Tokens.Typo.bodyS)
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .padding(.vertical, 10)
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(vm.cities) { city in
                        let color = city.swiftColor
                        Button { selectedCity = city } label: {
                            HStack(spacing: 8) {
                                Circle().fill(color).frame(width: 7, height: 7)
                                Text(city.name)
                                    .font(Tokens.Typo.strongS)
                                    .foregroundStyle(Tokens.Color.textPrimary)
                                Text("\(city.days.count)d")
                                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                                    .foregroundStyle(Tokens.Color.textTertiary)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 9)
                            .background(
                                Capsule()
                                    .fill(color.opacity(0.15))
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
}

// MARK: - DayCard

private struct DayCard: View {
    let date: Date
    let vm: TripDetailViewModel
    let calendar: Calendar
    let onTap: () -> Void

    @State private var pressed = false

    private var isToday: Bool { calendar.isDateInToday(date) }

    private var flights: [Flight] { vm.flights(on: date) }
    private var hotels: [Hotel] { vm.hotels(on: date) }
    private var transports: [Transport] { vm.transports(on: date) }
    private var expenses: [Expense] { vm.expenses(on: date).filter { $0.linkedItemId == nil } }
    private var city: TripCity? { vm.city(for: date) }

    private var hasAnyItem: Bool {
        !flights.isEmpty || !hotels.isEmpty || !transports.isEmpty || !expenses.isEmpty
    }

    private var isTravelDay: Bool {
        !flights.isEmpty || !transports.isEmpty
    }

    private var dateShort: String {
        let f = DateFormatter()
        f.dateFormat = "dd/MM"
        return f.string(from: date)
    }

    private var flagEmoji: String? {
        guard let cc = city?.countryCode?.uppercased(), cc.count == 2 else { return nil }
        return cc.unicodeScalars.compactMap {
            UnicodeScalar(127_397 + Int($0.value))
        }.reduce("") { $0 + String($1) }
    }

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                // Top: date + flag
                HStack(alignment: .center) {
                    Text(dateShort)
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                        .tracking(-0.2)
                        .foregroundStyle(
                            isToday ? Tokens.Color.accentBlue : Tokens.Color.textPrimary
                        )
                    Spacer(minLength: 2)
                    if let flag = flagEmoji {
                        Text(flag)
                            .font(.system(size: 14))
                    }
                }

                // Chips
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(flights.prefix(1), id: \.id) { flight in
                        DayItemChip(
                            icon: "airplane",
                            text: flightBadgeText(flight),
                            color: Tokens.Color.Category.flight,
                            isStrong: true
                        )
                    }
                    ForEach(hotels.prefix(1), id: \.id) { hotel in
                        DayItemChip(
                            icon: "bed.double.fill",
                            text: hotelBadgeText(hotel),
                            color: Tokens.Color.Category.hotel,
                            isStrong: true
                        )
                    }
                    ForEach(transports.prefix(1), id: \.id) { transport in
                        DayItemChip(
                            icon: transportIconName(transport),
                            text: transportBadgeText(transport),
                            color: Tokens.Color.Category.transit,
                            isStrong: true
                        )
                    }
                    ForEach(expenses.prefix(2), id: \.id) { exp in
                        DayItemChip(
                            icon: exp.categoryKind.systemImage,
                            text: shortName(exp.title),
                            color: exp.categoryKind.tint,
                            isStrong: false
                        )
                    }
                }

                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 110, alignment: .topLeading)
            .padding(10)
            .background(cardBackground)
            .overlay(cardBorder)
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .scaleEffect(pressed ? 0.96 : 1.0)
            .animation(Tokens.Motion.snap, value: pressed)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in pressed = true }
                .onEnded { _ in pressed = false }
        )
    }

    @ViewBuilder
    private var cardBackground: some View {
        if hasAnyItem {
            Tokens.Color.accentBlue.opacity(0.08)
        } else {
            Tokens.Color.elevated.opacity(0.45)
        }
    }

    @ViewBuilder
    private var cardBorder: some View {
        RoundedRectangle(cornerRadius: Tokens.Radius.md)
            .strokeBorder(
                isTravelDay
                    ? Tokens.Color.signalSky.opacity(0.55)
                    : (hasAnyItem ? Tokens.Color.accentBlue.opacity(0.3) : Tokens.Color.borderSoft),
                lineWidth: isTravelDay ? 1 : 0.5
            )
    }

    // MARK: Helpers

    private func flightBadgeText(_ flight: Flight) -> String {
        let time = flight.departureTime
        return time.isEmpty ? flight.destinationIATA : time
    }

    private func hotelBadgeText(_ hotel: Hotel) -> String {
        hotel.brand ?? shortName(hotel.name)
    }

    private func transportBadgeText(_ transport: Transport) -> String {
        let time = transport.departureTime
        return time.isEmpty ? shortName(transport.destination) : time
    }

    private func transportIconName(_ transport: Transport) -> String {
        switch transport.type.lowercased() {
        case "train", "subway": return "tram.fill"
        case "bus":             return "bus.fill"
        case "ferry":           return "ferry.fill"
        case "car", "taxi":     return "car.fill"
        default:                return "tram.fill"
        }
    }

    private func shortName(_ name: String) -> String {
        if name.count <= 9 { return name }
        return String(name.prefix(9))
    }
}

// MARK: - DayItemChip

private struct DayItemChip: View {
    let icon: String
    let text: String
    let color: Color
    let isStrong: Bool

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(color)
            Text(text)
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .tracking(-0.2)
                .lineLimit(1)
                .foregroundStyle(
                    isStrong ? Tokens.Color.textPrimary : Tokens.Color.textSecondary
                )
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 5)
                .fill(isStrong ? color.opacity(0.22) : Tokens.Color.elevated.opacity(0.55))
        )
    }
}

// MARK: - FlowLayout
//
// Wrap layout for the city legend pills.
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
