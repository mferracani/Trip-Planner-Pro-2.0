import SwiftUI

struct CalendarView: View {
    let vm: TripDetailViewModel
    @State private var selectedDate: SelectedCalendarDate?

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)
    private let weekDays = ["L", "M", "X", "J", "V", "S", "D"]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 4, pinnedViews: [.sectionHeaders]) {
                Section {
                    ForEach(vm.weeks.indices, id: \.self) { weekIdx in
                        LazyVGrid(columns: columns, spacing: 4) {
                            ForEach(0..<7, id: \.self) { dayIdx in
                                if let date = vm.weeks[weekIdx][dayIdx] {
                                    DayCell(
                                        date: date,
                                        vm: vm,
                                        isSelected: selectedDate.map { Calendar.current.isDate($0.date, inSameDayAs: date) } ?? false
                                    )
                                    .onTapGesture { selectedDate = SelectedCalendarDate(date: date) }
                                } else {
                                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                        .fill(Tokens.Color.bgPrimary.opacity(0.35))
                                        .frame(minHeight: 98)
                                        .opacity(0.25)
                                }
                            }
                        }
                    }
                } header: {
                    weekDayHeader
                }
            }
        }
        .background(Tokens.Color.bgPrimary)
        .sheet(item: $selectedDate) { selected in
            DayDetailSheet(date: selected.date, vm: vm)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
    }

    private var weekDayHeader: some View {
        LazyVGrid(columns: columns, spacing: 2) {
            ForEach(weekDays, id: \.self) { day in
                Text(day)
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Tokens.Spacing.xs)
            }
        }
        .background(Tokens.Color.bgPrimary)
    }
}

private struct SelectedCalendarDate: Identifiable {
    let date: Date
    var id: Date { date }
}

// MARK: - DayCell

private struct DayCell: View {
    let date: Date
    let vm: TripDetailViewModel
    let isSelected: Bool

    private var cityColor: Color? { vm.cityColor(for: date) }
    private var flights: [Flight] { vm.flights(on: date) }
    private var hotels: [Hotel] { vm.hotels(on: date) }
    private var transports: [Transport] { vm.transports(on: date) }
    private var city: TripCity? { vm.city(for: date) }
    private var cityProgress: (current: Int, total: Int)? { vm.cityDayProgress(for: date) }
    private var isToday: Bool { Calendar.current.isDateInToday(date) }
    private var dateLabel: String {
        let day = Calendar.current.component(.day, from: date)
        let month = Calendar.current.component(.month, from: date)
        return "\(day)/\(month)"
    }
    private var visibleItemCount: Int { min(totalItemCount, 2) }
    private var totalItemCount: Int { flights.count + hotels.count + transports.count }
    private var overflowCount: Int { max(totalItemCount - visibleItemCount, 0) }

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .top, spacing: 2) {
                Text(dateLabel)
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .foregroundStyle(isToday ? Tokens.Color.accentBlue : Tokens.Color.textPrimary)
                    .lineLimit(1)

                Spacer(minLength: 0)

                if let city, !city.countryCode.isEmpty {
                    Text(Tokens.Country.flag(city.countryCode))
                        .font(.system(size: 10))
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                ForEach(flights.prefix(1)) { flight in
                    ItemBadge(icon: "✈", text: timeString(flight.departureLocal), color: Tokens.Color.Category.flight)
                }
                if flights.count < 2 {
                    ForEach(hotels.prefix(1)) { hotel in
                        ItemBadge(icon: "🏨", text: shortName(hotel.name), color: Tokens.Color.Category.hotel)
                    }
                }
                if flights.isEmpty && hotels.isEmpty {
                    ForEach(transports.prefix(1)) { t in
                        ItemBadge(icon: "🚆", text: timeString(t.departureLocal), color: Tokens.Color.Category.transit)
                    }
                }
                if overflowCount > 0 {
                    ItemBadge(icon: "+", text: "\(overflowCount)", color: Tokens.Color.textSecondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Spacer(minLength: 0)

            if let city {
                VStack(alignment: .leading, spacing: 2) {
                    Text(city.name)
                        .font(.system(size: 8, weight: .black, design: .rounded))
                        .foregroundStyle(cityColor ?? Tokens.Color.textSecondary)
                        .textCase(.uppercase)
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)

                    if let cityProgress {
                        Text("\(cityProgress.current)/\(cityProgress.total)")
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .foregroundStyle(cityColor ?? Tokens.Color.textSecondary)
                    }
                }
            }
        }
        .padding(5)
        .frame(minHeight: 98)
        .background(cellBackground)
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .stroke(isSelected ? Tokens.Color.travelMint : (cityColor?.opacity(0.42) ?? Tokens.Color.borderSoft), lineWidth: isSelected ? 2 : 1)
        )
        .overlay(alignment: .bottom) {
            if !hotels.isEmpty {
                Rectangle()
                    .fill(Tokens.Color.Category.hotel)
                    .frame(height: 2)
                    .opacity(0.9)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
    }

    @ViewBuilder
    private var cellBackground: some View {
        if let color = cityColor {
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(color.opacity(0.16))
        } else {
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.surface)
        }
    }

    private func timeString(_ localISO: String) -> String {
        let parts = localISO.split(separator: "T")
        if parts.count == 2 {
            return String(parts[1].prefix(5))
        }
        return ""
    }

    private func shortName(_ name: String) -> String {
        let words = name.split(separator: " ")
        return words.prefix(2).map(String.init).joined(separator: " ")
    }
}

// MARK: - ItemBadge

private struct ItemBadge: View {
    let icon: String
    let text: String
    let color: Color

    var body: some View {
        HStack(spacing: 2) {
            Text(icon).font(.system(size: 8, weight: .bold))
            Text(text)
                .font(.system(size: 8, weight: .bold, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 3)
        .padding(.vertical, 1)
        .background(RoundedRectangle(cornerRadius: 4).fill(color.opacity(0.18)))
    }
}

// MARK: - DayDetailSheet

struct DayDetailSheet: View {
    let date: Date
    let vm: TripDetailViewModel

    private var flights: [Flight] { vm.flights(on: date) }
    private var hotels: [Hotel] { vm.hotels(on: date) }
    private var transports: [Transport] { vm.transports(on: date) }
    private var city: TripCity? { vm.city(for: date) }

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                ScrollView {
                    LazyVStack(alignment: .leading, spacing: Tokens.Spacing.md) {
                        if let city {
                            cityChip(city)
                        }

                        if flights.isEmpty && hotels.isEmpty && transports.isEmpty {
                            emptyDayState
                        }

                        if !flights.isEmpty {
                            itemSection(title: "Vuelos") {
                                ForEach(flights) { FlightCard(flight: $0) }
                            }
                        }
                        if !hotels.isEmpty {
                            itemSection(title: "Hoteles") {
                                ForEach(hotels) { HotelCard(hotel: $0) }
                            }
                        }
                        if !transports.isEmpty {
                            itemSection(title: "Transportes") {
                                ForEach(transports) { TransportCard(transport: $0) }
                            }
                        }
                    }
                    .padding(Tokens.Spacing.base)
                }
            }
            .navigationTitle(formattedDate)
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
    }

    private var formattedDate: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.setLocalizedDateFormatFromTemplate("EEEEdMMMM")
        return f.string(from: date).capitalized
    }

    private func cityChip(_ city: TripCity) -> some View {
        let color = Tokens.Color.cityPalette[city.colorIndex % Tokens.Color.cityPalette.count]
        return HStack(spacing: Tokens.Spacing.xs) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(city.name)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(color)
        }
        .padding(.horizontal, Tokens.Spacing.sm)
        .padding(.vertical, Tokens.Spacing.xs)
        .background(RoundedRectangle(cornerRadius: Tokens.Radius.pill).fill(color.opacity(0.15)))
    }

    private func itemSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Tokens.Color.textTertiary)
                .kerning(0.8)
            content()
        }
    }

    private var emptyDayState: some View {
        HStack {
            Spacer()
            VStack(spacing: Tokens.Spacing.sm) {
                Image(systemName: "sparkles")
                    .font(.system(size: 24))
                    .foregroundStyle(Tokens.Color.accentPurple)
                Text("Sin actividad este día")
                    .font(.system(size: 14))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
            .padding(.vertical, Tokens.Spacing.xl)
            Spacer()
        }
    }
}

// MARK: - Item Cards

private struct FlightCard: View {
    let flight: Flight

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
            HStack {
                Text("\(flight.originIATA) → \(flight.destIATA)")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textPrimary)
                Spacer()
                Text("\(flight.airline) \(flight.flightNumber)")
                    .font(.system(size: 12))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }

            HStack(spacing: Tokens.Spacing.md) {
                Label(timeFrom(flight.departureLocal), systemImage: "airplane.departure")
                Label(timeFrom(flight.arrivalLocal), systemImage: "airplane.arrival")
            }
            .font(.system(size: 13))
            .foregroundStyle(Tokens.Color.textSecondary)

            if let ref = flight.bookingRef {
                BookingRefRow(ref: ref)
            }
        }
        .itemCard(color: Tokens.Color.Category.flight)
    }

    private func timeFrom(_ iso: String) -> String {
        iso.split(separator: "T").last.map(String.init)?.prefix(5).description ?? ""
    }
}

private struct HotelCard: View {
    let hotel: Hotel

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
            Text(hotel.name)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Tokens.Color.textPrimary)

            HStack(spacing: Tokens.Spacing.md) {
                Label("Check-in \(timeFrom(hotel.checkInLocal))", systemImage: "arrow.right.square")
                Label("Check-out \(timeFrom(hotel.checkOutLocal))", systemImage: "arrow.left.square")
            }
            .font(.system(size: 13))
            .foregroundStyle(Tokens.Color.textSecondary)

            if let ref = hotel.bookingRef {
                BookingRefRow(ref: ref)
            }
        }
        .itemCard(color: Tokens.Color.Category.hotel)
    }

    private func timeFrom(_ iso: String) -> String {
        iso.split(separator: "T").last.map(String.init)?.prefix(5).description ?? ""
    }
}

private struct TransportCard: View {
    let transport: Transport

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
            HStack {
                Text(transport.description)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textPrimary)
                Spacer()
                Text(transport.type.capitalized)
                    .font(.system(size: 12))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
            Label(timeFrom(transport.departureLocal), systemImage: "clock")
                .font(.system(size: 13))
                .foregroundStyle(Tokens.Color.textSecondary)

            if let ref = transport.bookingRef {
                BookingRefRow(ref: ref)
            }
        }
        .itemCard(color: Tokens.Color.Category.transit)
    }

    private func timeFrom(_ iso: String) -> String {
        iso.split(separator: "T").last.map(String.init)?.prefix(5).description ?? ""
    }
}

// Booking ref copiable
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
            HStack(spacing: Tokens.Spacing.xs) {
                Image(systemName: copied ? "checkmark" : "doc.on.doc")
                    .font(.system(size: 11))
                Text(copied ? "Copiado" : ref)
                    .font(.system(size: 12, weight: .medium))
                    .lineLimit(1)
            }
            .foregroundStyle(copied ? Tokens.Color.accentGreen : Tokens.Color.textSecondary)
        }
    }
}

// MARK: - View modifier helper

private extension View {
    func itemCard(color: Color) -> some View {
        self
            .padding(Tokens.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .fill(Tokens.Color.surface)
                    .overlay(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(color)
                            .frame(width: 3)
                    }
            )
    }
}
