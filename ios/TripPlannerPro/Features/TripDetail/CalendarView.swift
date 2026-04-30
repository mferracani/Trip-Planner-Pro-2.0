import SwiftUI

// MARK: - CalendarView
//
// 7-column weekly grid (Mon → Sun), matching the web CalendarView.tsx exactly.
// Weeks are computed by finding the Monday of the trip's start date and
// building rows until the end date is covered.
// Cells outside the trip date range are rendered as dimmed/inactive placeholders.

private struct SelectedDate: Identifiable {
    let date: Date
    var id: TimeInterval { date.timeIntervalSince1970 }
}

// MARK: - PreferenceKey for cell frames

private struct CalendarCellFrameKey: PreferenceKey {
    nonisolated(unsafe) static var defaultValue: [String: CGRect] = [:]
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) {
        value.merge(nextValue()) { $1 }
    }
}

struct CalendarView: View {
    let vm: TripDetailViewModel
    /// Cities across all user trips — passed down from higher-level context for the catalog.
    var allUserCities: [TripCity] = []
    @Environment(FirestoreClient.self) private var client
    @State private var selectedDate: SelectedDate?
    @State private var selectedCity: TripCity?
    @State private var showCreateCity = false

    // MARK: - Range selection state
    @State private var rangeStart: String? = nil
    @State private var rangeCurrent: String? = nil
    @State private var isDragging = false
    @State private var showCityAssigner = false
    @State private var cellFrames: [String: CGRect] = [:]
    @State private var rangeAssignError: String? = nil

    // Mon-first calendar shared across helpers.
    private let cal: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.firstWeekday = 2          // 1 = Sun, 2 = Mon
        c.locale = Locale(identifier: "es-AR")
        return c
    }()

    private let weekdayHeaders = ["L", "M", "X", "J", "V", "S", "D"]

    // MARK: - Week computation
    //
    // Returns an array of weeks, each week being exactly 7 ISO date strings.
    // Strings outside the trip range are kept so the grid always has 7 columns;
    // they are rendered as empty/dimmed placeholders.
    private var weeks: [[String]] {
        let startStr = vm.trip.startDateString
        let endStr   = vm.trip.endDateString
        guard
            let startDay = Trip.isoDateFormatter.date(from: startStr),
            let endDay   = Trip.isoDateFormatter.date(from: endStr)
        else { return [] }

        // Walk back to the Monday of the start week.
        // weekday: 1=Sun, 2=Mon … 7=Sat. Convert to Mon=0 … Sun=6 for offset.
        let weekday = cal.component(.weekday, from: startDay)
        let offset = (weekday + 5) % 7
        let monday = cal.date(byAdding: .day, value: -offset, to: startDay)!

        var result: [[String]] = []
        var cursor = monday
        while cursor <= endDay {
            var week: [String] = []
            for _ in 0..<7 {
                week.append(Trip.isoDateFormatter.string(from: cursor))
                cursor = cal.date(byAdding: .day, value: 1, to: cursor)!
            }
            result.append(week)
        }
        return result
    }

    // MARK: - City map  date → [TripCity]
    private var dateCitiesMap: [String: [TripCity]] {
        var map: [String: [TripCity]] = [:]
        for city in vm.cities {
            for d in city.days {
                map[d, default: []].append(city)
            }
        }
        return map
    }

    // MARK: - Range selection helpers

    private var selectedRange: [String] {
        guard let start = rangeStart else { return [] }
        let end = rangeCurrent ?? start
        let flat = weeks.flatMap { $0 }
        guard let si = flat.firstIndex(of: start),
              let ei = flat.firstIndex(of: end) else { return [] }
        let lo = min(si, ei), hi = max(si, ei)
        return flat[lo...hi].filter {
            $0 >= vm.trip.startDateString && $0 <= vm.trip.endDateString
        }
    }

    private var rangeSelectionGesture: some Gesture {
        LongPressGesture(minimumDuration: 0.35)
            .sequenced(before: DragGesture(minimumDistance: 0, coordinateSpace: .named("calGrid")))
            .onChanged { value in
                switch value {
                case .second(true, let drag?):
                    if !isDragging {
                        if let date = cellFrames.first(where: { $0.value.contains(drag.startLocation) })?.key {
                            isDragging = true
                            rangeStart = date
                            rangeCurrent = date
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                        }
                    } else {
                        if let date = cellFrames.first(where: { $0.value.contains(drag.location) })?.key,
                           date != rangeCurrent {
                            rangeCurrent = date
                            UIImpactFeedbackGenerator(style: .soft).impactOccurred()
                        }
                    }
                default: break
                }
            }
            .onEnded { _ in
                if isDragging { showCityAssigner = true }
                isDragging = false
            }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Countdown banner for upcoming trips
                countdownBanner
                    .padding(.horizontal, 12)
                    .padding(.bottom, 8)

                // Weekday header row: L M X J V S D
                weekdayHeaderRow
                    .padding(.horizontal, 12)
                    .padding(.bottom, 6)

                // Range selection banner
                if isDragging {
                    HStack(spacing: 8) {
                        Image(systemName: "hand.point.up.left.fill")
                            .font(.system(size: 12, weight: .semibold))
                        Text(selectedRange.count == 1
                            ? "1 día — soltá para asignar ciudad"
                            : "\(selectedRange.count) días — soltá para asignar ciudad")
                            .font(Tokens.Typo.strongS)
                        Spacer()
                        Button("Cancelar") {
                            isDragging = false
                            rangeStart = nil
                            rangeCurrent = nil
                        }
                        .font(Tokens.Typo.strongS)
                    }
                    .foregroundStyle(Tokens.Color.accentBlue)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: Tokens.Radius.md)
                            .fill(Tokens.Color.accentBlue.opacity(0.1))
                            .overlay(
                                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                    .strokeBorder(Tokens.Color.accentBlue.opacity(0.3), lineWidth: 0.5)
                            )
                    )
                    .padding(.horizontal, 12)
                    .transition(.move(edge: .top).combined(with: .opacity))
                }

                // Weekly rows with gesture support
                VStack(spacing: Tokens.Calendar.cellGapMobile) {
                    ForEach(Array(weeks.enumerated()), id: \.offset) { _, week in
                        weekRow(week)
                    }
                }
                .padding(.horizontal, 12)
                .coordinateSpace(name: "calGrid")
                .onPreferenceChange(CalendarCellFrameKey.self) { frames in
                    Task { @MainActor in
                        cellFrames = frames
                    }
                }
                .gesture(rangeSelectionGesture)

                cityLegend
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 100)
            }
            .padding(.top, 18)
        }
        .background(Tokens.Color.bgPrimary)
        .scrollIndicators(.hidden)
        .scrollDisabled(isDragging)
        .animation(Tokens.Motion.snap, value: isDragging)
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
        .sheet(isPresented: $showCreateCity) {
            CreateCitySheet(
                tripID: vm.trip.id ?? "",
                existingCities: vm.cities,
                catalogCities: allUserCities,
                onClose: { showCreateCity = false }
            )
            .environment(client)
            .presentationBackground(Tokens.Color.bgPrimary)
        }
        .sheet(isPresented: $showCityAssigner, onDismiss: {
            rangeStart = nil
            rangeCurrent = nil
        }) {
            CityRangeAssignSheet(
                cities: vm.cities,
                rangeCount: selectedRange.count,
                onAssign: { city in
                    let dates = selectedRange
                    showCityAssigner = false
                    Task {
                        do {
                            if let city {
                                try await vm.assignCity(city, toDates: dates)
                            } else {
                                try await vm.removeCityFromDates(dates)
                            }
                        } catch {
                            rangeAssignError = "No se pudo actualizar."
                        }
                    }
                },
                onCancel: { showCityAssigner = false }
            )
            .presentationDetents([.medium])
            .presentationBackground(Tokens.Color.bgPrimary)
        }
        .alert("Error", isPresented: Binding(
            get: { rangeAssignError != nil },
            set: { if !$0 { rangeAssignError = nil } }
        )) {
            Button("OK") { rangeAssignError = nil }
        } message: {
            Text(rangeAssignError ?? "")
        }
    }

    // MARK: - Countdown banner

    @ViewBuilder
    private var countdownBanner: some View {
        let today = Trip.isoDateFormatter.string(from: Date())
        let start = vm.trip.startDateString
        if start > today {
            let d = daysBetween(from: today, to: start)
            if d > 0 {
                HStack(spacing: 8) {
                    Text("✈️")
                        .font(.system(size: 14))
                    Text(d == 1 ? "Mañana empieza el viaje" : "Faltan \(d) días para que empiece el viaje")
                        .font(Tokens.Typo.strongS)
                        .foregroundStyle(Tokens.Color.accentBlue)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Tokens.Color.accentBlue.opacity(0.07))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .strokeBorder(Tokens.Color.accentBlue.opacity(0.22), lineWidth: 1)
                        )
                )
            }
        }
    }

    // MARK: - Weekday header

    private var weekdayHeaderRow: some View {
        HStack(spacing: Tokens.Calendar.cellGapMobile) {
            ForEach(weekdayHeaders, id: \.self) { label in
                Text(label)
                    .font(.system(size: 10, weight: .bold))
                    .tracking(Tokens.Track.labelWider)
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Week row (exactly 7 cells)

    private func weekRow(_ week: [String]) -> some View {
        HStack(spacing: Tokens.Calendar.cellGapMobile) {
            ForEach(week, id: \.self) { dateStr in
                let inRange  = dateStr >= vm.trip.startDateString && dateStr <= vm.trip.endDateString
                let cities   = dateCitiesMap[dateStr] ?? []
                DayCell(
                    dateStr: dateStr,
                    inRange: inRange,
                    cities: cities,
                    vm: vm,
                    cal: cal,
                    isSelected: selectedRange.contains(dateStr),
                    onTap: {
                        if inRange {
                            guard let date = Trip.isoDateFormatter.date(from: dateStr) else { return }
                            let h = UIImpactFeedbackGenerator(style: .soft)
                            h.impactOccurred()
                            selectedDate = SelectedDate(date: date)
                        } else {
                            // Padding day: extend the trip to include this date
                            let h = UIImpactFeedbackGenerator(style: .medium)
                            h.impactOccurred()
                            Task {
                                try? await vm.extendTripDates(toInclude: dateStr)
                            }
                        }
                    }
                )
            }
        }
    }

    // MARK: - City legend

    private var cityLegend: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("CIUDADES DEL VIAJE")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .tracking(Tokens.Track.labelWider)
                    .foregroundStyle(Tokens.Color.textTertiary)
                Spacer()
                Button {
                    showCreateCity = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.system(size: 10, weight: .bold))
                        Text("Agregar")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(Tokens.Color.accentBlue)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(
                        Capsule()
                            .fill(Tokens.Color.accentBlue.opacity(0.12))
                            .overlay(Capsule().strokeBorder(Tokens.Color.accentBlue.opacity(0.25), lineWidth: 0.5))
                    )
                }
                .buttonStyle(.plain)
            }

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

    // MARK: - Helpers

    private func daysBetween(from a: String, to b: String) -> Int {
        guard
            let da = Trip.isoDateFormatter.date(from: a),
            let db = Trip.isoDateFormatter.date(from: b)
        else { return 0 }
        return Calendar.current.dateComponents([.day], from: da, to: db).day ?? 0
    }
}

// MARK: - DayCell

private struct DayCell: View {
    let dateStr: String
    let inRange: Bool
    let cities: [TripCity]
    let vm: TripDetailViewModel
    let cal: Calendar
    var isSelected: Bool = false
    let onTap: () -> Void

    private var primaryCity: TripCity? { cities.first }
    private var isSplit: Bool { cities.count >= 2 }

    private var dateLabel: String {
        let parts = dateStr.split(separator: "-")
        guard parts.count == 3 else { return dateStr }
        return "\(parts[2])/\(parts[1])"
    }

    private var isToday: Bool {
        Trip.isoDateFormatter.string(from: Date()) == dateStr
    }

    private var date: Date? {
        Trip.isoDateFormatter.date(from: dateStr)
    }

    // Flights, hotels, transports for this cell
    private var cellFlights: [(id: String, label: String)] {
        guard let d = date else { return [] }
        return vm.flights(on: d).prefix(2).map { f in
            // When the flight has legs, find which leg matches this calendar date
            if let legs = f.legs, !legs.isEmpty {
                if let leg = legs.first(where: {
                    String($0.departureLocalTime.prefix(10)) == dateStr ||
                    String($0.arrivalLocalTime.prefix(10)) == dateStr
                }) {
                    let legDepDate = String(leg.departureLocalTime.prefix(10))
                    let legArrDate = String(leg.arrivalLocalTime.prefix(10))
                    let isArr = legArrDate == dateStr && legDepDate != dateStr
                    let timeStr = isArr
                        ? String(leg.arrivalLocalTime.split(separator: "T").last?.prefix(5) ?? "")
                        : String(leg.departureLocalTime.split(separator: "T").last?.prefix(5) ?? "")
                    let dest = isArr ? leg.originIATA : leg.destinationIATA
                    let label = timeStr.isEmpty ? dest : timeStr
                    return (id: (f.id ?? "") + "_" + leg.direction + leg.departureLocalTime, label: label)
                }
            }
            // Fallback to root-level (single-leg or legacy document)
            let isArr = f.arrivalDate == dateStr && f.arrivalDate != f.departureDate
            let time = isArr ? f.arrivalTime : f.departureTime
            let dest = f.destinationIATA
            let label = time.isEmpty ? dest : (isArr ? "\(time) \(dest)" : time)
            return (id: (f.id ?? "") + (isArr ? "_arr" : ""), label: label)
        }
    }

    private var cellHotels: [(id: String, label: String)] {
        guard let d = date else { return [] }
        return vm.hotels(on: d).prefix(1).map { h in
            (id: h.id ?? "", label: h.brand ?? String(h.name.prefix(8)))
        }
    }

    private var cellTransports: [(id: String, label: String)] {
        guard let d = date else { return [] }
        return vm.transports(on: d).prefix(1).map { t in
            let time = t.departureTime
            return (id: t.id ?? "", label: time.isEmpty ? String(t.destination.prefix(6)) : time)
        }
    }

    // All badges combined (flights + transports + hotels), capped at 3
    private var allBadges: [(id: String, label: String, type: BadgeType)] {
        var badges: [(id: String, label: String, type: BadgeType)] = []
        badges += cellFlights.map    { (id: $0.id, label: $0.label, type: .flight) }
        badges += cellTransports.map { (id: $0.id, label: $0.label, type: .transport) }
        badges += cellHotels.map     { (id: $0.id, label: $0.label, type: .hotel) }
        return Array(badges.prefix(Tokens.Calendar.maxBadgesVisible))
    }

    private var overflowCount: Int {
        let total = cellFlights.count + cellTransports.count + cellHotels.count
        return max(0, total - Tokens.Calendar.maxBadgesVisible)
    }

    // City progress within the trip (dayIndex / totalDays)
    private var cityProgress: (current: Int, total: Int)? {
        guard let city = primaryCity, !isSplit else { return nil }
        let sorted = city.days.sorted()
        guard let idx = sorted.firstIndex(of: dateStr) else { return nil }
        return (current: idx + 1, total: sorted.count)
    }

    // MARK: - Background

    private var cellBackground: some View {
        Group {
            if isSplit, cities.count >= 2 {
                // Diagonal split: left half = city[0], right half = city[1]
                ZStack {
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    cities[0].swiftColor.opacity(0.35),
                                    cities[0].swiftColor.opacity(0.20)
                                ],
                                startPoint: .topLeading,
                                endPoint: .center
                            )
                        )
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    cities[1].swiftColor.opacity(0.20),
                                    cities[1].swiftColor.opacity(0.35)
                                ],
                                startPoint: .center,
                                endPoint: .bottomTrailing
                            )
                        )
                        .clipShape(
                            Triangle()
                        )
                }
            } else if let city = primaryCity {
                LinearGradient(
                    colors: [
                        city.swiftColor.opacity(0.42),
                        city.swiftColor.opacity(0.14)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            } else if inRange {
                Tokens.Color.elevated.opacity(0.45)
            } else {
                Color(hex: 0x141414)
            }
        }
    }

    // MARK: - Border color

    private var borderColor: Color {
        if isToday { return Tokens.Color.accentGold }
        if let city = primaryCity { return city.swiftColor.opacity(0.66) }
        if inRange { return Tokens.Color.borderSoft }
        return Color(hex: 0x222222)
    }

    private var borderWidth: CGFloat {
        isToday ? 2 : 1
    }

    // MARK: - Body

    var body: some View {
        Button(action: onTap) {
            cellContent
        }
        .buttonStyle(DayCardButtonStyle())
        .background(
            GeometryReader { geo in
                Color.clear.preference(
                    key: CalendarCellFrameKey.self,
                    value: [dateStr: geo.frame(in: .named("calGrid"))]
                )
            }
        )
    }

    private var cellContent: some View {
        ZStack(alignment: .topLeading) {
            // Background layer
            RoundedRectangle(cornerRadius: Tokens.Calendar.cellRadius)
                .fill(Color.clear)
                .overlay(
                    cellBackground
                        .clipShape(RoundedRectangle(cornerRadius: Tokens.Calendar.cellRadius))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Calendar.cellRadius)
                        .strokeBorder(borderColor, lineWidth: borderWidth)
                )

            // Range selection overlay
            if isSelected {
                RoundedRectangle(cornerRadius: Tokens.Calendar.cellRadius)
                    .fill(Tokens.Color.accentBlue.opacity(0.28))
                    .overlay(
                        RoundedRectangle(cornerRadius: Tokens.Calendar.cellRadius)
                            .strokeBorder(Tokens.Color.accentBlue, lineWidth: 2)
                    )
            }

            // Content
            if inRange {
                VStack(alignment: .leading, spacing: 0) {
                    // Row 1: date label + today indicator
                    HStack(alignment: .center) {
                        Text(dateLabel)
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundStyle(
                                isToday ? Tokens.Color.accentGold : Tokens.Color.textSecondary
                            )
                        Spacer(minLength: 2)
                        if isToday {
                            Circle()
                                .fill(Tokens.Color.accentGreen)
                                .frame(width: 5, height: 5)
                        }
                    }

                    // City block (flag + name)
                    if isSplit {
                        splitCityBlock
                            .padding(.top, 3)
                    } else if let city = primaryCity {
                        singleCityBlock(city)
                            .padding(.top, 3)
                    }

                    Spacer(minLength: 0)

                    // Badges at bottom
                    if !allBadges.isEmpty {
                        VStack(alignment: .leading, spacing: 2) {
                            ForEach(allBadges, id: \.id) { badge in
                                CalendarBadge(label: badge.label, type: badge.type)
                            }
                            if overflowCount > 0 {
                                Text("+\(overflowCount)")
                                    .font(.system(size: 8, weight: .semibold))
                                    .foregroundStyle(Tokens.Color.textQuaternary)
                            }
                        }
                    }
                }
                .padding(6)
            } else {
                // Padding day: show date + "+" hint
                VStack(alignment: .leading, spacing: 0) {
                    Text(dateLabel)
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundStyle(Color(hex: 0x555555))
                    Spacer()
                    HStack {
                        Spacer()
                        Image(systemName: "plus")
                            .font(.system(size: 14, weight: .light))
                            .foregroundStyle(Color(hex: 0x333333))
                        Spacer()
                    }
                    Spacer()
                }
                .padding(6)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: Tokens.Calendar.cellHeightMobile)
    }

    // MARK: - City blocks

    private var splitCityBlock: some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(cities.prefix(2)) { city in
                HStack(spacing: 3) {
                    if let flag = flagEmoji(for: city) {
                        Text(flag).font(.system(size: 8))
                    }
                    Text(String(city.name.prefix(3)).uppercased())
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(city.swiftColor)
                        .lineLimit(1)
                }
            }
        }
    }

    private func singleCityBlock(_ city: TripCity) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            if let flag = flagEmoji(for: city) {
                Text(flag).font(.system(size: 10))
            }
            Text(String(city.name.prefix(3)).uppercased())
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Tokens.Color.textPrimary)
                .lineLimit(1)
            if let progress = cityProgress {
                Text("\(progress.current)/\(progress.total)")
                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                    .foregroundStyle(city.swiftColor.opacity(0.7))
            }
        }
    }

    // MARK: - Flag emoji

    private func flagEmoji(for city: TripCity) -> String? {
        guard let cc = city.countryCode?.uppercased(), cc.count == 2 else { return nil }
        return cc.unicodeScalars.compactMap {
            UnicodeScalar(127_397 + Int($0.value))
        }.reduce("") { $0 + String($1) }
    }
}

// MARK: - Triangle (for split diagonal background)

private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}

// MARK: - CalendarBadge

private enum BadgeType {
    case flight, hotel, transport

    var icon: String {
        switch self {
        case .flight:    return "✈"
        case .hotel:     return "🏨"
        case .transport: return "🚌"
        }
    }

    var color: Color {
        switch self {
        case .flight:    return Color(hex: 0x60A5FA)
        case .hotel:     return Color(hex: 0xFBBF24)
        case .transport: return Color(hex: 0xD8B4FE)
        }
    }
}

private struct CalendarBadge: View {
    let label: String
    let type: BadgeType

    var body: some View {
        HStack(spacing: 2) {
            Text(type.icon)
                .font(.system(size: 8))
            Text(label)
                .font(.system(size: 8, weight: .medium, design: .monospaced))
                .lineLimit(1)
                .foregroundStyle(type.color)
        }
    }
}

// MARK: - DayCardButtonStyle

private struct DayCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(Tokens.Motion.snap, value: configuration.isPressed)
    }
}

// MARK: - FlowLayout (city legend pills)

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

// MARK: - DayDetailSheet (unchanged, kept in same file)

struct DayDetailSheet: View {
    let date: Date
    let vm: TripDetailViewModel

    @State private var selected: SelectedItem?
    @State private var showAddMenu = false

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
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showAddMenu = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .semibold))
                    }
                }
            }
        }
        .confirmationDialog("Agregar a este día", isPresented: $showAddMenu, titleVisibility: .visible) {
            Button("Vuelo") { selected = .flight(blankFlight) }
            Button("Hotel") { selected = .hotel(blankHotel) }
            Button("Transporte") { selected = .transport(blankTransport) }
            Button("Gasto") { selected = .expense(blankExpense) }
            Button("Cancelar", role: .cancel) { }
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

    private var dateISO: String {
        Trip.isoDateFormatter.string(from: date)
    }

    private var blankFlight: Flight {
        Flight(
            airline: "", flightNumber: "",
            originIATA: "", destinationIATA: "",
            departureLocalTime: "\(dateISO)T00:00",
            arrivalLocalTime: "\(dateISO)T00:00"
        )
    }

    private var blankHotel: Hotel {
        Hotel(name: "", checkIn: dateISO, checkOut: dateISO)
    }

    private var blankTransport: Transport {
        Transport(type: "train", origin: "", destination: "", departureLocalTime: "\(dateISO)T00:00")
    }

    private var blankExpense: Expense {
        Expense(title: "", amount: 0, currency: "USD", date: dateISO, category: "other")
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

    // MARK: - Leg resolution

    /// The leg (outbound or inbound) whose departure/arrival matches `date`.
    /// Returns nil when the flight has no legs (legacy single-leg document).
    private var activeLeg: FlightLeg? {
        guard let legs = flight.legs, !legs.isEmpty else { return nil }
        let key = Trip.isoDateFormatter.string(from: date)
        return legs.first {
            String($0.departureLocalTime.prefix(10)) == key ||
            String($0.arrivalLocalTime.prefix(10)) == key
        }
    }

    private var isArrivalLeg: Bool {
        let key = Trip.isoDateFormatter.string(from: date)
        if let leg = activeLeg {
            return String(leg.arrivalLocalTime.prefix(10)) == key &&
                   String(leg.departureLocalTime.prefix(10)) != key
        }
        return key == flight.arrivalDate && flight.arrivalDate != flight.departureDate
    }

    // MARK: - Display helpers (prefer activeLeg, fall back to root-level fields)

    private var displayOrigin: String { activeLeg?.originIATA ?? flight.originIATA }
    private var displayDest: String { activeLeg?.destinationIATA ?? flight.destinationIATA }
    private var displayDepTime: String {
        guard let leg = activeLeg else { return flight.departureTime }
        return leg.departureLocalTime.contains("T")
            ? String(leg.departureLocalTime.split(separator: "T").last?.prefix(5) ?? "")
            : ""
    }
    private var displayArrTime: String {
        guard let leg = activeLeg else { return flight.arrivalTime }
        return leg.arrivalLocalTime.contains("T")
            ? String(leg.arrivalLocalTime.split(separator: "T").last?.prefix(5) ?? "")
            : ""
    }
    private var displayDuration: Int? { activeLeg?.durationMinutes ?? flight.durationMinutes }
    private var displayAirline: String { activeLeg?.airline ?? flight.airline }
    private var displayFlightNumber: String { activeLeg?.flightNumber ?? flight.flightNumber }
    private var displaySeat: String? { activeLeg?.seat ?? flight.seat }
    private var displayCabinClass: String? { activeLeg?.cabinClass ?? flight.cabinClass }

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("\(displayOrigin) → \(displayDest)")
                    .font(.system(size: 20, weight: .bold, design: .monospaced))
                    .tracking(-0.4)
                    .foregroundStyle(Tokens.Color.textPrimary)
                Spacer()
                FlightStatusBadge(status: flight.currentStatus)
                MonoLabel(
                    text: "\(displayAirline) \(displayFlightNumber)",
                    color: Tokens.Color.textSecondary,
                    size: .xs
                )
            }

            HStack(spacing: 24) {
                timeBlock(label: "Salida", time: displayDepTime, active: !isArrivalLeg)
                Image(systemName: "arrow.right")
                    .font(.system(size: 12))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .padding(.top, 6)
                timeBlock(label: "Llegada", time: displayArrTime, active: isArrivalLeg)
                Spacer()
                if let mins = displayDuration, mins > 0 {
                    VStack(alignment: .trailing, spacing: 3) {
                        Text(durationText(mins))
                            .font(.system(size: 14, weight: .semibold, design: .monospaced))
                            .foregroundStyle(Tokens.Color.textPrimary)
                        MonoLabel(text: "Duración", color: Tokens.Color.textTertiary, size: .xs)
                    }
                }
            }

            if displaySeat != nil || displayCabinClass != nil || flight.priceUSD != nil {
                Hairline()
                HStack(spacing: 20) {
                    if let seat = displaySeat, !seat.isEmpty {
                        metaBlock(label: "Asiento", value: seat)
                    }
                    if let cabin = displayCabinClass, !cabin.isEmpty {
                        metaBlock(label: "Clase", value: cabin)
                    }
                    Spacer()
                    if let usd = flight.priceUSD, usd > 0 {
                        priceBlock(currency: flight.currency, price: flight.price, priceUSD: usd)
                    }
                }
            }

            // Gate and terminal info — populated by trackFlights Cloud Function
            let hasGateOrTerminal = flight.currentGateDeparture != nil
                || flight.currentGateArrival != nil
                || flight.currentTerminalDeparture != nil
                || flight.currentTerminalArrival != nil
            if hasGateOrTerminal {
                Hairline()
                HStack(spacing: 16) {
                    if let terminal = flight.currentTerminalDeparture, !terminal.isEmpty {
                        Label("Terminal \(terminal)", systemImage: "building.2")
                            .font(.system(size: 12))
                            .foregroundStyle(Color(hex: 0x81786A))
                    }
                    if let gate = flight.currentGateDeparture, !gate.isEmpty {
                        Label("Puerta \(gate)", systemImage: "door.right.hand.open")
                            .font(.system(size: 12))
                            .foregroundStyle(Color(hex: 0x81786A))
                    }
                    if let terminalArr = flight.currentTerminalArrival, !terminalArr.isEmpty {
                        Label("Term. llegada \(terminalArr)", systemImage: "building.2.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(Color(hex: 0x81786A))
                    }
                    if let gateArr = flight.currentGateArrival, !gateArr.isEmpty {
                        Label("Puerta arr. \(gateArr)", systemImage: "door.left.hand.open")
                            .font(.system(size: 12))
                            .foregroundStyle(Color(hex: 0x81786A))
                    }
                    Spacer(minLength: 0)
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

// MARK: - CityRangeAssignSheet

private struct CityRangeAssignSheet: View {
    let cities: [TripCity]
    let rangeCount: Int
    let onAssign: (TripCity?) -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()
                List {
                    Section {
                        Button {
                            onAssign(nil)
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 18))
                                    .foregroundStyle(Tokens.Color.textTertiary)
                                Text("Sin ciudad")
                                    .foregroundStyle(Tokens.Color.textSecondary)
                                    .font(Tokens.Typo.strongS)
                            }
                        }
                        .listRowBackground(Tokens.Color.surface)
                    }
                    if cities.isEmpty {
                        Section {
                            Text("Agregá una ciudad primero")
                                .font(Tokens.Typo.bodyS)
                                .foregroundStyle(Tokens.Color.textTertiary)
                                .listRowBackground(Tokens.Color.surface)
                        }
                    } else {
                        Section("Asignar a") {
                            ForEach(cities) { city in
                                Button {
                                    onAssign(city)
                                } label: {
                                    HStack(spacing: 12) {
                                        Circle()
                                            .fill(city.swiftColor)
                                            .frame(width: 10, height: 10)
                                        Text(city.name)
                                            .foregroundStyle(Tokens.Color.textPrimary)
                                            .font(Tokens.Typo.strongS)
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 12))
                                            .foregroundStyle(Tokens.Color.textTertiary)
                                    }
                                }
                                .listRowBackground(Tokens.Color.surface)
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle(
                rangeCount == 1 ? "1 día seleccionado" : "\(rangeCount) días seleccionados"
            )
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar", action: onCancel)
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
