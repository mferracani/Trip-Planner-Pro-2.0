import SwiftUI

struct CatalogView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()
                Text("Catálogo")
                    .font(.system(size: 15))
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
            .navigationTitle("Catálogo")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
