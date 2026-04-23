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
    @Environment(UIState.self) private var uiState
    @Environment(\.dismiss) private var dismiss
    @State private var vm: TripDetailViewModel?
    @State private var selectedTab: TripTab = .calendar
    @State private var showAIParse = false
    @State private var showTripEdit = false
    @State private var showAddChooser = false
    @State private var activeManualForm: ManualFormType?

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
                tripSummary
                tabPills
                    .padding(.top, 8)
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

            // Floating AI parse button anchored bottom-right.
            // allowsHitTesting controls: Spacers are non-interactive;
            // the button itself still receives taps.
        }
        .overlay(alignment: .bottomTrailing) {
            aiSparkleButton
                .padding(.trailing, 20)
                .padding(.bottom, 24)
        }
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showAIParse) {
            AIParseModal(trip: trip)
                .environment(client)
        }
        .sheet(isPresented: $showTripEdit) {
            TripEditSheet(trip: trip, onClose: { showTripEdit = false })
                .environment(client)
                .presentationBackground(Tokens.Color.bgPrimary)
        }
        .sheet(isPresented: $showAddChooser) {
            AddItemChooser(
                trip: trip,
                highlight: highlightForCurrentTab,
                onClose: { showAddChooser = false },
                onSelect: { choice in
                    showAddChooser = false
                    // Defer: let the chooser sheet finish dismissing before
                    // presenting the next sheet. iOS blocks back-to-back
                    // sheet presentations otherwise.
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                        switch choice {
                        case .aiParse:
                            showAIParse = true
                        case .manual(let type):
                            activeManualForm = type
                        }
                    }
                }
            )
            .environment(client)
            .presentationBackground(Tokens.Color.bgPrimary)
        }
        .sheet(item: $activeManualForm) { type in
            ManualFormSheet(
                trip: trip,
                type: type,
                onClose: { activeManualForm = nil }
            )
            .environment(client)
            .presentationBackground(Tokens.Color.bgPrimary)
        }
        .onAppear {
            withAnimation(Tokens.Motion.spring) {
                uiState.tabBarVisible = false
            }
            let viewModel = TripDetailViewModel(trip: trip, client: client)
            vm = viewModel
            viewModel.start()
        }
        .onDisappear {
            withAnimation(Tokens.Motion.spring) {
                uiState.tabBarVisible = true
            }
            vm?.stop()
        }
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

    // MARK: - Trip summary (two stat cards)

    private var tripSummary: some View {
        HStack(spacing: 10) {
            TripSummaryCard(
                label: "PRESUPUESTO",
                value: budgetText,
                accent: Tokens.Color.accentBlue
            )
            TripSummaryCard(
                label: "DURACIÓN",
                value: "\(tripDays) d",
                accent: Tokens.Color.textPrimary
            )
        }
        .padding(.horizontal, 16)
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
            CalendarView(vm: vm)
        case .list:
            ListView(vm: vm)
        case .items:
            ItemsView(vm: vm)
        case .costs:
            CostsView(vm: vm)
        }
    }

    // MARK: - Add FAB
    //
    // Contextual add button — opens the AddItemChooser. When the active tab
    // is "Costos" the chooser highlights the Expense row so the primary
    // action aligns with where the user is.

    private var highlightForCurrentTab: ManualFormType? {
        selectedTab == .costs ? .expense : nil
    }

    private var aiSparkleButton: some View {
        Button {
            let h = UIImpactFeedbackGenerator(style: .medium)
            h.impactOccurred()
            showAddChooser = true
        } label: {
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(
                        LinearGradient(
                            colors: [
                                Tokens.Color.accentBlue,
                                Color(hex: 0xE8A94A)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 54, height: 54)
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .strokeBorder(.white.opacity(0.25), lineWidth: 0.8)
                    )
                    .shadow(color: Tokens.Color.accentBlue.opacity(0.55), radius: 18, x: 0, y: 8)

                Image(systemName: "plus")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(Tokens.Color.bgPrimary)
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - TripSummaryCard

private struct TripSummaryCard: View {
    let label: String
    let value: String
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .tracking(Tokens.Track.labelWider)
                .foregroundStyle(Tokens.Color.textTertiary)
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
                .tracking(-0.4)
                .foregroundStyle(accent)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 14)
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
