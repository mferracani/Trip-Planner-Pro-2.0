import SwiftUI

struct ListView: View {
    let vm: TripDetailViewModel

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: Tokens.Spacing.sm) {
                ForEach(vm.flights) { flight in
                    HStack {
                        Image(systemName: "airplane")
                            .foregroundStyle(Tokens.Color.Category.flight)
                        VStack(alignment: .leading) {
                            Text("\(flight.originIATA) → \(flight.destIATA)")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Tokens.Color.textPrimary)
                            Text("\(flight.airline)\(flight.flightNumber) · \(flight.departureLocal.prefix(10))")
                                .font(.system(size: 12))
                                .foregroundStyle(Tokens.Color.textSecondary)
                        }
                    }
                    .padding(Tokens.Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: Tokens.Radius.md).fill(Tokens.Color.surface))
                }

                ForEach(vm.hotels) { hotel in
                    HStack {
                        Image(systemName: "bed.double")
                            .foregroundStyle(Tokens.Color.Category.hotel)
                        VStack(alignment: .leading) {
                            Text(hotel.name)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Tokens.Color.textPrimary)
                            Text("\(hotel.checkInLocal.prefix(10)) → \(hotel.checkOutLocal.prefix(10))")
                                .font(.system(size: 12))
                                .foregroundStyle(Tokens.Color.textSecondary)
                        }
                    }
                    .padding(Tokens.Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: Tokens.Radius.md).fill(Tokens.Color.surface))
                }
            }
            .padding(Tokens.Spacing.base)
        }
        .background(Tokens.Color.bgPrimary)
    }
}
