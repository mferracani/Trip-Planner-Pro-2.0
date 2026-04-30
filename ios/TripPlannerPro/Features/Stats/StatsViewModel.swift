import Foundation
import Observation

// MARK: - TravelStats

struct TravelStats: Sendable {
    var countries: Int = 0
    var cities: Int = 0
    var flights: Int = 0
    var days: Int = 0
    var hotelNights: Int = 0
    var kmTraveled: Int = 0
    var countryMarkers: [(lat: Double, lng: Double)] = []
}

// MARK: - Country coords (top 50 travel countries)

private let countryCoords: [String: (lat: Double, lng: Double)] = [
    "AR": (-34.6, -58.4), "ES": (40.4, -3.7), "FR": (48.8, 2.3), "IT": (41.9, 12.5),
    "US": (37.1, -95.7), "BR": (-15.8, -47.9), "DE": (52.5, 13.4), "GB": (51.5, -0.1),
    "JP": (35.7, 139.7), "AU": (-35.3, 149.1), "MX": (19.4, -99.1), "PT": (38.7, -9.1),
    "CL": (-33.4, -70.6), "CO": (4.7, -74.1), "PE": (-12.0, -77.0), "UY": (-34.9, -56.2),
    "CA": (45.4, -75.7), "CN": (39.9, 116.4), "TH": (13.8, 100.5), "NL": (52.4, 4.9),
    "GR": (37.9, 23.7), "HR": (45.8, 16.0), "CZ": (50.1, 14.4), "AT": (48.2, 16.4),
    "CH": (46.9, 7.4), "BE": (50.8, 4.4), "SE": (59.3, 18.1), "NO": (59.9, 10.7),
    "DK": (55.7, 12.6), "PL": (52.2, 21.0), "HU": (47.5, 19.0), "RO": (44.4, 26.1),
    "TR": (39.9, 32.9), "EG": (30.1, 31.2), "MA": (33.9, -6.9), "ZA": (-25.7, 28.2),
    "KE": (-1.3, 36.8), "IN": (28.6, 77.2), "SG": (1.4, 103.8), "ID": (-6.2, 106.8),
    "NZ": (-41.3, 174.8), "IS": (64.1, -21.9), "IE": (53.3, -6.3), "FI": (60.2, 24.9),
    "SK": (48.1, 17.1), "SI": (46.1, 14.5), "BA": (43.8, 18.4), "RS": (44.8, 20.5),
    "ME": (42.4, 19.3), "CU": (23.1, -82.4),
]

// MARK: - Haversine

private func haversineKm(lat1: Double, lng1: Double, lat2: Double, lng2: Double) -> Double {
    let R = 6371.0
    let dLat = (lat2 - lat1) * .pi / 180
    let dLng = (lng2 - lng1) * .pi / 180
    let a = sin(dLat / 2) * sin(dLat / 2)
        + cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180)
        * sin(dLng / 2) * sin(dLng / 2)
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))
}

// MARK: - StatsViewModel

@MainActor
@Observable
final class StatsViewModel {
    private(set) var stats = TravelStats()
    private(set) var trips: [Trip] = []
    private(set) var isLoading = true
    private(set) var error: Error?

    private let client: FirestoreClient
    private var streamTask: Task<Void, Never>?

    init(client: FirestoreClient) {
        self.client = client
    }

    func start() {
        streamTask?.cancel()
        streamTask = Task {
            do {
                for try await fetchedTrips in try client.tripsStream() {
                    guard !Task.isCancelled else { break }
                    trips = fetchedTrips
                    await computeStats(fetchedTrips)
                    isLoading = false
                }
            } catch {
                guard !Task.isCancelled else { return }
                self.error = error
                isLoading = false
            }
        }
    }

    func stop() {
        streamTask?.cancel()
    }

    // MARK: - Stats computation

    private func computeStats(_ trips: [Trip]) async {
        var allCities: [TripCity] = []
        var allFlights: [Flight] = []
        var allHotels: [Hotel] = []

        await withTaskGroup(of: (cities: [TripCity], flights: [Flight], hotels: [Hotel]).self) { group in
            for trip in trips {
                guard let tripId = trip.id else { continue }
                group.addTask { [weak self] in
                    guard let self else { return ([], [], []) }
                    async let cities = (try? self.fetchCities(tripId: tripId)) ?? []
                    async let flights = (try? self.fetchFlights(tripId: tripId)) ?? []
                    async let hotels = (try? self.fetchHotels(tripId: tripId)) ?? []
                    return await (cities, flights, hotels)
                }
            }
            for await result in group {
                allCities.append(contentsOf: result.cities)
                allFlights.append(contentsOf: result.flights)
                allHotels.append(contentsOf: result.hotels)
            }
        }

        // Countries
        let countryCodes = Set(allCities.compactMap { $0.countryCode?.uppercased() })

        // Unique cities
        let uniqueCities = Set(allCities.map { $0.name.lowercased().trimmingCharacters(in: .whitespaces) })

        // Days (non-draft trips)
        let calendar = Calendar.current
        var totalDays = 0
        let iso = Trip.isoDateFormatter
        for trip in trips {
            guard trip.status != .draft,
                  !trip.startDateString.isEmpty,
                  !trip.endDateString.isEmpty,
                  let start = iso.date(from: trip.startDateString),
                  let end = iso.date(from: trip.endDateString)
            else { continue }
            let diff = calendar.dateComponents([.day], from: start, to: end).day ?? 0
            totalDays += max(0, diff + 1)
        }

        // Hotel nights
        let hotelNights = allHotels.reduce(0) { $0 + max(0, $1.nights) }

        // km traveled (no airport coords — use 0 for now; real data comes from Firestore airports collection)
        // Since we don't fetch airport coords here, we skip km calculation
        // The stat will show 0 until airports data is available
        let kmTraveled = 0

        // Globe markers
        let markers = countryCodes.compactMap { code -> (lat: Double, lng: Double)? in
            countryCoords[code]
        }

        stats = TravelStats(
            countries: countryCodes.count,
            cities: uniqueCities.count,
            flights: allFlights.count,
            days: totalDays,
            hotelNights: hotelNights,
            kmTraveled: kmTraveled,
            countryMarkers: markers
        )
    }

    // MARK: - One-shot fetchers (no stream needed for stats)

    private func fetchCities(tripId: String) async throws -> [TripCity] {
        var result: [TripCity] = []
        for try await cities in try client.citiesStream(tripID: tripId) {
            result = cities
            break
        }
        return result
    }

    private func fetchFlights(tripId: String) async throws -> [Flight] {
        var result: [Flight] = []
        for try await flights in try client.flightsStream(tripID: tripId) {
            result = flights
            break
        }
        return result
    }

    private func fetchHotels(tripId: String) async throws -> [Hotel] {
        var result: [Hotel] = []
        for try await hotels in try client.hotelsStream(tripID: tripId) {
            result = hotels
            break
        }
        return result
    }
}
