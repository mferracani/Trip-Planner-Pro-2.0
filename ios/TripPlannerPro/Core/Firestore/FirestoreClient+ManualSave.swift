import FirebaseFirestore
import Foundation

extension FirestoreClient {

    // Saves a manually entered Flight to Firestore.
    func saveManualFlight(_ flight: Flight, tripID: String) throws {
        try userCollection("trips")
            .document(tripID)
            .collection("flights")
            .addDocument(from: flight)
    }

    // Saves a manually entered Hotel to Firestore.
    func saveManualHotel(_ hotel: Hotel, tripID: String) throws {
        try userCollection("trips")
            .document(tripID)
            .collection("hotels")
            .addDocument(from: hotel)
    }

    // Saves a manually entered Transport to Firestore.
    func saveManualTransport(_ transport: Transport, tripID: String) throws {
        try userCollection("trips")
            .document(tripID)
            .collection("transports")
            .addDocument(from: transport)
    }

    // Saves a manually entered Expense to Firestore.
    func saveManualExpense(_ expense: Expense, tripID: String) throws {
        try userCollection("trips")
            .document(tripID)
            .collection("expenses")
            .addDocument(from: expense)
    }

    // Creates a pre-configured demo trip with 2 cities, 2 flights and 1 hotel.
    func createDemoTrip() async throws {
        let tripsRef = try userCollection("trips")
        let tripDoc = tripsRef.document()
        let tripID = tripDoc.documentID

        let cal = Calendar(identifier: .gregorian)
        var comps = DateComponents()
        comps.year = 2026; comps.month = 6; comps.day = 23
        let start = cal.date(from: comps)!
        comps.month = 7; comps.day = 8
        let end = cal.date(from: comps)!

        let trip = Trip(name: "Europa — Demo", startDate: start, endDate: end)
        try tripDoc.setData(from: trip)

        // Cities
        let madridDays = (24...30).map { "2026-06-\(String(format: "%02d", $0))" }
        let barcelonaDays = (1...8).map { "2026-07-\(String(format: "%02d", $0))" }

        let madrid = TripCity(id: nil, tripId: tripID, name: "Madrid",
                              country: "España", countryCode: "ES",
                              color: "#FF6422", days: madridDays,
                              lat: 40.4168, lng: -3.7038, timezone: "Europe/Madrid")
        let barcelona = TripCity(id: nil, tripId: tripID, name: "Barcelona",
                                 country: "España", countryCode: "ES",
                                 color: "#4ECDC4", days: barcelonaDays,
                                 lat: 41.3851, lng: 2.1734, timezone: "Europe/Madrid")

        let citiesRef = tripDoc.collection("cities")
        try citiesRef.addDocument(from: madrid)
        try citiesRef.addDocument(from: barcelona)

        // Flights
        let dep1UTC = ISO8601DateFormatter().date(from: "2026-06-24T00:35:00Z") ?? start
        let arr1UTC = ISO8601DateFormatter().date(from: "2026-06-24T16:20:00Z") ?? start
        let flight1 = Flight(tripId: tripID, airline: "Iberia", flightNumber: "IB6844",
                             originIATA: "EZE", destinationIATA: "MAD",
                             departureLocalTime: "2026-06-23T21:35",
                             departureTimezone: "America/Argentina/Buenos_Aires",
                             departureUTC: dep1UTC,
                             arrivalLocalTime: "2026-06-24T13:20",
                             arrivalTimezone: "Europe/Madrid",
                             arrivalUTC: arr1UTC,
                             durationMinutes: 885,
                             cabinClass: "economy",
                             price: 850, currency: "USD", priceUSD: 850)
        let dep2UTC = ISO8601DateFormatter().date(from: "2026-07-01T07:00:00Z") ?? start
        let arr2UTC = ISO8601DateFormatter().date(from: "2026-07-01T08:35:00Z") ?? start
        let flight2 = Flight(tripId: tripID, airline: "Vueling", flightNumber: "VY1866",
                             originIATA: "MAD", destinationIATA: "BCN",
                             departureLocalTime: "2026-07-01T09:00",
                             departureTimezone: "Europe/Madrid",
                             departureUTC: dep2UTC,
                             arrivalLocalTime: "2026-07-01T10:35",
                             arrivalTimezone: "Europe/Madrid",
                             arrivalUTC: arr2UTC,
                             durationMinutes: 95,
                             cabinClass: "economy",
                             price: 45, currency: "EUR", priceUSD: 49)
        let flightsRef = tripDoc.collection("flights")
        try flightsRef.addDocument(from: flight1)
        try flightsRef.addDocument(from: flight2)

        // Hotel
        let hotel = Hotel(tripId: tripID, name: "NH Collection Madrid Bravo Murillo",
                          brand: "NH",
                          checkIn: "2026-06-24", checkOut: "2026-07-01",
                          roomType: "Doble superior",
                          pricePerNight: 120, totalPrice: 840, currency: "EUR",
                          totalPriceUSD: 924)
        try tripDoc.collection("hotels").addDocument(from: hotel)
    }
}
