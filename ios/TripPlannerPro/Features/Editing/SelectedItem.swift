import SwiftUI

// MARK: - SelectedItem
//
// Unified discriminator for "which item is being edited" — used by every
// view that presents an edit sheet.

enum SelectedItem: Identifiable {
    case flight(Flight)
    case hotel(Hotel)
    case transport(Transport)
    case expense(Expense)
    case city(TripCity)

    var id: String {
        switch self {
        case .flight(let f): return "flight-\(f.id ?? UUID().uuidString)"
        case .hotel(let h): return "hotel-\(h.id ?? UUID().uuidString)"
        case .transport(let t): return "transport-\(t.id ?? UUID().uuidString)"
        case .expense(let e): return "expense-\(e.id ?? UUID().uuidString)"
        case .city(let c): return "city-\(c.id ?? UUID().uuidString)"
        }
    }
}

// MARK: - EditSheetPresenter
//
// View modifier that presents the correct edit sheet for a SelectedItem.
struct EditSheetPresenter: ViewModifier {
    @Binding var item: SelectedItem?
    let tripID: String

    func body(content: Content) -> some View {
        content
            .sheet(item: $item) { item in
                switch item {
                case .flight(let f):
                    FlightEditSheet(tripID: tripID, existing: f) { self.item = nil }
                        .presentationBackground(Tokens.Color.bgPrimary)
                case .hotel(let h):
                    HotelEditSheet(tripID: tripID, existing: h) { self.item = nil }
                        .presentationBackground(Tokens.Color.bgPrimary)
                case .transport(let t):
                    TransportEditSheet(tripID: tripID, existing: t) { self.item = nil }
                        .presentationBackground(Tokens.Color.bgPrimary)
                case .expense(let e):
                    ExpenseEditSheet(tripID: tripID, existing: e) { self.item = nil }
                        .presentationBackground(Tokens.Color.bgPrimary)
                case .city(let c):
                    CityEditSheet(city: c, tripID: tripID) { self.item = nil }
                        .presentationBackground(Tokens.Color.bgPrimary)
                }
            }
    }
}

extension View {
    func editSheet(item: Binding<SelectedItem?>, tripID: String) -> some View {
        modifier(EditSheetPresenter(item: item, tripID: tripID))
    }
}
