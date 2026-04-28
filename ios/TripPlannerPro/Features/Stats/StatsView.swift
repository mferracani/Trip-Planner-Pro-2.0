import SwiftUI

// MARK: - StatsView
//
// "Tu mundo" screen: spinning globe hero + stat cards.
// Fetches all trips + subcollections to compute travel statistics.

struct StatsView: View {
    @Environment(FirestoreClient.self) private var client
    @State private var vm: StatsViewModel?
    @State private var cardsVisible = false

    var body: some View {
        ZStack {
            backgroundGradient.ignoresSafeArea()

            if let vm {
                contentView(vm)
            } else {
                loadingView
            }
        }
        .onAppear {
            let model = StatsViewModel(client: client)
            vm = model
            model.start()
            withAnimation(.easeOut(duration: 0.5).delay(0.2)) {
                cardsVisible = true
            }
        }
        .onDisappear { vm?.stop() }
        .preferredColorScheme(.dark)
    }

    // MARK: - Background

    private var backgroundGradient: some View {
        ZStack {
            Color(hex: 0x0D0D0D)
            RadialGradient(
                colors: [Color(hex: 0x0A84FF).opacity(0.07), .clear],
                center: UnitPoint(x: 0.5, y: 0),
                startRadius: 10,
                endRadius: 400
            )
            RadialGradient(
                colors: [Color(hex: 0x30D158).opacity(0.05), .clear],
                center: UnitPoint(x: 0.1, y: 0.8),
                startRadius: 10,
                endRadius: 320
            )
        }
    }

    // MARK: - Content

    @ViewBuilder
    private func contentView(_ vm: StatsViewModel) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                headerSection
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 4)

                // Globe
                globeSection(vm)
                    .padding(.bottom, 8)

                // Stat grid
                statGrid(vm)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)

                // Next trip card
                if let hero = heroTrip(vm.trips) {
                    nextTripCard(trip: hero)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 16)
                }

                // CTA
                ctaButton
                    .padding(.horizontal, 16)
                    .padding(.bottom, 40)
            }
        }
        .scrollIndicators(.hidden)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Tu mundo")
                .font(.system(size: 34, weight: .bold, design: .default))
                .foregroundStyle(Tokens.Color.textPrimary)
                .opacity(cardsVisible ? 1 : 0)
                .offset(y: cardsVisible ? 0 : 12)
                .animation(.easeOut(duration: 0.45), value: cardsVisible)
        }
        .padding(.top, 4)
    }

    // MARK: - Globe

    @ViewBuilder
    private func globeSection(_ vm: StatsViewModel) -> some View {
        VStack(spacing: 16) {
            ZStack {
                if vm.isLoading {
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [Color(hex: 0x1A3A6B).opacity(0.6), Color(hex: 0x050D1A)],
                                center: .center,
                                startRadius: 10,
                                endRadius: 140
                            )
                        )
                        .frame(width: 280, height: 280)
                        .shimmer()
                } else {
                    TravelGlobeView(markers: vm.stats.countryMarkers)
                        .frame(width: 280, height: 280)
                        .transition(.opacity.combined(with: .scale(scale: 0.95)))
                }
            }
            .frame(maxWidth: .infinity)
            .animation(.easeOut(duration: 0.6), value: vm.isLoading)

            // Country count
            VStack(spacing: 4) {
                if vm.isLoading {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(hex: 0x1A1A1A))
                        .frame(width: 120, height: 44)
                        .shimmer()
                } else {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        CountUpText(target: vm.stats.countries)
                            .font(.system(size: 52, weight: .bold))
                            .foregroundStyle(Tokens.Color.textPrimary)
                            .monospacedDigit()

                        Text(vm.stats.countries == 1 ? "país" : "países")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(Tokens.Color.textSecondary)
                    }

                    if vm.stats.countries > 0 {
                        Text("\(estimateContinents(vm.stats.countries)) continente\(estimateContinents(vm.stats.countries) == 1 ? "" : "s")")
                            .font(.system(size: 14))
                            .foregroundStyle(Tokens.Color.textTertiary)
                    }
                }
            }
            .opacity(cardsVisible ? 1 : 0)
            .animation(.easeOut(duration: 0.5).delay(0.3), value: cardsVisible)
        }
        .padding(.vertical, 8)
    }

    // MARK: - Stat Grid

    @ViewBuilder
    private func statGrid(_ vm: StatsViewModel) -> some View {
        let cards: [(icon: String, label: String, value: Int, suffix: String, color: SwiftUI.Color, delay: Double)] = [
            ("building.2.fill", "Ciudades", vm.stats.cities, "", Color(hex: 0x4ECDC4), 0),
            ("airplane", "Vuelos", vm.stats.flights, "", Tokens.Color.accentBlue, 0.08),
            ("calendar", "Días", vm.stats.days, "", Color(hex: 0xFFD93D), 0.16),
            ("globe.americas.fill", "Kilómetros", vm.stats.kmTraveled / 1000, "k", Tokens.Color.accentGreen, 0.24),
            ("bed.double.fill", "Noches", vm.stats.hotelNights, "", Tokens.Color.accentOrange, 0.32),
            ("mappin.circle.fill", "Países", vm.stats.countries, "", Tokens.Color.accentPurple, 0.40),
        ]

        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(Array(cards.enumerated()), id: \.offset) { idx, card in
                StatsStatCard(
                    icon: card.icon,
                    label: card.label,
                    value: card.value,
                    suffix: card.suffix,
                    accentColor: card.color,
                    isLoading: vm.isLoading,
                    visible: cardsVisible,
                    delay: card.delay
                )
            }
        }
    }

    // MARK: - Hero trip card

    @ViewBuilder
    private func nextTripCard(trip: Trip) -> some View {
        let status = trip.status
        let label = status == .active ? "Viaje en curso" : "Próximo viaje"

        VStack(alignment: .leading, spacing: 10) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(1.4)
                .foregroundStyle(Tokens.Color.textTertiary)

            NavigationLink(value: trip) {
                HStack(spacing: 14) {
                    // Cover or emoji
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(hex: 0x242424))
                        if let url = trip.coverURL, let imageURL = URL(string: url) {
                            AsyncImage(url: imageURL) { phase in
                                if let img = phase.image {
                                    img.resizable().scaledToFill()
                                }
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            Text("✈")
                                .font(.system(size: 22))
                        }
                    }
                    .frame(width: 56, height: 56)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(trip.name)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Tokens.Color.textPrimary)
                            .lineLimit(1)

                        Text(status == .active ? "En curso ahora" : countdownText(trip: trip))
                            .font(.system(size: 13))
                            .foregroundStyle(Tokens.Color.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Tokens.Color.textQuaternary)
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Tokens.Color.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .strokeBorder(Color(hex: 0x2A2A2A), lineWidth: 1)
                        )
                )
            }
            .buttonStyle(.plain)
        }
        .opacity(cardsVisible ? 1 : 0)
        .offset(y: cardsVisible ? 0 : 16)
        .animation(.easeOut(duration: 0.4).delay(0.5), value: cardsVisible)
    }

    // MARK: - CTA

    private var ctaButton: some View {
        NavigationLink(destination: EmptyView()) {
            Text("Ver todos mis viajes")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Tokens.Color.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(Tokens.Color.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .strokeBorder(Color(hex: 0x2A2A2A), lineWidth: 1)
                        )
                )
        }
        .buttonStyle(.plain)
        .opacity(cardsVisible ? 1 : 0)
        .animation(.easeOut(duration: 0.4).delay(0.6), value: cardsVisible)
    }

    // MARK: - Loading

    private var loadingView: some View {
        ProgressView()
            .tint(Tokens.Color.accentBlue)
    }

    // MARK: - Helpers

    private func heroTrip(_ trips: [Trip]) -> Trip? {
        let nonDraft = trips.filter { $0.status != .draft }
        let active = nonDraft.first { $0.status == .active }
        let next = nonDraft
            .filter { $0.status == .planned }
            .sorted { $0.startDateString < $1.startDateString }
            .first
        return active ?? next
    }

    private func countdownText(trip: Trip) -> String {
        let days = trip.daysUntilStart
        if days <= 0 { return "Empieza hoy" }
        if days == 1 { return "Mañana" }
        if days <= 6 { return "En \(days) días" }
        if days <= 13 { return "En 1 semana" }
        if days < 60 { return "En \(days / 7) semanas" }
        return "En \(days / 30) meses"
    }

    private func estimateContinents(_ count: Int) -> Int {
        if count == 0 { return 0 }
        if count <= 2 { return 1 }
        if count <= 6 { return 2 }
        if count <= 12 { return 3 }
        if count <= 20 { return 4 }
        if count <= 35 { return 5 }
        return 6
    }
}

// MARK: - StatCard

private struct StatsStatCard: View {
    let icon: String
    let label: String
    let value: Int
    var suffix: String = ""
    let accentColor: Color
    let isLoading: Bool
    let visible: Bool
    let delay: Double

    var body: some View {
        ZStack {
            if isLoading {
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color(hex: 0x1A1A1A))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .strokeBorder(Color(hex: 0x2A2A2A), lineWidth: 1)
                    )
                    .shimmer()
                    .frame(height: 110)
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    // Icon
                    ZStack {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(accentColor.opacity(0.12))
                            .frame(width: 36, height: 36)
                        Image(systemName: icon)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(accentColor)
                            .symbolRenderingMode(.hierarchical)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        if value == 0 {
                            Text("--")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundStyle(Color(hex: 0x333333))
                                .monospacedDigit()
                        } else {
                            HStack(spacing: 1) {
                                CountUpText(target: value, suffix: suffix)
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundStyle(Tokens.Color.textPrimary)
                                    .monospacedDigit()
                            }
                        }

                        Text(label.uppercased())
                            .font(.system(size: 11, weight: .medium))
                            .tracking(0.8)
                            .foregroundStyle(Tokens.Color.textTertiary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color(hex: 0x1A1A1A))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18)
                                .strokeBorder(Color(hex: 0x2A2A2A), lineWidth: 1)
                        )
                )
            }
        }
        .opacity(visible ? 1 : 0)
        .offset(y: visible ? 0 : 16)
        .animation(.easeOut(duration: 0.4).delay(delay), value: visible)
    }
}

// MARK: - Shimmer modifier (reuse or define locally)

private struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        stops: [
                            .init(color: .clear, location: 0),
                            .init(color: .white.opacity(0.06), location: 0.4),
                            .init(color: .white.opacity(0.12), location: 0.5),
                            .init(color: .white.opacity(0.06), location: 0.6),
                            .init(color: .clear, location: 1),
                        ],
                        startPoint: .init(x: phase, y: 0.3),
                        endPoint: .init(x: phase + 1, y: 0.7)
                    )
                    .frame(width: geo.size.width * 2)
                    .offset(x: geo.size.width * (phase - 0.5))
                }
                .clipShape(RoundedRectangle(cornerRadius: 18))
            )
            .onAppear {
                withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

private extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        StatsView()
            .environment(FirestoreClient())
    }
}
