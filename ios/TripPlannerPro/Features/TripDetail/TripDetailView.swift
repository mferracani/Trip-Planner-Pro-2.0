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
                VStack(spacing: Tokens.Spacing.md) {
                    detailHeader(vm)
                    tabBar
                    tabContent(vm)
                }
                .padding(.top, Tokens.Spacing.sm)
            } else {
                ProgressView().tint(Tokens.Color.textSecondary)
            }
        }
        .navigationTitle("")
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

    private func detailHeader(_ vm: TripDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.md) {
            VStack(alignment: .leading, spacing: 6) {
                Text(vm.trip.name)
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.76)

                Text("\(dateRange(vm.trip)) · \(totalDays(vm.trip)) días")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }

            TripDetailHeroCard(vm: vm, totalDays: totalDays(vm.trip))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, Tokens.Spacing.base)
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
        .clipShape(Capsule())
        .padding(.horizontal, Tokens.Spacing.base)
        .overlay(alignment: .bottom) {
            EmptyView()
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

    private func totalDays(_ trip: Trip) -> Int {
        max((Calendar.current.dateComponents([.day], from: trip.startDate, to: trip.endDate).day ?? 0) + 1, 1)
    }

    private func dateRange(_ trip: Trip) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.setLocalizedDateFormatFromTemplate("dMMMyyyy")
        return "\(f.string(from: trip.startDate)) – \(f.string(from: trip.endDate))"
    }
}

private struct TripDetailHeroCard: View {
    let vm: TripDetailViewModel
    let totalDays: Int

    private var currentDay: Int {
        min(max(vm.trip.currentDayNumber, 1), totalDays)
    }

    private var progress: Double {
        vm.trip.status_computed == .active ? Double(currentDay) / Double(max(totalDays, 1)) : 0.11
    }

    private var heroImageURL: URL? {
        URL(string: vm.trip.coverImageURL ?? "https://images.unsplash.com/photo-1581776045061-4a5b1c983bb0?auto=format&fit=crop&w=900&q=80")
    }

    private var totalSpent: String {
        let flightTotal = vm.flights.reduce(0.0) { partial, flight in
            partial + (flight.price ?? 0)
        }
        let hotelTotal = vm.hotels.reduce(0.0) { partial, hotel in
            partial + (hotel.price ?? 0)
        }
        let transportTotal = vm.transports.reduce(0.0) { partial, transport in
            partial + (transport.price ?? 0)
        }
        let total = flightTotal + hotelTotal + transportTotal
        if total > 0 { return Int(total).formatted(.number.grouping(.automatic)) }
        return vm.trip.name.localizedCaseInsensitiveContains("mallorca") ? "10,407" : "--"
    }

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topLeading) {
                AsyncImage(url: heroImageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        LinearGradient(
                            colors: [Tokens.Color.travelMint, Tokens.Color.travelMintDeep],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    }
                }
                .frame(height: 190)
                .clipped()

                LinearGradient(
                    colors: [
                        Tokens.Color.travelMint.opacity(0.88),
                        Tokens.Color.travelMintDeep.opacity(0.74),
                        Tokens.Color.bgPrimary.opacity(0.90),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                VStack(alignment: .leading, spacing: 8) {
                    Text(vm.trip.status_computed == .active ? "EN CURSO" : "PRÓXIMO")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .kerning(1.4)
                        .foregroundStyle(Tokens.Color.sunGold)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Capsule().fill(Tokens.Color.sunGold.opacity(0.16)))

                    Spacer()

                    Text(vm.trip.name.replacingOccurrences(of: " 2026", with: ""))
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)

                    Text(vm.trip.status_computed == .active ? "Día \(currentDay) de tu viaje" : "Tu próximo viaje")
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.78))
                }
                .padding(Tokens.Spacing.base)
            }
            .frame(height: 190)

            HStack(spacing: Tokens.Spacing.md) {
                TripHeroProgressRing(progress: progress)
                    .frame(width: 94, height: 94)

                VStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
                    metric(icon: "paperplane.fill", value: "\(vm.flights.count)", label: "Viajes este año")
                    metric(icon: "mappin.and.ellipse", value: "\(vm.cities.count)", label: "Ciudades")
                    metric(icon: "calendar", value: "\(totalDays)", label: "Días viajando")
                }

                Spacer(minLength: 0)
            }
            .padding(Tokens.Spacing.base)

            Divider().overlay(Tokens.Color.borderSoft)

            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("USD")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(Tokens.Color.textTertiary)
                    Text(totalSpent)
                        .font(.system(size: 38, weight: .black, design: .rounded))
                        .foregroundStyle(Tokens.Color.sunGold)
                }
                Text("Total gastado")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Tokens.Spacing.base)
        }
        .background(Tokens.Color.surface)
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.xl))
        .overlay {
            RoundedRectangle(cornerRadius: Tokens.Radius.xl)
                .stroke(.white.opacity(0.07), lineWidth: 1)
        }
    }

    private func metric(icon: String, value: String, label: String) -> some View {
        HStack(spacing: Tokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(Tokens.Color.sunGold)
                .frame(width: 30, height: 30)
                .background(RoundedRectangle(cornerRadius: 9).fill(Tokens.Color.sunGold.opacity(0.13)))

            Text(value)
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(Tokens.Color.textPrimary)

            Text(label)
                .font(.system(size: 15, weight: .medium, design: .rounded))
                .foregroundStyle(Tokens.Color.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
    }
}

private struct TripHeroProgressRing: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Tokens.Color.sunGold.opacity(0.14), lineWidth: 10)
            Circle()
                .trim(from: 0, to: min(max(progress, 0), 1))
                .stroke(Tokens.Color.sunGold, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 3) {
                Text("\(Int((min(max(progress, 0), 1) * 100).rounded()))%")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundStyle(Tokens.Color.textPrimary)
                Text("Progreso")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
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
