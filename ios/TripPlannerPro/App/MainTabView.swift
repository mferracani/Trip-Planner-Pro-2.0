import SwiftUI

struct MainTabView: View {
    let user: AuthUser

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Viajes", systemImage: "airplane")
                }

            CatalogView()
                .tabItem {
                    Label("Catálogo", systemImage: "square.grid.2x2")
                }

            SettingsView()
                .tabItem {
                    Label("Ajustes", systemImage: "gearshape")
                }
        }
        .tint(Tokens.Color.accentBlue)
    }
}
