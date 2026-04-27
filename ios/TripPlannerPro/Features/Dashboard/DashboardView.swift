import SwiftUI

struct DashboardView: View {
    var cache: CacheManager? = nil
    var onTripsLoaded: (([Trip]) -> Void)? = nil

    @Environment(FirestoreClient.self) private var client
    @State private var vm: DashboardViewModel?
    @State private var now = Date()
    @State private var isCreatingDemo = false
    @State private var demoError: String?

    private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()
                backgroundHaze

                if let vm {
                    content(vm)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: Trip.self) { trip in
                TripDetailView(trip: trip)
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

    /// Warm ambient glow behind the hero card.
    private var backgroundHaze: some View {
        ZStack {
            RadialGradient(
                colors: [Tokens.Color.accentPurple.opacity(0.14), .clear],
                center: UnitPoint(x: 0.15, y: 0.05),
                startRadius: 10,
                endRadius: 360
            )
            RadialGradient(
                colors: [Tokens.Color.accentBlue.opacity(0.10), .clear],
                center: UnitPoint(x: 0.95, y: 0.4),
                startRadius: 10,
                endRadius: 300
            )
        }
        .ignoresSafeArea()
    }

    @ViewBuilder
    private func content(_ vm: DashboardViewModel) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                header(vm)
                    .padding(.horizontal, 20)
                    .padding(.top, 4)

                if vm.isOffline && !vm.trips.isEmpty {
                    offlineBanner
                        .padding(.horizontal, 20)
                }

                if vm.isLoading {
                    loadingSkeleton
                        .padding(.horizontal, 20)
                } else if vm.trips.isEmpty {
                    emptyState
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                } else {
                    if vm.heroTrip != nil {
                        NextTripCard(vm: vm, now: now)
                            .padding(.horizontal, 20)
                    }

                    TripsListSection(vm: vm)
                        .padding(.horizontal, 20)
                }
            }
            .padding(.bottom, 24)
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - Header

    private func header(_ vm: DashboardViewModel) -> some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(greetingTime)
                    .font(Tokens.Typo.bodyS)
                    .foregroundStyle(Tokens.Color.textTertiary)
                Text(vm.greeting)
                    .font(Tokens.Typo.displayL)
                    .tracking(Tokens.Track.displayTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                // Annual summary line — mirrors web desktop "X viajes · Y ciudades"
                if !vm.trips.isEmpty {
                    let tripCount = vm.statTripsThisYear
                    let cityCount = vm.statYearCities
                    Text("\(tripCount) viaje\(tripCount == 1 ? "" : "s") · \(cityCount) ciudad\(cityCount == 1 ? "" : "es")")
                        .font(Tokens.Typo.monoS)
                        .foregroundStyle(Tokens.Color.textQuaternary)
                        .padding(.top, 2)
                }
            }

            Spacer(minLength: 8)

            avatarButton
        }
    }

    private var greetingTime: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Buen día"
        case 12..<19: return "Buenas tardes"
        default: return "Buenas noches"
        }
    }

    private var avatarButton: some View {
        Button { } label: {
            ZStack {
                Circle()
                    .fill(Tokens.Color.elevated)
                    .overlay(
                        Circle()
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
                Image(systemName: "person.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
            .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
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
                .frame(height: 420)
            VStack(spacing: 10) {
                ForEach(0..<2) { _ in
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .fill(Tokens.Color.surface)
                        .frame(height: 80)
                }
            }
        }
        .redacted(reason: .placeholder)
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 18) {
            // Decorative cover
            RoundedRectangle(cornerRadius: Tokens.Radius.xl)
                .fill(
                    LinearGradient(
                        colors: [
                            Tokens.Color.cityPalette[1],
                            Tokens.Color.cityPalette[1].opacity(0.6)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(height: 220)
                .overlay(
                    Image(systemName: "airplane")
                        .font(.system(size: 88, weight: .ultraLight))
                        .foregroundStyle(.white.opacity(0.18))
                        .rotationEffect(.degrees(-18))
                )

            VStack(alignment: .leading, spacing: 8) {
                Text("Empezá a planificar")
                    .font(Tokens.Typo.displayXL)
                    .tracking(Tokens.Track.displayTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                Text("Creá tu primer viaje y cargá vuelos, hoteles o transportes con IA.")
                    .font(Tokens.Typo.bodyM)
                    .foregroundStyle(Tokens.Color.textSecondary)
            }

            Button {
                Task { await createDemo() }
            } label: {
                HStack(spacing: 8) {
                    if isCreatingDemo {
                        ProgressView().tint(.black).scaleEffect(0.8)
                    } else {
                        Image(systemName: "play.fill")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    Text(isCreatingDemo ? "Creando demo..." : "Ver demo")
                        .font(.system(size: 15, weight: .semibold))
                }
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: Tokens.Radius.md)
                        .fill(Tokens.Color.cityPalette[1])
                )
            }
            .disabled(isCreatingDemo)
            .buttonStyle(.plain)

            if let err = demoError {
                Text(err)
                    .font(.system(size: 12))
                    .foregroundStyle(Tokens.Color.accentRed)
            }
        }
    }

    private func createDemo() async {
        isCreatingDemo = true
        demoError = nil
        do {
            try await client.createDemoTrip()
        } catch {
            demoError = "No se pudo crear el demo."
        }
        isCreatingDemo = false
    }
}

// MARK: - NextTripCard
//
// Hero card. Cover uses the TripTheme gradient when available (mirrors web HeroTripCard).
// Stats section: progress ring + 3 icon rows.

private struct NextTripCard: View {
    let vm: DashboardViewModel
    let now: Date

    private var trip: Trip? { vm.heroTrip }

    /// Theme resolved from the trip's coverURL. Nil if no theme matches.
    private var theme: TripTheme? {
        TripTheme.getTheme(coverUrl: trip?.coverURL)
    }

    /// Fallback gradient color derived from the trip name hash.
    private var fallbackColor: Color {
        guard let trip else { return Tokens.Color.cityPalette[1] }
        return Tokens.Color.cityPalette[abs(trip.name.hashValue) % Tokens.Color.cityPalette.count]
    }

    private var isActive: Bool { trip?.status_computed == .active }

    private var contextLabel: String {
        isActive ? "EN CURSO" : "PRÓXIMO VIAJE"
    }

    private var countdownText: String {
        guard let trip else { return "—" }
        if isActive {
            return "Día \(trip.currentDayNumber)"
        }
        let days = trip.daysUntilStart
        if days == 0 {
            let startOfDay = Calendar.current.startOfDay(for: trip.startDate)
            if now >= startOfDay {
                return "Empieza hoy"
            }
            let diff = startOfDay.timeIntervalSince(now)
            let h = Int(diff / 3600)
            let m = Int(diff.truncatingRemainder(dividingBy: 3600) / 60)
            if h > 0 { return "Faltan \(h)h \(m)m" }
            return "Faltan \(m)m"
        }
        if days == 1 { return "En 1 día" }
        return "En \(days) días"
    }

    private var budgetText: String {
        guard let total = trip?.totalUSD, total > 0 else { return "" }
        return "USD \(Int(total.rounded()).formatted(.number.grouping(.automatic)))"
    }

    var body: some View {
        guard let trip else { return AnyView(EmptyView()) }

        return AnyView(
            NavigationLink(value: trip) {
                VStack(spacing: 0) {
                    coverSection(trip)
                    Hairline(color: Tokens.Color.textPrimary.opacity(0.05))
                    statsSection
                    Hairline(color: Tokens.Color.textPrimary.opacity(0.05))
                    totalSpentRow
                }
                .background(
                    RoundedRectangle(cornerRadius: Tokens.Radius.xl)
                        .fill(Tokens.Color.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: Tokens.Radius.xl)
                                .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                        )
                )
                .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.xl))
                .shadow(color: .black.opacity(0.25), radius: 20, x: 0, y: 8)
            }
            .buttonStyle(.plain)
        )
    }

    // MARK: Cover

    @ViewBuilder
    private func coverSection(_ trip: Trip) -> some View {
        ZStack(alignment: .topLeading) {
            // Theme gradient or name-hash fallback
            if let theme {
                theme.gradientBackground
                    .frame(height: 180)
            } else {
                LinearGradient(
                    colors: [
                        fallbackColor.opacity(0.95),
                        fallbackColor.opacity(0.75),
                        Tokens.Color.surface
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .frame(height: 180)
            }

            // Vignette bottom for text legibility
            LinearGradient(
                colors: [.clear, .black.opacity(0.45)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 180)

            // Noise overlay
            LinearGradient(
                colors: [
                    .white.opacity(0.05), .clear,
                    .black.opacity(0.15), .clear
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 180)
            .blendMode(.overlay)

            // Content overlay
            VStack(alignment: .leading, spacing: 0) {
                // Status badge top-left
                HeroStatusBadge(isActive: isActive)
                    .padding(.top, 16)

                Spacer()

                VStack(alignment: .leading, spacing: 4) {
                    Text(trip.name)
                        .font(Tokens.Typo.displayXL)
                        .tracking(Tokens.Track.displayTight)
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    HStack(spacing: 6) {
                        Text(countdownText)
                            .font(Tokens.Typo.strongS)
                            .foregroundStyle(.white.opacity(0.9))
                        if !budgetText.isEmpty {
                            Text("·")
                                .foregroundStyle(.white.opacity(0.5))
                            Text(budgetText)
                                .font(.system(size: 13, weight: .semibold, design: .monospaced))
                                .foregroundStyle(.white.opacity(0.85))
                        }
                    }
                }
                .padding(.bottom, 16)
            }
            .padding(.horizontal, 18)
            .frame(height: 180, alignment: .bottomLeading)

            // Theme emoji — top right corner (only when theme exists)
            if let theme {
                VStack {
                    HStack {
                        Spacer()
                        Text(theme.emoji)
                            .font(.system(size: 28))
                            .shadow(color: .black.opacity(0.4), radius: 4, x: 0, y: 2)
                    }
                    Spacer()
                }
                .padding(.top, 14)
                .padding(.trailing, 16)
            } else {
                // Fallback: chevron arrow indicator
                VStack {
                    HStack {
                        Spacer()
                        ZStack {
                            Circle()
                                .fill(.black.opacity(0.35))
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        .frame(width: 32, height: 32)
                    }
                    Spacer()
                }
                .padding(14)
            }
        }
        .frame(height: 180)
    }

    // MARK: Stats

    private var heroTripDays: Int {
        guard let t = vm.heroTrip else { return 0 }
        return max(1, (Calendar.current.dateComponents([.day], from: t.startDate, to: t.endDate).day ?? 0) + 1)
    }

    private var progressLabel: String {
        if let total = vm.heroTrip?.totalUSD, total > 0 { return "Pagado" }
        return isActive ? "Avance" : "Próximo"
    }

    private var statsSection: some View {
        HStack(alignment: .center, spacing: 20) {
            // Progress ring — temporal: trip elapsed % (active) or countdown (upcoming)
            ZStack {
                ProgressRing(
                    progress: vm.heroProgress,
                    lineWidth: 8,
                    size: 90,
                    color: Tokens.Color.accentBlue
                )
                VStack(spacing: 2) {
                    Text("\(Int(vm.heroProgress * 100))%")
                        .font(.system(size: 16, weight: .bold, design: .monospaced))
                        .foregroundStyle(Tokens.Color.textPrimary)
                    Text(progressLabel)
                        .font(.system(size: 9, weight: .medium))
                        .tracking(0.4)
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
            }

            VStack(alignment: .leading, spacing: 12) {
                StatIconRow(
                    icon: "mappin.and.ellipse",
                    value: "\(vm.heroTrip?.citiesCount ?? 0)",
                    label: "Ciudades"
                )
                StatIconRow(
                    icon: "calendar",
                    value: "\(heroTripDays)",
                    label: "Días"
                )
                StatIconRow(
                    icon: "clock.fill",
                    value: isActive ? "Día \(vm.heroTrip?.currentDayNumber ?? 1)" : "En \(vm.daysUntilHero) días",
                    label: isActive ? "Día actual" : "Cuenta reg."
                )
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 20)
    }

    // MARK: Trip budget row

    private var totalSpentRow: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("USD")
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Text(formattedTotal)
                        .font(.system(size: 28, weight: .bold, design: .monospaced))
                        .tracking(-0.6)
                        .foregroundStyle(Tokens.Color.accentBlue)
                }
                Text("Presupuesto del viaje")
                    .font(Tokens.Typo.bodyS)
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
            Spacer()
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 16)
    }

    private var formattedTotal: String {
        let total = Int((vm.heroTrip?.totalUSD ?? 0).rounded())
        if total == 0 { return "—" }
        return total.formatted(.number.grouping(.automatic))
    }
}

// MARK: - StatIconRow

private struct StatIconRow: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 7)
                    .fill(Tokens.Color.accentBlue.opacity(0.12))
                Image(systemName: icon)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Tokens.Color.accentBlue)
            }
            .frame(width: 24, height: 24)

            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text(value)
                    .font(.system(size: 15, weight: .bold, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textPrimary)
                Text(label)
                    .font(Tokens.Typo.bodyS)
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
        }
    }
}

// MARK: - ProgressRing

struct ProgressRing: View {
    let progress: Double
    let lineWidth: CGFloat
    let size: CGFloat
    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.12), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: min(1, max(0, progress)))
                .stroke(
                    color,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(Tokens.Motion.spring, value: progress)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - TripsListSection

private struct TripsListSection: View {
    @Bindable var vm: DashboardViewModel
    @Environment(FirestoreClient.self) private var client

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Mis viajes")
                    .font(Tokens.Typo.displayM)
                    .tracking(Tokens.Track.displayTight)
                    .foregroundStyle(Tokens.Color.textPrimary)
                Spacer()
                Text("\(vm.filteredTrips.count)")
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }

            // Filter pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(DashboardViewModel.TripsFilter.allCases) { f in
                        FilterPill(text: f.rawValue, isActive: vm.filter == f) {
                            withAnimation(Tokens.Motion.snap) {
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
                VStack(spacing: 10) {
                    ForEach(Array(vm.filteredTrips.enumerated()), id: \.element.id) { idx, trip in
                        VStack(spacing: 6) {
                            NavigationLink(value: trip) {
                                TripRowCard(trip: trip, index: idx)
                            }
                            .buttonStyle(.plain)

                            // Confirm button for draft trips
                            if trip.status == .draft {
                                DraftConfirmButton(trip: trip, client: client)
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - DraftConfirmButton

private struct DraftConfirmButton: View {
    let trip: Trip
    let client: FirestoreClient

    @State private var isConfirming = false

    var body: some View {
        Button {
            guard let tripID = trip.id else { return }
            isConfirming = true
            Task {
                try? await client.updateTripStatus(tripID: tripID, status: .planned)
                isConfirming = false
            }
        } label: {
            HStack(spacing: 6) {
                if isConfirming {
                    ProgressView()
                        .tint(.black)
                        .scaleEffect(0.75)
                } else {
                    Text("Confirmar")
                        .font(.system(size: 12, weight: .semibold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 10, weight: .semibold))
                }
            }
            .foregroundStyle(.black)
            .padding(.horizontal, 16)
            .padding(.vertical, 7)
            .background(Capsule().fill(Tokens.Color.accentGold))
        }
        .buttonStyle(.plain)
        .disabled(isConfirming)
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(.trailing, 4)
    }
}

// MARK: - TripRowCard
//
// Mirrors web TripCard.tsx:
// - Rounded-square thumbnail with theme gradient + emoji (or fallback gradient + airplane)
// - Trip name + date range
// - Status badge pill
// - USD amount (monospaced)

private struct TripRowCard: View {
    let trip: Trip
    let index: Int

    private var theme: TripTheme? {
        TripTheme.getTheme(coverUrl: trip.coverURL)
    }

    /// Name-hash based fallback color (same logic as before).
    private var fallbackColor: Color {
        Tokens.Color.cityPalette[(index + 1) % Tokens.Color.cityPalette.count]
    }

    private var statusLabel: String {
        switch trip.status {
        case .draft: return "BORRADOR"
        case .active: return "EN CURSO"
        case .planned: return "FUTURO"
        case .past: return "PASADO"
        }
    }

    private var statusColor: Color {
        switch trip.status {
        case .draft: return Tokens.Color.accentGold
        case .active: return Tokens.Color.accentGreen
        case .planned: return Tokens.Color.accentBlue
        case .past: return Tokens.Color.textTertiary
        }
    }

    var body: some View {
        HStack(spacing: 14) {
            // Themed thumbnail — 56×56 rounded square
            tripThumbnail

            VStack(alignment: .leading, spacing: 3) {
                HStack(alignment: .center, spacing: 6) {
                    Text(trip.name)
                        .font(Tokens.Typo.strongM)
                        .foregroundStyle(Tokens.Color.textPrimary)
                        .lineLimit(1)

                    // Status pill — inline next to name (mirrors web TripCard)
                    Text(statusLabel)
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .tracking(Tokens.Track.labelWider)
                        .foregroundStyle(statusColor)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(statusColor.opacity(0.12)))
                        .fixedSize()
                }

                Text(dateRangeText)
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textTertiary)

                if let amount = amountText {
                    Text(amount)
                        .font(Tokens.Typo.monoS)
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
            }

            Spacer(minLength: 8)

            // Chevron
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Tokens.Color.textQuaternary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                .fill(
                    LinearGradient(
                        colors: [Tokens.Color.surface, Tokens.Color.bgPrimary.opacity(0.5)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                        .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                )
        )
        .contentShape(RoundedRectangle(cornerRadius: Tokens.Radius.lg))
    }

    // MARK: Thumbnail

    @ViewBuilder
    private var tripThumbnail: some View {
        ZStack {
            // Background
            if let theme {
                theme.gradientBackground
            } else {
                LinearGradient(
                    colors: [fallbackColor.opacity(0.85), fallbackColor.opacity(0.45)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }

            // Icon / emoji
            if let theme {
                Text(theme.emoji)
                    .font(.system(size: 24))
                    .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
            } else {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.9))
                    .rotationEffect(.degrees(-35))
            }
        }
        .frame(width: 56, height: 56)
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.sm + 2))
        .overlay(
            RoundedRectangle(cornerRadius: Tokens.Radius.sm + 2)
                .strokeBorder(.white.opacity(0.08), lineWidth: 0.5)
        )
    }

    // MARK: Helpers

    private var dateRangeText: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.dateFormat = "d MMM yy"
        let range = "\(f.string(from: trip.startDate)) – \(f.string(from: trip.endDate))"
        return trip.status == .draft ? "~ \(range)" : range
    }

    private var amountText: String? {
        guard let total = trip.totalUSD, total > 0 else { return nil }
        return "USD \(Int(total.rounded()).formatted(.number.grouping(.automatic)))"
    }
}

// MARK: - HeroStatusBadge
//
// Green pill for "En curso", gold pill for "Próximo".

private struct HeroStatusBadge: View {
    let isActive: Bool

    var body: some View {
        let label: String = isActive ? "EN CURSO" : "PRÓXIMO"
        let fg: Color     = isActive ? Tokens.Color.accentGreen : Tokens.Color.accentGold
        let bg: Color     = fg.opacity(0.18)

        Text(label)
            .font(.system(size: 9, weight: .black, design: .monospaced))
            .tracking(Tokens.Track.labelWider)
            .foregroundStyle(fg)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(
                Capsule().fill(bg)
                    .overlay(Capsule().strokeBorder(fg.opacity(0.3), lineWidth: 0.5))
            )
    }
}

// CreateTripSheet extracted to Features/Editing/CreateTripSheet.swift so the
// global AtlasTabBar FAB can reuse it.
