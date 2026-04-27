import SwiftUI

// MARK: - ListView — Timeline day by day

struct ListView: View {
    let vm: TripDetailViewModel
    @State private var selected: SelectedItem?

    private let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.firstWeekday = 2
        c.locale = Locale(identifier: "es-AR")
        return c
    }()

    private var tripDays: [Date] {
        var days: [Date] = []
        var cursor = calendar.startOfDay(for: vm.trip.startDate)
        let end = calendar.startOfDay(for: vm.trip.endDate)
        while cursor <= end {
            days.append(cursor)
            cursor = calendar.date(byAdding: .day, value: 1, to: cursor)!
        }
        return days
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 24) {
                ForEach(tripDays, id: \.self) { day in
                    DayBlock(date: day, vm: vm, calendar: calendar) { item in
                        selected = item
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 20)
            .padding(.bottom, 80)
        }
        .background(Tokens.Color.bgPrimary)
        .scrollIndicators(.hidden)
        .editSheet(item: $selected, tripID: vm.trip.id ?? "")
    }
}

private struct DayBlock: View {
    let date: Date
    let vm: TripDetailViewModel
    let calendar: Calendar
    let onSelect: (SelectedItem) -> Void

    private var city: TripCity? { vm.city(for: date) }
    private var flights: [Flight] { vm.flights(on: date) }
    private var hotels: [Hotel] { vm.hotels(on: date) }
    private var transports: [Transport] { vm.transports(on: date) }
    private var expenses: [Expense] { vm.expenses(on: date).filter { $0.linkedItemId == nil } }

    private func flagEmoji(for city: TripCity) -> String? {
        guard let cc = city.countryCode?.uppercased(), cc.count == 2 else { return nil }
        return cc.unicodeScalars.compactMap {
            UnicodeScalar(127_397 + Int($0.value))
        }.reduce("") { $0 + String($1) }
    }

    private var hasAnything: Bool {
        !flights.isEmpty || !hotels.isEmpty || !transports.isEmpty || !expenses.isEmpty
    }

    private var dayNumber: Int { calendar.component(.day, from: date) }
    private var weekdayShort: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.dateFormat = "EEE"
        return f.string(from: date).uppercased().replacingOccurrences(of: ".", with: "")
    }

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(spacing: 3) {
                MonoNumber(value: dayNumber, size: 22, color: Tokens.Color.textPrimary, padded: true)
                Text(weekdayShort)
                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                    .tracking(Tokens.Track.labelWidest)
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
            .frame(width: 44)
            .padding(.top, 2)

            VStack(alignment: .leading, spacing: 10) {
                // City chip + hairline connector
                HStack(spacing: 8) {
                    if let city {
                        HStack(spacing: 7) {
                            if let flag = flagEmoji(for: city) {
                                Text(flag).font(.system(size: 10))
                            } else {
                                Circle().fill(city.swiftColor).frame(width: 6, height: 6)
                            }
                            Text(city.name)
                                .font(Tokens.Typo.strongS)
                                .foregroundStyle(city.swiftColor)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(
                            Capsule()
                                .fill(city.swiftColor.opacity(0.12))
                                .overlay(
                                    Capsule()
                                        .strokeBorder(city.swiftColor.opacity(0.3), lineWidth: 0.5)
                                )
                        )
                    } else {
                        MonoLabel(text: "Sin ciudad", color: Tokens.Color.textTertiary, size: .xs)
                    }
                    Rectangle()
                        .fill(Tokens.Color.borderSoft)
                        .frame(height: 0.5)
                        .padding(.leading, 4)
                }

                if !hasAnything {
                    Text("Sin eventos este día")
                        .font(Tokens.Typo.bodyS)
                        .foregroundStyle(Tokens.Color.textTertiary)
                        .padding(.vertical, 6)
                } else {
                    VStack(spacing: 8) {
                        ForEach(flights) { flight in
                            Button { onSelect(.flight(flight)) } label: {
                                FlightRow(flight: flight, date: date)
                            }
                            .buttonStyle(RowButtonStyle())
                        }
                        ForEach(hotels) { hotel in
                            Button { onSelect(.hotel(hotel)) } label: {
                                HotelRow(hotel: hotel)
                            }
                            .buttonStyle(RowButtonStyle())
                        }
                        ForEach(transports) { transport in
                            Button { onSelect(.transport(transport)) } label: {
                                TransportRow(transport: transport)
                            }
                            .buttonStyle(RowButtonStyle())
                        }
                        ForEach(expenses) { expense in
                            Button { onSelect(.expense(expense)) } label: {
                                ExpenseRow(expense: expense)
                            }
                            .buttonStyle(RowButtonStyle())
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Rows

private struct FlightRow: View {
    let flight: Flight
    let date: Date

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

    private var time: String {
        if let leg = activeLeg {
            let t = isArrivalLeg ? leg.arrivalLocalTime : leg.departureLocalTime
            return String(t.split(separator: "T").last?.prefix(5) ?? "")
        }
        return isArrivalLeg ? flight.arrivalTime : flight.departureTime
    }

    private var origin: String { activeLeg?.originIATA ?? flight.originIATA }
    private var destination: String { activeLeg?.destinationIATA ?? flight.destinationIATA }
    private var airline: String { activeLeg?.airline ?? flight.airline }
    private var flightNumber: String { activeLeg?.flightNumber ?? flight.flightNumber }

    var body: some View {
        ItemRowShell(
            icon: "airplane",
            tint: Tokens.Color.Category.flight,
            title: "\(origin) → \(destination)",
            subtitle: "\(airline) \(flightNumber)",
            trailingMono: time,
            trailingSecondary: flight.priceUSD.map { "$\(Int($0.rounded())) USD" }
        )
    }
}

private struct HotelRow: View {
    let hotel: Hotel

    var body: some View {
        ItemRowShell(
            icon: "bed.double.fill",
            tint: Tokens.Color.Category.hotel,
            title: hotel.name,
            subtitle: hotel.nights > 0 ? "\(hotel.nights) noches" : "Hotel",
            trailingMono: "",
            trailingSecondary: hotel.totalPriceUSD.map { "$\(Int($0.rounded())) USD" }
        )
    }
}

private struct TransportRow: View {
    let transport: Transport

    var body: some View {
        ItemRowShell(
            icon: transportSymbol,
            tint: Tokens.Color.Category.transit,
            title: "\(transport.origin) → \(transport.destination)",
            subtitle: transport.operator ?? transport.type,
            trailingMono: transport.departureTime,
            trailingSecondary: transport.priceUSD.map { "$\(Int($0.rounded())) USD" }
        )
    }

    private var transportSymbol: String {
        switch transport.type.lowercased() {
        case "train":      return "tram.fill"
        case "bus":        return "bus.fill"
        case "ferry":      return "ferry.fill"
        case "car":        return "car.fill"
        case "car_rental": return "car.circle.fill"
        case "taxi":       return "car.fill"
        case "subway":     return "tram.tunnel.fill"
        default:           return "tram.fill"
        }
    }
}

private struct ExpenseRow: View {
    let expense: Expense

    var body: some View {
        ItemRowShell(
            icon: expense.categoryKind.systemImage,
            tint: expense.categoryKind.tint,
            title: expense.title,
            subtitle: expense.category,
            trailingMono: "\(expense.currency) \(formatted(expense.amount))",
            trailingSecondary: expense.amountUSD.flatMap { $0 > 0 ? "≈ $\(Int($0.rounded()))" : nil }
        )
    }

    private func formatted(_ n: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return f.string(from: NSNumber(value: n)) ?? "\(Int(n))"
    }
}

// MARK: - Shared row shell

private struct ItemRowShell: View {
    let icon: String
    let tint: Color
    let title: String
    let subtitle: String
    let trailingMono: String
    let trailingSecondary: String?

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(tint.opacity(0.18))
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(tint)
            }
            .frame(width: 38, height: 38)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Tokens.Typo.strongM)
                    .tracking(Tokens.Track.bodyTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                MonoLabel(text: subtitle, color: Tokens.Color.textTertiary, size: .xs)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 2) {
                if !trailingMono.isEmpty {
                    Text(trailingMono)
                        .font(.system(size: 14, weight: .semibold, design: .monospaced))
                        .tracking(-0.2)
                        .foregroundStyle(Tokens.Color.textPrimary)
                }
                if let secondary = trailingSecondary {
                    MonoLabel(text: secondary, color: Tokens.Color.textTertiary, size: .xs)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                )
        )
    }
}
