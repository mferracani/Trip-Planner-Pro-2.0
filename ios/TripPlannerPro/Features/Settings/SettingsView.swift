import SwiftUI

struct SettingsView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        NavigationStack {
            ZStack {
                Tokens.Color.bgPrimary.ignoresSafeArea()

                List {
                    Section {
                        Button(role: .destructive) {
                            try? auth.signOut()
                        } label: {
                            Text("Cerrar sesión")
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Ajustes")
        }
    }
}
