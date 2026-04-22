import SwiftUI

struct DashboardView: View {
    @Environment(FirestoreClient.self) private var client
    @State private var vm: DashboardViewModel?
    @State private var showCreateTrip = false
    @State private var now = Date()

    private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                if let vm {
                    content(vm)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showCreateTrip = true
                    } label: {
                        Image(systemName: "plus")
                            .foregroundStyle(Tokens.Color.accentBlue)
                    }
                }
            }
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
            let viewModel = DashboardViewModel(client: client)
            vm = viewModel
            viewModel.start()
        }
        .onDisappear { vm?.stop() }
        .onReceive(timer) { now = $0 }
    }

    @ViewBuilder
    private func content(_ vm: DashboardViewModel) -> some View {
        ScrollView {
            LazyVStack(spacing: Tokens.Spacing.lg, pinnedViews: []) {
                headerSection(vm)

                if vm.isLoading {
                    ProgressView()
                        .tint(Tokens.Color.textSecondary)
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else if vm.trips.isEmpty {
                    emptyState
                } else {
                    tripSections(vm)
                }
            }
            .padding(.horizontal, Tokens.Spacing.base)
            .padding(.bottom, Tokens.Spacing.xl)
        }
    }

    private func headerSection(_ vm: DashboardViewModel) -> some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
            Text(vm.greeting)
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(Tokens.Color.textPrimary)

            if let countdown = vm.countdownText {
                HStack(spacing: Tokens.Spacing.xs) {
                    Image(systemName: "clock")
                        .font(.system(size: 12))
                    Text(countdown)
                        .font(.system(size: 14, weight: .medium))
                }
                .foregroundStyle(vm.countdownUrgent ? Tokens.Color.accentGreen : Tokens.Color.textSecondary)
                .padding(.horizontal, Tokens.Spacing.sm)
                .padding(.vertical, Tokens.Spacing.xs)
                .background(
                    RoundedRectangle(cornerRadius: Tokens.Radius.pill)
                        .fill(vm.countdownUrgent
                              ? Tokens.Color.accentGreen.opacity(0.15)
                              : Tokens.Color.surface)
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, Tokens.Spacing.md)
    }

    @ViewBuilder
    private func tripSections(_ vm: DashboardViewModel) -> some View {
        if !vm.activeTrips.isEmpty {
            TripSection(title: "En curso", trips: vm.activeTrips)
        }
        if !vm.plannedTrips.isEmpty {
            TripSection(title: "Próximos", trips: vm.plannedTrips)
        }
        if !vm.pastTrips.isEmpty {
            TripSection(title: "Pasados", trips: vm.pastTrips)
        }
    }

    private var emptyState: some View {
        VStack(spacing: Tokens.Spacing.md) {
            Image(systemName: "airplane.departure")
                .font(.system(size: 40, weight: .light))
                .foregroundStyle(Tokens.Color.textTertiary)
            Text("No tenés viajes aún")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Tokens.Color.textSecondary)
            Text("Tocá + para crear el primero")
                .font(.system(size: 14))
                .foregroundStyle(Tokens.Color.textTertiary)
        }
        .frame(maxWidth: .infinity, minHeight: 260)
    }
}

// MARK: - TripSection

private struct TripSection: View {
    let title: String
    let trips: [Trip]

    var body: some View {
        VStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Tokens.Color.textTertiary)
                .kerning(0.8)

            ForEach(trips) { trip in
                NavigationLink(value: trip) {
                    TripCard(trip: trip)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// MARK: - TripCard

private struct TripCard: View {
    let trip: Trip

    private var cityColor: Color {
        Tokens.Color.cityPalette[abs(trip.name.hashValue) % Tokens.Color.cityPalette.count]
    }

    var body: some View {
        HStack(spacing: Tokens.Spacing.md) {
            RoundedRectangle(cornerRadius: Tokens.Radius.sm)
                .fill(cityColor.opacity(0.2))
                .frame(width: 48, height: 48)
                .overlay {
                    Image(systemName: "airplane")
                        .font(.system(size: 20))
                        .foregroundStyle(cityColor)
                }

            VStack(alignment: .leading, spacing: 4) {
                Text(trip.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textPrimary)

                Text(dateRange(trip))
                    .font(.system(size: 13))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Tokens.Color.textTertiary)
        }
        .padding(Tokens.Spacing.md)
        .background(RoundedRectangle(cornerRadius: Tokens.Radius.md).fill(Tokens.Color.surface))
    }

    private func dateRange(_ trip: Trip) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.setLocalizedDateFormatFromTemplate("dMMM")
        return "\(f.string(from: trip.startDate)) – \(f.string(from: trip.endDate))"
    }
}

// MARK: - CreateTripSheet (minimal)

private struct CreateTripSheet: View {
    @Environment(FirestoreClient.self) private var client
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var startDate = Date()
    @State private var endDate = Calendar.current.date(byAdding: .day, value: 7, to: Date())!
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Viaje") {
                    TextField("Nombre", text: $name)
                    DatePicker("Inicio", selection: $startDate, displayedComponents: .date)
                    DatePicker("Fin", selection: $endDate, in: startDate..., displayedComponents: .date)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Tokens.Color.bgPrimary.ignoresSafeArea())
            .navigationTitle("Nuevo viaje")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Crear") { save() }
                        .disabled(name.isEmpty || isSaving)
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
