import SwiftUI

struct ItemsView: View {
    let vm: TripDetailViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Tokens.Spacing.lg) {
                if !vm.flights.isEmpty {
                    section("Vuelos (\(vm.flights.count))", color: Tokens.Color.Category.flight)
                }
                if !vm.hotels.isEmpty {
                    section("Hoteles (\(vm.hotels.count))", color: Tokens.Color.Category.hotel)
                }
                if !vm.transports.isEmpty {
                    section("Transportes (\(vm.transports.count))", color: Tokens.Color.Category.transit)
                }
                if vm.flights.isEmpty && vm.hotels.isEmpty && vm.transports.isEmpty {
                    Text("Sin items aún")
                        .font(.system(size: 15))
                        .foregroundStyle(Tokens.Color.textTertiary)
                        .frame(maxWidth: .infinity, minHeight: 200, alignment: .center)
                }
            }
            .padding(Tokens.Spacing.base)
        }
        .background(Tokens.Color.bgPrimary)
    }

    private func section(_ title: String, color: Color) -> some View {
        HStack(spacing: Tokens.Spacing.sm) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(title)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Tokens.Color.textPrimary)
        }
        .padding(Tokens.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: Tokens.Radius.md).fill(Tokens.Color.surface))
    }
}
