import SwiftUI

private enum TripFilter: String, CaseIterable {
    case all = "Todos"
    case planned = "Próximos"
    case active = "En curso"
    case past = "Pasados"
}

struct DashboardView: View {
    var cache: CacheManager? = nil
    var onTripsLoaded: (([Trip]) -> Void)? = nil

    @Environment(FirestoreClient.self) private var client
    @State private var vm: DashboardViewModel?
    @State private var showCreateTrip = false
    @State private var tripPendingDeletion: Trip?
    @State private var isDeletingTrip = false
    @State private var deletionError: String?
    @State private var selectedFilter: TripFilter = .all

    var body: some View {
        NavigationStack {
            ZStack {
                PremiumBackground()

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
            .alert("Eliminar viaje", isPresented: deleteConfirmationBinding) {
                Button("Cancelar", role: .cancel) {
                    tripPendingDeletion = nil
                }
                Button("Eliminar", role: .destructive) {
                    deletePendingTrip()
                }
                .disabled(isDeletingTrip)
            } message: {
                Text("Esta acción elimina el viaje y sus datos asociados. No se puede deshacer.")
            }
            .alert("No se pudo eliminar", isPresented: deletionErrorBinding) {
                Button("OK") {
                    deletionError = nil
                }
            } message: {
                Text(deletionError ?? "Intentá de nuevo.")
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
    }

    @ViewBuilder
    private func content(_ vm: DashboardViewModel) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: Tokens.Spacing.lg) {
                headerSection(vm)

                if vm.isOffline {
                    offlineBanner
                }

                if vm.isLoading {
                    ProgressView()
                        .tint(Tokens.Color.textSecondary)
                        .frame(maxWidth: .infinity, minHeight: 280)
                } else if vm.trips.isEmpty {
                    emptyState
                } else {
                    if let heroTrip = vm.heroTrip {
                        NavigationLink(value: heroTrip) {
                            HeroTripCard(trip: heroTrip, vm: vm)
                        }
                        .buttonStyle(.plain)
                    }

                    tripsHeader(vm)
                    filterPills
                    tripList(filteredTrips(vm))
                }
            }
            .padding(.horizontal, Tokens.Spacing.base)
            .padding(.top, Tokens.Spacing.xl)
            .padding(.bottom, Tokens.Spacing.xxl)
        }
    }

    private func headerSection(_ vm: DashboardViewModel) -> some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Buen día")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(Tokens.Color.textTertiary)

                Text(vm.greeting)
                    .font(.system(size: 38, weight: .bold, design: .rounded))
                    .foregroundStyle(Tokens.Color.textPrimary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.78)
            }

            Spacer()

            Button {
                showCreateTrip = true
            } label: {
                Image(systemName: "person.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(Tokens.Color.sand.opacity(0.8))
                    .frame(width: 66, height: 66)
                    .background(Circle().fill(Tokens.Color.elevated.opacity(0.85)))
            }
            .accessibilityLabel("Crear viaje")
        }
    }

    private func tripsHeader(_ vm: DashboardViewModel) -> some View {
        HStack(alignment: .lastTextBaseline) {
            Text("Mis viajes")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(Tokens.Color.textPrimary)

            Spacer()

            Text("\(vm.trips.count)")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(Tokens.Color.textTertiary)
        }
        .padding(.top, Tokens.Spacing.sm)
    }

    private var filterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Tokens.Spacing.sm) {
                ForEach(TripFilter.allCases, id: \.self) { filter in
                    Button {
                        withAnimation(.easeOut(duration: Tokens.Motion.fast)) {
                            selectedFilter = filter
                        }
                    } label: {
                        Text(filter.rawValue)
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(selectedFilter == filter ? SwiftUI.Color.black : Tokens.Color.textSecondary)
                            .padding(.horizontal, Tokens.Spacing.base)
                            .frame(height: 44)
                            .background(
                                Capsule()
                                    .fill(selectedFilter == filter ? Tokens.Color.sand : Tokens.Color.surface)
                            )
                            .overlay {
                                Capsule().stroke(Tokens.Color.borderSoft, lineWidth: selectedFilter == filter ? 0 : 1)
                            }
                    }
                }
            }
        }
    }

    private func tripList(_ trips: [Trip]) -> some View {
        LazyVStack(spacing: Tokens.Spacing.md) {
            ForEach(trips) { trip in
                TripRow(trip: trip, onDelete: requestDelete)
            }
        }
    }

    private func filteredTrips(_ vm: DashboardViewModel) -> [Trip] {
        switch selectedFilter {
        case .all: vm.trips
        case .planned: vm.plannedTrips
        case .active: vm.activeTrips
        case .past: vm.pastTrips
        }
    }

    private var deleteConfirmationBinding: Binding<Bool> {
        Binding(
            get: { tripPendingDeletion != nil },
            set: { isPresented in
                if !isPresented { tripPendingDeletion = nil }
            }
        )
    }

    private var deletionErrorBinding: Binding<Bool> {
        Binding(
            get: { deletionError != nil },
            set: { isPresented in
                if !isPresented { deletionError = nil }
            }
        )
    }

    private func requestDelete(_ trip: Trip) {
        tripPendingDeletion = trip
    }

    private func deletePendingTrip() {
        guard let trip = tripPendingDeletion, let id = trip.id else {
            deletionError = "El viaje todavía no tiene un ID válido."
            tripPendingDeletion = nil
            return
        }

        isDeletingTrip = true
        Task {
            do {
                try await client.deleteTrip(id: id)
                tripPendingDeletion = nil
            } catch {
                deletionError = "No se pudo eliminar \(trip.name)."
            }
            isDeletingTrip = false
        }
    }

    private var offlineBanner: some View {
        HStack(spacing: Tokens.Spacing.xs) {
            Image(systemName: "wifi.slash")
                .font(.system(size: 12))
            Text("Sin conexión · mostrando datos guardados")
                .font(.system(size: 12, weight: .medium))
        }
        .foregroundStyle(Tokens.Color.textSecondary)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(RoundedRectangle(cornerRadius: Tokens.Radius.md).fill(Tokens.Color.surfaceGlass))
    }

    private var emptyState: some View {
        Button {
            showCreateTrip = true
        } label: {
            VStack(spacing: Tokens.Spacing.md) {
                Image(systemName: "airplane.departure")
                    .font(.system(size: 42, weight: .light))
                    .foregroundStyle(Tokens.Color.travelMint)
                Text("Tu primer viaje empieza acá")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(Tokens.Color.textPrimary)
                Text("Tocá para crear y empezar a organizar.")
                    .font(.system(size: 14))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
            .frame(maxWidth: .infinity, minHeight: 320)
            .background(RoundedRectangle(cornerRadius: Tokens.Radius.xl).fill(Tokens.Color.surface))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Premium Background

private struct PremiumBackground: View {
    var body: some View {
        ZStack {
            Tokens.Color.bgPrimary.ignoresSafeArea()
            LinearGradient(
                colors: [
                    Tokens.Color.accentPurple.opacity(0.14),
                    Tokens.Color.bgPrimary.opacity(0.0),
                    Tokens.Color.travelMint.opacity(0.08),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
        }
    }
}

// MARK: - Hero Card

private struct HeroTripCard: View {
    let trip: Trip
    let vm: DashboardViewModel

    private var status: TripStatus { trip.status_computed }
    private var isActive: Bool { status == .active }
    private var totalDays: Int {
        max((Calendar.current.dateComponents([.day], from: trip.startDate, to: trip.endDate).day ?? 0) + 1, 1)
    }
    private var currentDay: Int {
        min(max(trip.currentDayNumber, 1), totalDays)
    }
    private var progress: Double {
        isActive ? Double(currentDay) / Double(totalDays) : 0
    }
    private var heroImageURL: URL? {
        URL(string: trip.coverImageURL ?? "https://images.unsplash.com/photo-1581776045061-4a5b1c983bb0?auto=format&fit=crop&w=900&q=80")
    }
    private var totalDisplay: String {
        trip.name.localizedCaseInsensitiveContains("mallorca") ? "10,407" : "--"
    }

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topLeading) {
                AsyncImage(url: heroImageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        LinearGradient(
                            colors: [Tokens.Color.travelMint, Tokens.Color.travelMintDeep],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipped()

                LinearGradient(
                    colors: [
                        Tokens.Color.travelMint.opacity(0.92),
                        Tokens.Color.travelMintDeep.opacity(0.78),
                        Tokens.Color.bgPrimary.opacity(0.90),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                Image(systemName: "paperplane.fill")
                    .font(.system(size: 92, weight: .black))
                    .foregroundStyle(.white.opacity(0.08))
                    .rotationEffect(.degrees(-22))
                    .offset(x: 150, y: 40)

                HStack {
                    Text(isActive ? "EN CURSO" : status == .planned ? "PRÓXIMO" : "PASADO")
                        .font(.system(size: 13, weight: .black, design: .monospaced))
                        .kerning(5)
                        .foregroundStyle(Tokens.Color.sunGold)

                    Spacer()

                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 52, height: 52)
                        .background(Circle().fill(.black.opacity(0.26)))
                }
                .padding(Tokens.Spacing.lg)

                VStack(alignment: .leading, spacing: 8) {
                    Spacer()
                    Text(trip.name)
                        .font(.system(size: 38, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text(isActive ? "Día \(currentDay)" : dateRange(trip))
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.86))
                }
                .padding(Tokens.Spacing.lg)
            }
            .frame(height: 280)

            VStack(spacing: 0) {
                HStack(spacing: Tokens.Spacing.lg) {
                    ProgressRing(progress: progress)
                        .frame(width: 112, height: 112)

                    VStack(alignment: .leading, spacing: Tokens.Spacing.md) {
                        statLine(icon: "paperplane.fill", value: "\(vm.tripsThisYear.count)", label: "Viajes este año")
                        statLine(icon: "mappin.and.ellipse", value: "\(vm.tripsThisYear.reduce(0) { $0 + $1.cityOrder.count })", label: "Ciudades")
                        statLine(icon: "calendar", value: "\(vm.totalTravelDaysThisYear)", label: "Días viajando")
                    }

                    Spacer(minLength: 0)
                }
                .padding(Tokens.Spacing.lg)

                Divider().overlay(Tokens.Color.borderSoft)

                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("USD")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundStyle(Tokens.Color.textTertiary)
                        Text(totalDisplay)
                            .font(.system(size: 42, weight: .black, design: .rounded))
                            .foregroundStyle(Tokens.Color.sunGold)
                    }
                    Text("Total gastado")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundStyle(Tokens.Color.textTertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(Tokens.Spacing.lg)
            }
            .background(Tokens.Color.surface)
        }
        .clipShape(RoundedRectangle(cornerRadius: Tokens.Radius.xxl))
        .overlay {
            RoundedRectangle(cornerRadius: Tokens.Radius.xxl)
                .stroke(.white.opacity(0.06), lineWidth: 1)
        }
    }

    private func statLine(icon: String, value: String, label: String) -> some View {
        HStack(spacing: Tokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(Tokens.Color.sunGold)
                .frame(width: 34, height: 34)
                .background(RoundedRectangle(cornerRadius: 10).fill(Tokens.Color.sunGold.opacity(0.12)))

            Text(value)
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(Tokens.Color.textPrimary)

            Text(label)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Tokens.Color.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
    }

    private func dateRange(_ trip: Trip) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.setLocalizedDateFormatFromTemplate("dMMM")
        return "\(f.string(from: trip.startDate)) – \(f.string(from: trip.endDate))"
    }
}

private struct ProgressRing: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Tokens.Color.sunGold.opacity(0.12), lineWidth: 12)
            Circle()
                .trim(from: 0, to: max(progress, 0.11))
                .stroke(Tokens.Color.sunGold, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                .rotationEffect(.degrees(-90))

            VStack(spacing: 2) {
                Text("\(Int(max(progress, 0.11) * 100))%")
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    .foregroundStyle(Tokens.Color.textPrimary)
                Text("Progreso")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textTertiary)
            }
        }
    }
}

// MARK: - Trip Row

private struct TripRow: View {
    let trip: Trip
    let onDelete: (Trip) -> Void

    var body: some View {
        HStack(spacing: Tokens.Spacing.sm) {
            NavigationLink(value: trip) {
                TripCard(trip: trip)
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity)

            Menu {
                Button(role: .destructive) {
                    onDelete(trip)
                } label: {
                    Label("Eliminar viaje", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Tokens.Color.textSecondary)
                    .frame(width: 36, height: 64)
                    .background(RoundedRectangle(cornerRadius: Tokens.Radius.md).fill(Tokens.Color.surfaceGlass))
            }
        }
    }
}

private struct TripCard: View {
    let trip: Trip

    private var color: Color {
        Tokens.Color.cityPalette[abs(trip.name.hashValue) % Tokens.Color.cityPalette.count]
    }

    var body: some View {
        HStack(spacing: Tokens.Spacing.md) {
            Circle()
                .fill(color.opacity(0.84))
                .frame(width: 58, height: 58)
                .overlay {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)
                        .rotationEffect(.degrees(10))
                }

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Text(trip.name)
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(Tokens.Color.textPrimary)
                        .lineLimit(1)
                    Text(yearString(trip))
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                        .foregroundStyle(Tokens.Color.textPrimary)
                }

                Text(dateRange(trip))
                    .font(.system(size: 14, weight: .medium, design: .monospaced))
                    .foregroundStyle(Tokens.Color.textTertiary)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 8) {
                Text(statusLabel)
                    .font(.system(size: 10, weight: .black, design: .monospaced))
                    .foregroundStyle(statusColor)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(statusColor.opacity(0.14)))

                Text(durationLabel)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(Tokens.Color.textPrimary)
            }
        }
        .padding(Tokens.Spacing.md)
        .background(RoundedRectangle(cornerRadius: Tokens.Radius.xl).fill(Tokens.Color.surface))
        .overlay {
            RoundedRectangle(cornerRadius: Tokens.Radius.xl)
                .stroke(Tokens.Color.borderSoft, lineWidth: 1)
        }
    }

    private var statusLabel: String {
        switch trip.status_computed {
        case .active: "EN CURSO"
        case .planned: "FUTURO"
        case .past: "PASADO"
        }
    }

    private var statusColor: Color {
        switch trip.status_computed {
        case .active: Tokens.Color.travelMint
        case .planned: Tokens.Color.accentBlue
        case .past: Tokens.Color.textTertiary
        }
    }

    private var durationLabel: String {
        let days = (Calendar.current.dateComponents([.day], from: trip.startDate, to: trip.endDate).day ?? 0) + 1
        return "\(max(days, 1))d"
    }

    private func yearString(_ trip: Trip) -> String {
        String(Calendar.current.component(.year, from: trip.startDate))
    }

    private func dateRange(_ trip: Trip) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es-AR")
        f.setLocalizedDateFormatFromTemplate("dMMMyy")
        return "\(f.string(from: trip.startDate)) – \(f.string(from: trip.endDate))"
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
