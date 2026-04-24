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
    @State private var showEditDates = false
    @State private var editDatesError: String?

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
        .navigationTitle(vm?.trip.name ?? trip.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: Tokens.Spacing.xs) {
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

                    Menu {
                        Button {
                            showEditDates = true
                        } label: {
                            Label("Editar fechas", systemImage: "calendar.badge.clock")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Tokens.Color.textSecondary)
                    }
                }
            }
        }
        .sheet(isPresented: $showAIParse) {
            AIParseModal(trip: trip)
                .environment(client)
        }
        .sheet(isPresented: $showEditDates) {
            if let vm {
                EditTripDatesSheet(vm: vm)
            }
        }
        .alert("No se pudieron guardar las fechas", isPresented: editDatesErrorBinding) {
            Button("OK") { editDatesError = nil }
        } message: {
            Text(editDatesError ?? "Intentá de nuevo.")
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

    private var editDatesErrorBinding: Binding<Bool> {
        Binding(
            get: { editDatesError != nil },
            set: { isPresented in
                if !isPresented { editDatesError = nil }
            }
        )
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

private struct EditTripDatesSheet: View {
    @Environment(\.dismiss) private var dismiss
    let vm: TripDetailViewModel

    @State private var startDate: Date
    @State private var endDate: Date
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(vm: TripDetailViewModel) {
        self.vm = vm
        _startDate = State(initialValue: vm.trip.startDate)
        _endDate = State(initialValue: vm.trip.endDate)
    }

    private var outOfRangeCount: Int {
        vm.outOfRangeItemCount(startDate: startDate, endDate: endDate)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Fechas") {
                    DatePicker("Inicio", selection: $startDate, displayedComponents: .date)
                    DatePicker("Fin", selection: $endDate, in: startDate..., displayedComponents: .date)
                }

                if outOfRangeCount > 0 {
                    Section {
                        Label(
                            "\(outOfRangeCount) item(s) quedarian fuera del nuevo rango.",
                            systemImage: "exclamationmark.triangle.fill"
                        )
                        .foregroundStyle(Tokens.Color.accentOrange)
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(Tokens.Color.accentRed)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Tokens.Color.bgPrimary.ignoresSafeArea())
            .navigationTitle("Editar fechas")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Guardar") { save() }
                        .disabled(isSaving)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func save() {
        isSaving = true
        errorMessage = nil

        Task {
            do {
                try await vm.updateTripDates(startDate: startDate, endDate: endDate)
                dismiss()
            } catch {
                errorMessage = "No se pudieron guardar los cambios."
            }
            isSaving = false
        }
    }
}
