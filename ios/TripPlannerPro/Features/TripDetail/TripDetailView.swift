import SwiftData
import SwiftUI

enum TripTab: String, CaseIterable {
    case calendar = "Calendario"
    case list = "Lista"
    case items = "Items"
    case costs = "Costos"

    var icon: String {
        switch self {
        case .calendar: "calendar"
        case .list: "list.bullet"
        case .items: "square.grid.2x2"
        case .costs: "dollarsign.circle"
        }
    }
}

struct TripDetailView: View {
    let trip: Trip
    @Environment(FirestoreClient.self) private var client
    @Environment(FABContext.self) private var fabContext
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @State private var vm: TripDetailViewModel?
    @State private var selectedTab: TripTab = .calendar
    @State private var showAIParse = false
    @State private var showAddItem = false
    @State private var manualFormType: ManualFormType? = nil
    @State private var showTripEdit = false
    @State private var draftStartDate: Date
    @State private var draftEndDate: Date
    @State private var isConfirmingDraft = false

    init(trip: Trip) {
        self.trip = trip
        _draftStartDate = State(initialValue: trip.startDate)
        _draftEndDate = State(initialValue: trip.endDate)
    }

    private var cityColor: Color {
        Tokens.Color.cityPalette[abs(trip.name.hashValue) % Tokens.Color.cityPalette.count]
    }

    private var tripDays: Int {
        (Calendar.current.dateComponents([.day], from: trip.startDate, to: trip.endDate).day ?? 0) + 1
    }

    var body: some View {
        ZStack {
            Tokens.Color.bgPrimary.ignoresSafeArea()
            backgroundGlow

            VStack(spacing: 0) {
                customNavBar
                compactHeroStrip
                    .padding(.horizontal, 16)
                    .padding(.bottom, 10)

                if trip.status == .draft {
                    draftBanner
                        .padding(.horizontal, 16)
                        .padding(.bottom, 10)
                }

                if let vm, vm.isOffline {
                    offlineBanner
                        .padding(.horizontal, 16)
                        .padding(.bottom, 6)
                }

                tabPills
                    .padding(.top, 4)
                    .padding(.bottom, 4)

                if let vm {
                    tabContent(vm)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    Spacer()
                    ProgressView().tint(Tokens.Color.textSecondary)
                    Spacer()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .toolbar(.hidden, for: .navigationBar)
        .hideTabBar()
        .onAppear { fabContext.overrideAction = { showAddItem = true } }
        .onDisappear { fabContext.overrideAction = nil }
        .sheet(isPresented: $showAddItem) {
            AddItemChooser(
                trip: trip,
                highlight: nil,
                onClose: { showAddItem = false },
                onSelect: { choice in
                    showAddItem = false
                    switch choice {
                    case .aiParse:
                        showAIParse = true
                    case .manual(let type):
                        manualFormType = type
                    }
                }
            )
        }
        .sheet(isPresented: $showAIParse) {
            AIParseModal(trip: trip)
                .environment(client)
        }
        .sheet(item: $manualFormType) { type in
            ManualFormSheet(trip: trip, type: type, onClose: { manualFormType = nil })
                .environment(client)
        }
        .sheet(isPresented: $showTripEdit) {
            TripEditSheet(trip: trip, onClose: { showTripEdit = false })
                .environment(client)
                .presentationBackground(Tokens.Color.bgPrimary)
        }
        .onAppear {
            let viewModel = TripDetailViewModel(
                trip: trip,
                client: client,
                cache: CacheManager(modelContext: modelContext)
            )
            vm = viewModel
            viewModel.start()
        }
        .onDisappear { vm?.stop() }
    }

    // MARK: - Draft Banner

    private var draftBanner: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header row
            HStack(spacing: 8) {
                Text("BORRADOR")
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(Tokens.Color.accentGold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(Tokens.Color.accentGold.opacity(0.14))
                            .overlay(Capsule().strokeBorder(Tokens.Color.accentGold.opacity(0.3), lineWidth: 0.5))
                    )

                Spacer()

                Button {
                    confirmDraft()
                } label: {
                    HStack(spacing: 5) {
                        if isConfirmingDraft {
                            ProgressView()
                                .tint(.black)
                                .scaleEffect(0.7)
                        } else {
                            Text("Confirmar viaje")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        if !isConfirmingDraft {
                            Image(systemName: "arrow.right")
                                .font(.system(size: 11, weight: .semibold))
                        }
                    }
                    .foregroundStyle(.black)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(Capsule().fill(Tokens.Color.accentGold))
                }
                .buttonStyle(.plain)
                .disabled(isConfirmingDraft)
            }

            // Date pickers
            VStack(spacing: 0) {
                DatePicker("Inicio (aprox.)", selection: $draftStartDate, displayedComponents: .date)
                    .font(.system(size: 14))
                    .tint(Tokens.Color.accentGold)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .onChange(of: draftStartDate) { _, newVal in
                        saveDraftDates(start: newVal, end: draftEndDate)
                    }
                Divider().overlay(Tokens.Color.borderSoft)
                DatePicker("Fin (aprox.)", selection: $draftEndDate, in: draftStartDate..., displayedComponents: .date)
                    .font(.system(size: 14))
                    .tint(Tokens.Color.accentGold)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .onChange(of: draftEndDate) { _, newVal in
                        saveDraftDates(start: draftStartDate, end: newVal)
                    }
            }
            .background(Tokens.Color.elevated)
            .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: Tokens.Radius.md)
                    .strokeBorder(Tokens.Color.accentGold.opacity(0.25), lineWidth: 1)
            )
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                .fill(Tokens.Color.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Tokens.Radius.lg)
                        .strokeBorder(Tokens.Color.accentGold.opacity(0.3), lineWidth: 1)
                )
        )
    }

    private func confirmDraft() {
        guard let tripID = trip.id else { return }
        isConfirmingDraft = true
        Task {
            try? await client.updateTripStatus(tripID: tripID, status: .planned)
            isConfirmingDraft = false
        }
    }

    private func saveDraftDates(start: Date, end: Date) {
        var updated = trip
        updated.startDateString = Trip.isoDateFormatter.string(from: start)
        updated.endDateString = Trip.isoDateFormatter.string(from: end)
        Task { try? await client.updateTrip(updated) }
    }

    // MARK: - Background

    private var backgroundGlow: some View {
        RadialGradient(
            colors: [cityColor.opacity(0.08), .clear],
            center: UnitPoint(x: 0.5, y: 0.05),
            startRadius: 10,
            endRadius: 340
        )
        .ignoresSafeArea()
    }

    // MARK: - Nav bar

    private var customNavBar: some View {
        HStack(alignment: .top) {
            Button {
                dismiss()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 15, weight: .semibold))
                    Text("Viajes")
                        .font(Tokens.Typo.strongS)
                }
                .foregroundStyle(Tokens.Color.accentBlue)
            }
            .buttonStyle(.plain)

            Spacer()

            VStack(spacing: 2) {
                Text(trip.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                Text(dateRangeText)
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .lineLimit(1)
            }

            Spacer()

            Button {
                showTripEdit = true
            } label: {
                ZStack {
                    Circle()
                        .fill(Tokens.Color.elevated)
                        .overlay(
                            Circle()
                                .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                        )
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
                .frame(width: 34, height: 34)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
        .padding(.bottom, 12)
    }

    private var dateRangeText: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.dateFormat = "d MMM"
        return "\(f.string(from: trip.startDate)) – \(f.string(from: trip.endDate))"
    }

    // MARK: - Compact hero strip (mobile)
    //
    // Matches web TripDetailPage "Mobile compact hero strip":
    // progress bar + USD total | city count | flight count + status badge.

    private var compactHeroStrip: some View {
        let today = Trip.isoDateFormatter.string(from: Date())
        let isActive = trip.startDateString <= today && trip.endDateString >= today
        let tripDay: Int = isActive
            ? (Calendar.current.dateComponents([.day], from: trip.startDate, to: .now).day ?? 0) + 1
            : 0
        let progress: Double = tripDays > 0 ? min(1.0, Double(tripDay) / Double(tripDays)) : 0
        let totalUSD = Int(vm?.grandTotalUSD.rounded() ?? trip.totalUSD?.rounded() ?? 0)
        let citiesCount = vm?.cities.count ?? trip.citiesCount ?? 0
        let flightsCount = vm?.allFlightsCount ?? 0

        return VStack(alignment: .leading, spacing: 0) {
            // Status badge
            HStack {
                statusBadge(isActive: isActive, today: today)
                Spacer()
            }
            .padding(.bottom, 8)

            // Strip card
            HStack(spacing: 12) {
                // Progress + day label
                VStack(alignment: .leading, spacing: 4) {
                    Text(isActive ? "Día \(tripDay) de \(tripDays)" : "\(tripDays) días")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Tokens.Color.textSecondary)

                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(Tokens.Color.elevated)
                                .frame(height: 4)
                            Capsule()
                                .fill(Tokens.Color.accentGreen)
                                .frame(width: geo.size.width * progress, height: 4)
                        }
                    }
                    .frame(height: 4)
                }
                .frame(maxWidth: .infinity)

                Divider()
                    .frame(width: 1, height: 32)
                    .overlay(Tokens.Color.borderSoft)

                // USD total
                VStack(alignment: .trailing, spacing: 1) {
                    Text("USD")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Text(totalUSD > 0 ? totalUSD.formatted(.number.grouping(.automatic)) : "—")
                        .font(.system(size: 18, weight: .black, design: .monospaced))
                        .foregroundStyle(Tokens.Color.accentGold)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                Divider()
                    .frame(width: 1, height: 32)
                    .overlay(Tokens.Color.borderSoft)

                // Cities count
                VStack(spacing: 1) {
                    Image(systemName: "mappin")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Tokens.Color.accentGold)
                    Text("\(citiesCount)")
                        .font(.system(size: 15, weight: .black, design: .monospaced))
                        .foregroundStyle(Tokens.Color.textPrimary)
                    Text("ciudades")
                        .font(.system(size: 9, weight: .regular))
                        .foregroundStyle(Tokens.Color.textTertiary)
                }

                Divider()
                    .frame(width: 1, height: 32)
                    .overlay(Tokens.Color.borderSoft)

                // Flights count
                VStack(spacing: 1) {
                    Image(systemName: "airplane")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Tokens.Color.accentGold)
                    Text("\(flightsCount)")
                        .font(.system(size: 15, weight: .black, design: .monospaced))
                        .foregroundStyle(Tokens.Color.textPrimary)
                    Text("vuelos")
                        .font(.system(size: 9, weight: .regular))
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Tokens.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .strokeBorder(Tokens.Color.borderSoft, lineWidth: 0.5)
                    )
            )
        }
    }

    @ViewBuilder
    private func statusBadge(isActive: Bool, today: String) -> some View {
        let isPast = trip.endDateString < today
        let (label, fg, bg): (String, Color, Color) = {
            if isActive { return ("EN CURSO", Tokens.Color.accentGreen, Tokens.Color.accentGreen.opacity(0.14)) }
            if isPast   { return ("PASADO",   Tokens.Color.textTertiary, Tokens.Color.elevated) }
            return ("PRÓXIMO", Tokens.Color.accentGold, Tokens.Color.accentGold.opacity(0.14))
        }()

        Text(label)
            .font(.system(size: 9, weight: .black, design: .monospaced))
            .tracking(Tokens.Track.labelWider)
            .foregroundStyle(fg)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                Capsule().fill(bg)
                    .overlay(Capsule().strokeBorder(fg.opacity(0.3), lineWidth: 0.5))
            )
    }

    private var budgetText: String {
        let total = Int(vm?.grandTotalUSD.rounded() ?? 0)
        if total == 0 { return "—" }
        return "USD \(total.formatted(.number.grouping(.automatic)))"
    }

    // MARK: - Tab pills

    private var tabPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(TripTab.allCases, id: \.self) { tab in
                    Button {
                        withAnimation(Tokens.Motion.snap) {
                            selectedTab = tab
                        }
                    } label: {
                        Text(tab.rawValue)
                            .font(Tokens.Typo.strongS)
                            .foregroundStyle(
                                selectedTab == tab
                                    ? Tokens.Color.textPrimary
                                    : Tokens.Color.textTertiary
                            )
                            .padding(.horizontal, 16)
                            .padding(.vertical, 9)
                            .background(
                                Capsule()
                                    .fill(
                                        selectedTab == tab
                                            ? Tokens.Color.elevated
                                            : .clear
                                    )
                                    .overlay(
                                        Capsule()
                                            .strokeBorder(
                                                selectedTab == tab
                                                    ? Tokens.Color.borderSoft
                                                    : .clear,
                                                lineWidth: 0.5
                                            )
                                    )
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
        }
        .scrollClipDisabled()
    }

    @ViewBuilder
    private func tabContent(_ vm: TripDetailViewModel) -> some View {
        switch selectedTab {
        case .calendar:
            CalendarView(vm: vm, allUserCities: vm.cities)
        case .list:
            ListView(vm: vm)
        case .items:
            ItemsView(vm: vm)
        case .costs:
            CostsView(vm: vm)
        }
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

// TripSummaryCard removed — replaced by compactHeroStrip above.
