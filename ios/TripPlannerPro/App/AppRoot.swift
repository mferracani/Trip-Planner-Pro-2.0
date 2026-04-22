import SwiftUI

struct AppRoot: View {
    @State private var auth = AuthManager()
    @State private var pendingParseText: String?
    @State private var showPendingParseForTrip: Trip?

    var body: some View {
        Group {
            switch auth.state {
            case .loading:
                SplashView()
            case .signedOut:
                SignInView()
                    .environment(auth)
            case .signedIn(let user):
                MainTabView(
                    user: user,
                    pendingParseText: $pendingParseText,
                    showPendingParseForTrip: $showPendingParseForTrip
                )
                .environment(auth)
            }
        }
        .animation(.easeInOut(duration: Tokens.Motion.base), value: auth.state)
        .onOpenURL { url in
            handleURL(url)
        }
        .onReceive(
            NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)
        ) { _ in
            checkPendingParse()
        }
        .onAppear {
            checkPendingParse()
        }
    }

    private func handleURL(_ url: URL) {
        guard url.scheme == "tripplannerro" else { return }
        if url.host == "parse" {
            checkPendingParse()
        }
    }

    private func checkPendingParse() {
        if let pending = AppGroupBridge.readPendingParse() {
            pendingParseText = pending.text
            AppGroupBridge.clearPendingParse()
        }
    }
}

private struct SplashView: View {
    var body: some View {
        ZStack {
            Tokens.Color.bgPrimary.ignoresSafeArea()
            ProgressView().tint(Tokens.Color.textSecondary)
        }
    }
}
