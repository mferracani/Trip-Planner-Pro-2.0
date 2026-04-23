import SwiftUI

struct DashboardView: View {
    var cache: CacheManager? = nil
    var onTripsLoaded: (([Trip]) -> Void)? = nil

    @Environment(FirestoreClient.self) private var client
    @State private var vm: DashboardViewModel?
    @State private var showCreateTrip = false
    @State private var now = Date()

    private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    private var atmosphericAccent: Color {
        guard let trip = vm?.heroTrip else { return Tokens.Color.accentBlue }
        let idx = abs(trip.name.hashValue) % Tokens.Color.cityPalette.count
        return Tokens.Color.cityPalette[idx]
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AtmosphericBackground(accent: atmosphericAccent, intensity: 0.10)

                if let vm {
                    content(vm)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: Trip.self) { trip in
                TripDetailView(trip: trip)
                    .environment(client)
            }
            .sheet(isPresented: $showCreateTrip) {
                CreateTripSheet()
                    .environment(client)
            }
        }
        .onAppear {
            let viewModel = DashboardViewModel(client: client, cache: cache)
            vm = viewModel
            viewModel.start()
        }
        .onChange(of: vm?.trips) { _, trips in
            if let trips { onTripsLoaded?(trips) }
        }
        .onDisappear { vm?.stop() }
        .onReceive(timer) { now = $0 }
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private func content(_ vm: DashboardViewModel) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header(vm)
                    .padding(.horizontal, 20)
                    .padding(.top, 8)

                if vm.isOffline && !vm.trips.isEmpty {
                    offlineBanner
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                }

                if vm.isLoading {
                    loadingSkeleton
                        .padding(.horizontal, 20)
                        .padding(.top, 24)
                } else if vm.trips.isEmpty {
                    emptyState
                        .padding(.horizontal, 20)
                        .padding(.top, 24)
                } else {
                    if let hero = vm.heroTrip {
                        HeroTripCard(trip: hero, now: now)
                            .padding(.top, 24)
                    }

                    StatsSection(vm: vm)
                        .padding(.horizontal, 20)
                        .padding(.top, 28)

                    TripsListSection(vm: vm)
                        .padding(.horizontal, 20)
                        .padding(.top, 28)
                }
            }
            .padding(.bottom, 40)
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - Header

    private func header(_ vm: DashboardViewModel) -> some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 10) {
                MonoLabel(
                    text: vm.todayLabel,
                    color: Tokens.Color.textTertiary,
                    size: .xs
                )

                Text(vm.greeting)
                    .font(.system(size: 32, weight: .bold))
                    .tracking(Tokens.Track.displayTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                    .fixedSize(horizontal: false, vertical: true)
                    .transaction { $0.animation = nil }
            }

            Spacer(minLength: 8)

            CircleIconButton(systemImage: "plus") {
                showCreateTrip = true
            }
            .padding(.top, 8)
        }
    }

    private var offlineBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
                .font(.system(size: 11, weight: .medium))
            MonoLabel(
                text: "Sin conexión · datos guardados",
                color: Tokens.Color.textTertiary,
                size: .xs
            )
            Spacer()
        }
        .foregroundStyle(Tokens.Color.textTertiary)
        .padding(.vertical, 10)
        .padding(.horizontal, 14)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                .fill(Tokens.Color.surface.opacity(0.6))
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                )
        )
    }

    private var loadingSkeleton: some View {
        VStack(spacing: 16) {
            RoundedRectangle(cornerRadius: Tokens.Radius.xl)
                .fill(Tokens.Color.surface)
                .frame(height: 300)
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: Tokens.Radius.md).fill(Tokens.Color.surface).frame(height: 90)
                RoundedRectangle(cornerRadius: Tokens.Radius.md).fill(Tokens.Color.surface).frame(height: 90)
            }
        }
        .redacted(reason: .placeholder)
    }

    private var emptyState: some View {
        VStack(spacing: 24) {
            CityCover(
                color: Tokens.Color.cityPalette[1],
                label: "tu primer viaje",
                height: 220,
                cornerRadius: Tokens.Radius.xl
            )

            VStack(spacing: 8) {
                Text("Empezá a\nplanificar.")
                    .font(.system(size: 32, weight: .bold))
                    .tracking(Tokens.Track.displayTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("Creá tu primer viaje y cargá vuelos,\nhoteles o transportes con IA.")
                    .font(Tokens.Typo.bodyM)
                    .foregroundStyle(Tokens.Color.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button {
                showCreateTrip = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .semibold))
                    Text("Crear viaje")
                        .font(Tokens.Typo.strongM)
                }
                .foregroundStyle(.white)
                .padding(.vertical, 16)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .fill(Tokens.Color.accentBlue)
                )
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - HeroTripCard

private struct HeroTripCard: View {
    let trip: Trip
    let now: Date

    private var cityColor: Color {
        Tokens.Color.cityPalette[abs(trip.name.hashValue) % Tokens.Color.cityPalette.count]
    }

    private var isActive: Bool { trip.status_computed == .active }

    private var statusText: String {
        if isActive { return "En curso" }
        let days = trip.daysUntilStart
        if days == 0 { return "Empieza hoy" }
        if days < 0 { return "Pasado" }
        return "Próximo viaje"
    }

    private var statusColor: Color {
        isActive ? Tokens.Color.accentGreen : Tokens.Color.accentGreen
    }

    var body: some View {
        NavigationLink(value: trip) {
            VStack(spacing: 0) {
                // Cover full-bleed
                CityCover(
                    color: cityColor,
                    label: trip.name.lowercased(),
                    height: 220,
                    cornerRadius: 0
                )

                // Info block — black surface with architectural dividers
                VStack(alignment: .leading, spacing: 0) {
                    // Status row
                    HStack {
                        StatusDot(text: statusText, color: statusColor)
                        Spacer()
                        MonoLabel(
                            text: isActive ? "Día \(trip.currentDayNumber)" : countdownShort,
                            color: Tokens.Color.textSecondary,
                            size: .xs
                        )
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                    .padding(.bottom, 16)

                    Hairline()

                    // Trip name + dates
                    VStack(alignment: .leading, spacing: 6) {
                        Text(trip.name)
                            .font(.system(size: 28, weight: .bold))
                            .tracking(Tokens.Track.displayTight)
                            .foregroundStyle(Tokens.Color.textPrimary)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        Text(dateRangeText)
                            .font(.system(size: 14, weight: .regular))
                            .foregroundStyle(Tokens.Color.textSecondary)
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 18)

                    Hairline()

                    // Big number + CTA
                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack(alignment: .firstTextBaseline, spacing: 4) {
                                Text("\(tripDays)")
                                    .font(.system(size: 48, weight: .bold))
                                    .tracking(Tokens.Track.displayTight)
                                    .foregroundStyle(Tokens.Color.textPrimary)
                                Text("d")
                                    .font(.system(size: 24, weight: .semibold, design: .monospaced))
                                    .foregroundStyle(Tokens.Color.textTertiary)
                                    .padding(.leading, 2)
                            }
                            MonoLabel(
                                text: "Duración",
                                color: Tokens.Color.textTertiary,
                                size: .xs
                            )
                        }
                        Spacer()
                        HStack(spacing: 8) {
                            Text("Ver viaje")
                                .font(Tokens.Typo.strongM)
                            Image(systemName: "arrow.right")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                        .background(Capsule().fill(Tokens.Color.accentBlue))
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 20)

                    Hairline()

                    // Countdown
                    countdownBar
                        .padding(.horizontal, 20)
                        .padding(.vertical, 14)
                }
                .background(Tokens.Color.surface)
            }
            .clipShape(
                UnevenRoundedRectangle(
                    topLeadingRadius: 0,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: 0,
                    topTrailingRadius: 0
                )
            )
        }
        .buttonStyle(.plain)
    }

    private var dateRangeText: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.setLocalizedDateFormatFromTemplate("dMMM")
        let start = f.string(from: trip.startDate)
        let end = f.string(from: trip.endDate)
        return "\(start) – \(end)"
    }

    private var tripDays: Int {
        (Calendar.current.dateComponents([.day], from: trip.startDate, to: trip.endDate).day ?? 0) + 1
    }

    private var countdownShort: String {
        if isActive {
            return "Día \(trip.currentDayNumber) / \(tripDays)"
        }
        let days = trip.daysUntilStart
        if days == 0 { return "Hoy" }
        if days == 1 { return "Mañana" }
        return "\(days) días"
    }

    private var countdownBar: some View {
        HStack(spacing: 10) {
            Image(systemName: isActive ? "location.fill" : "clock")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(isActive ? Tokens.Color.accentGreen : Tokens.Color.textTertiary)

            if !isActive {
                MonoLabel(text: "Faltan", color: Tokens.Color.textTertiary, size: .xs)
            } else {
                MonoLabel(text: "En vuelo", color: Tokens.Color.accentGreen, size: .xs)
            }

            Text(countdownLong)
                .font(.system(size: 14, weight: .semibold, design: .monospaced))
                .tracking(-0.2)
                .foregroundStyle(Tokens.Color.textPrimary)

            Spacer()
        }
    }

    private var countdownLong: String {
        if isActive {
            return "Día \(trip.currentDayNumber) de \(tripDays)"
        }
        let total = max(0, Calendar.current.dateComponents([.second], from: now, to: trip.startDate).second ?? 0)
        let days = total / 86_400
        let remAfterDays = total - days * 86_400
        let hours = remAfterDays / 3600
        let minutes = (remAfterDays % 3600) / 60
        if days > 0 {
            return "\(days)d · \(hours)h \(minutes)m"
        }
        return "\(hours)h \(minutes)m"
    }
}

// MARK: - StatsSection

private struct StatsSection: View {
    let vm: DashboardViewModel

    private let columns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Resumen \(vm.currentYear)")

            LazyVGrid(columns: columns, spacing: 10) {
                StatCard(value: "\(vm.statTripsThisYear)", label: "Viajes este año")
                StatCard(value: "\(vm.statCitiesVisited)", label: "Ciudades")
                StatCard(value: "\(vm.statDaysTraveling)", label: "Días viajando")
                StatCard(
                    value: vm.statTotalSpentUSD == 0 ? "—" : "$\(vm.statTotalSpentUSD)",
                    label: "Gastado USD"
                )
            }
        }
    }
}

// MARK: - TripsListSection

private struct TripsListSection: View {
    @Bindable var vm: DashboardViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Mis viajes")

            // Filter pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(DashboardViewModel.TripsFilter.allCases) { f in
                        FilterPill(text: f.rawValue, isActive: vm.filter == f) {
                            withAnimation(.easeInOut(duration: 0.18)) {
                                vm.filter = f
                            }
                        }
                    }
                }
            }
            .scrollClipDisabled()

            if vm.filteredTrips.isEmpty {
                HStack {
                    Text("No hay viajes en esta categoría")
                        .font(Tokens.Typo.bodyM)
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Spacer()
                }
                .padding(.vertical, 24)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(vm.filteredTrips.enumerated()), id: \.element.id) { idx, trip in
                        NavigationLink(value: trip) {
                            TripRow(trip: trip, index: idx)
                        }
                        .buttonStyle(.plain)

                        if idx < vm.filteredTrips.count - 1 {
                            Hairline()
                        }
                    }
                }
                .background(
                    RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                        .fill(Tokens.Color.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                                .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                        )
                )
            }
        }
    }
}

// MARK: - TripRow
//
// Departure-board style: mono index badge, trip name display, mono days count.
private struct TripRow: View {
    let trip: Trip
    let index: Int

    private var color: Color {
        // Skip the first palette color (coral — reads as red/error) for list items.
        Tokens.Color.cityPalette[(index + 1) % Tokens.Color.cityPalette.count]
    }

    private var statusText: String {
        switch trip.status_computed {
        case .active:  return "En curso"
        case .planned: return "Próximo"
        case .past:    return "Pasado"
        }
    }

    private var statusColor: Color {
        switch trip.status_computed {
        case .active:  return Tokens.Color.accentGreen
        case .planned: return Tokens.Color.accentBlue
        case .past:    return Tokens.Color.textTertiary
        }
    }

    var body: some View {
        HStack(spacing: 14) {
            // Mono index badge with city color
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(color.opacity(0.18))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .strokeBorder(color.opacity(0.4), lineWidth: 0.5)
                    )
                MonoNumber(value: index + 1, size: 14, color: color, padded: true)
            }
            .frame(width: 42, height: 42)

            // Name + dates
            VStack(alignment: .leading, spacing: 2) {
                Text(trip.name)
                    .font(Tokens.Typo.strongM)
                    .tracking(Tokens.Track.bodyTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                Text(dateRangeText)
                    .font(.system(size: 12, weight: .regular, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textSecondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 1) {
                    MonoNumber(value: tripDays, size: 18, color: Tokens.Color.textPrimary)
                    Text("d")
                        .font(.system(size: 11, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
                MonoLabel(text: statusText, color: statusColor, size: .xs)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private var dateRangeText: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.dateFormat = "dd MMM yy"
        return "\(f.string(from: trip.startDate)) – \(f.string(from: trip.endDate))"
    }

    private var tripDays: Int {
        (Calendar.current.dateComponents([.day], from: trip.startDate, to: trip.endDate).day ?? 0) + 1
    }
}

// MARK: - CreateTripSheet

private struct CreateTripSheet: View {
    @Environment(FirestoreClient.self) private var client
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var startDate = Date()
    @State private var endDate = Calendar.current.date(byAdding: .day, value: 7, to: Date())!
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            ZStack {
                AtmosphericBackground(accent: Tokens.Color.accentBlue, intensity: 0.08)

                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 10) {
                        MonoLabel(text: "Nuevo viaje", color: Tokens.Color.textTertiary, size: .xs)
                        Text("¿A dónde vamos?")
                            .font(.system(size: 32, weight: .bold))
                            .tracking(Tokens.Track.displayTight)
                            .foregroundStyle(Tokens.Color.textPrimary)
                    }
                    .padding(.top, 8)

                    VStack(alignment: .leading, spacing: 8) {
                        MonoLabel(text: "Nombre", color: Tokens.Color.textTertiary, size: .xs)
                        TextField("", text: $name, prompt:
                            Text("Europa primavera")
                                .foregroundStyle(Tokens.Color.textTertiary)
                        )
                            .font(Tokens.Typo.bodyL)
                            .foregroundStyle(Tokens.Color.textPrimary)
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

                    VStack(alignment: .leading, spacing: 8) {
                        MonoLabel(text: "Fechas", color: Tokens.Color.textTertiary, size: .xs)
                        VStack(spacing: 0) {
                            DatePicker("Inicio", selection: $startDate, displayedComponents: .date)
                                .tint(Tokens.Color.accentBlue)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                            Hairline()
                            DatePicker("Fin", selection: $endDate, in: startDate..., displayedComponents: .date)
                                .tint(Tokens.Color.accentBlue)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                        }
                        .background(Tokens.Color.surface)
                        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
                        .overlay(
                            RoundedRectangle(cornerRadius: Tokens.Radius.md)
                                .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                        )
                    }

                    Spacer()
                }
                .padding(20)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Crear") { save() }
                        .disabled(name.isEmpty || isSaving)
                        .fontWeight(.semibold)
                        .foregroundStyle(
                            name.isEmpty ? Tokens.Color.textTertiary : Tokens.Color.accentBlue
                        )
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func save() {
        isSaving = true
        let trip = Trip(
            name: name,
            startDate: startDate,
            endDate: endDate,
            status: .planned,
            cityOrder: [],
            createdAt: .now
        )
        Task {
            try? await client.createTrip(trip)
            dismiss()
        }
    }
}
