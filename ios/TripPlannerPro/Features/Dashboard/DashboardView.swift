import SwiftUI

struct DashboardView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                VStack(spacing: Tokens.Spacing.md) {
                    Text("Hola, Mati")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(Tokens.Color.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, Tokens.Spacing.base)

                    Spacer()

                    Text("Dashboard en construcción")
                        .font(.system(size: 15))
                        .foregroundStyle(Tokens.Color.textSecondary)

                    Spacer()
                }
                .padding(.top, Tokens.Spacing.lg)
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
