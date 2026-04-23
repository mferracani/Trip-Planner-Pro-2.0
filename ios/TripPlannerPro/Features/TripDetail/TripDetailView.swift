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
    @Environment(\.dismiss) private var dismiss
    @State private var vm: TripDetailViewModel?
    @State private var selectedTab: TripTab = .calendar
    @State private var showAIParse = false
    @State private var showTripEdit = false

    @Namespace private var tabNamespace

    private var cityColor: Color {
        Tokens.Color.cityPalette[abs(trip.name.hashValue) % Tokens.Color.cityPalette.count]
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            AtmosphericBackground(accent: cityColor, intensity: 0.06)

            VStack(spacing: 0) {
                customNavBar
                tabBar
                Hairline()
                if let vm {
                    tabContent(vm)
                } else {
                    Spacer()
                    ProgressView().tint(Tokens.Color.textSecondary)
                    Spacer()
                }
            }

            // Floating AI parse button
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    SparklesFAB {
                        showAIParse = true
                    }
                    .padding(.trailing, 20)
                    .padding(.bottom, 24)
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .hideCompassNav()
        .sheet(isPresented: $showAIParse) {
            AIParseModal(trip: trip)
                .environment(client)
        }
        .sheet(isPresented: $showTripEdit) {
            TripEditSheet(trip: trip, onClose: { showTripEdit = false })
                .environment(client)
                .presentationBackground(Tokens.Color.bgPrimary)
        }
        .onAppear {
            let viewModel = TripDetailViewModel(trip: trip, client: client)
            vm = viewModel
            viewModel.start()
        }
        .onDisappear { vm?.stop() }
    }

    // MARK: - Custom nav bar

    private var customNavBar: some View {
        HStack(spacing: 12) {
            Button {
                dismiss()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                    Text("Viajes")
                        .font(Tokens.Typo.strongS)
                }
                .foregroundStyle(Tokens.Color.accentBlue)
            }
            .buttonStyle(.plain)

            Spacer()

            CircleIconButton(systemImage: "pencil", size: 32, iconSize: 13) {
                showTripEdit = true
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
        .padding(.bottom, 12)
    }

    // MARK: - Tab bar

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(TripTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.18)) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 6) {
                        Text(tab.rawValue.uppercased())
                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                            .tracking(Tokens.Track.labelWidest)
                            .foregroundStyle(selectedTab == tab ? Tokens.Color.textPrimary : Tokens.Color.textTertiary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)

                        ZStack {
                            Rectangle()
                                .fill(.clear)
                                .frame(height: 1.5)
                            if selectedTab == tab {
                                Rectangle()
                                    .fill(Tokens.Color.textPrimary)
                                    .frame(height: 1.5)
                                    .matchedGeometryEffect(id: "tab_indicator", in: tabNamespace)
                            }
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
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
}
