import SwiftData
import SwiftUI

struct MainTabView: View {
    let user: AuthUser
    @Binding var pendingParseText: String?
    @Binding var showPendingParseForTrip: Trip?

    @Environment(\.modelContext) private var modelContext
    @Environment(NetworkMonitor.self) private var networkMonitor
    @State private var firestoreClient = FirestoreClient()
    @State private var prefetcher = OfflinePrefetcher()
    @State private var selection: Int = 0
    @State private var showTripPickerForParse = false
    @State private var availableTrips: [Trip] = []
    @State private var tabBarVisible: Bool = true
    @State private var showCreateTrip = false
    @State private var fabContext = FABContext()
    @State private var resolvingHousehold = true

    private var cacheManager: CacheManager { CacheManager(modelContext: modelContext) }

    var body: some View {
        if resolvingHousehold {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()
                ProgressView()
                    .tint(Tokens.Color.accentBlue)
            }
            .preferredColorScheme(.dark)
            .task {
                let resolved = await firestoreClient.resolveOwnerUID(user.uid)
                HouseholdConfig.ownerUID = resolved
                resolvingHousehold = false
                // Kick off initial prefetch once we know the owner UID.
                prefetcher.prefetchIfNeeded(client: firestoreClient, cache: cacheManager)
            }
        } else {
        Group {
            switch selection {
            case 0, 1:
                DashboardView(cache: cacheManager, onTripsLoaded: { trips in
                    availableTrips = trips
                    let summaries = trips.compactMap { trip -> AppGroupBridge.TripSummary? in
                        guard let id = trip.id else { return nil }
                        return AppGroupBridge.TripSummary(
                            id: id,
                            name: trip.name,
                            startDate: trip.startDate,
                            endDate: trip.endDate
                        )
                    }
                    AppGroupBridge.writeTripSummaries(summaries)
                })
            case 2:
                CatalogView(cache: cacheManager)
            default:
                SettingsView()
            }
        }
        .id(selection)
        .background(Tokens.Color.bgPrimary.ignoresSafeArea())
        // Offline banner sits above the tab bar, below the content area.
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: 0) {
                if !networkMonitor.isConnected {
                    OfflineBanner()
                }
                if tabBarVisible {
                    AtlasTabBar(
                        selection: $selection,
                        tabs: AtlasTab.mainTabs,
                        onFABTap: {
                            if let override = fabContext.overrideAction {
                                override()
                            } else {
                                showCreateTrip = true
                            }
                        }
                    )
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
        }
        .environment(firestoreClient)
        .environment(fabContext)
        .environment(networkMonitor)
        .onPreferenceChange(TabBarVisibilityKey.self) { visible in
            withAnimation(Tokens.Motion.spring) {
                tabBarVisible = visible
            }
        }
        // Trigger prefetch whenever we reconnect (especially useful on WiFi).
        .onChange(of: networkMonitor.didReconnect) { _, didReconnect in
            guard didReconnect else { return }
            networkMonitor.consumeReconnect()
            prefetcher.prefetchIfNeeded(client: firestoreClient, cache: cacheManager)
        }
        .onChange(of: pendingParseText) { _, newText in
            guard newText != nil else { return }
            showTripPickerForParse = true
        }
        .sheet(isPresented: $showCreateTrip) {
            CreateTripSheet()
                .environment(firestoreClient)
        }
        .sheet(isPresented: $showTripPickerForParse) {
            TripPickerForParseSheet(
                trips: availableTrips,
                prefillText: pendingParseText ?? ""
            ) {
                pendingParseText = nil
                showTripPickerForParse = false
            }
            .environment(firestoreClient)
        }
        } // end else (resolvingHousehold)
    }
}

// MARK: - Trip Picker Sheet (para parse desde Share Extension)

private struct TripPickerForParseSheet: View {
    let trips: [Trip]
    let prefillText: String
    let onDone: () -> Void

    @State private var selectedTrip: Trip?
    @State private var showAIParse = false
    @Environment(FirestoreClient.self) private var client

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                if trips.isEmpty {
                    Text("No hay viajes disponibles.\nCreá uno primero.")
                        .font(.system(size: 15))
                        .foregroundStyle(Tokens.Color.textSecondary)
                        .multilineTextAlignment(.center)
                } else {
                    List(trips) { trip in
                        Button {
                            selectedTrip = trip
                            showAIParse = true
                        } label: {
                            HStack {
                                Text(trip.name)
                                    .foregroundStyle(Tokens.Color.textPrimary)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundStyle(Tokens.Color.textTertiary)
                                    .font(.system(size: 12))
                            }
                        }
                        .listRowBackground(Tokens.Color.surface)
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("¿En qué viaje?")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar", action: onDone)
                        .foregroundStyle(Tokens.Color.textSecondary)
                }
            }
            .sheet(item: $selectedTrip, onDismiss: onDone) { trip in
                AIParseModal(trip: trip, prefillText: prefillText)
                    .environment(client)
            }
        }
        .preferredColorScheme(.dark)
    }
}
