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
    @State private var vm: TripDetailViewModel?
    @State private var selectedTab: TripTab = .calendar
    @State private var showAIParse = false

    var body: some View {
        ZStack {
            Tokens.Color.bgPrimary.ignoresSafeArea()

            if let vm {
                VStack(spacing: 0) {
                    tabBar
                    tabContent(vm)
                }
            } else {
                ProgressView().tint(Tokens.Color.textSecondary)
            }
        }
        .navigationTitle(trip.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showAIParse = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "sparkles")
                        Text("IA")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundStyle(Tokens.Color.accentPurple)
                }
            }
        }
        .sheet(isPresented: $showAIParse) {
            AIParseModal(trip: trip)
                .environment(client)
        }
        .onAppear {
            let viewModel = TripDetailViewModel(trip: trip, client: client)
            vm = viewModel
            viewModel.start()
        }
        .onDisappear { vm?.stop() }
    }

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(TripTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: Tokens.Motion.fast)) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 14, weight: .medium))
                        Text(tab.rawValue)
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundStyle(selectedTab == tab ? Tokens.Color.accentBlue : Tokens.Color.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Tokens.Spacing.sm)
                    .overlay(alignment: .bottom) {
                        if selectedTab == tab {
                            Rectangle()
                                .fill(Tokens.Color.accentBlue)
                                .frame(height: 2)
                                .matchedGeometryEffect(id: "tab_indicator", in: tabNamespace)
                        }
                    }
                }
            }
        }
        .background(Tokens.Color.surface)
        .overlay(alignment: .bottom) {
            Divider().background(Tokens.Color.border)
        }
    }

    @Namespace private var tabNamespace

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
