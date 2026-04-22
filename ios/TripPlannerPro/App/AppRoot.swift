import SwiftUI

struct AppRoot: View {
    @State private var auth = AuthManager()

    var body: some View {
        Group {
            switch auth.state {
            case .loading:
                SplashView()
            case .signedOut:
                SignInView()
                    .environment(auth)
            case .signedIn(let user):
                MainTabView(user: user)
                    .environment(auth)
            }
        }
        .animation(.easeInOut(duration: Tokens.Motion.base), value: auth.state)
    }
}

private struct SplashView: View {
    var body: some View {
        ZStack {
            Tokens.Color.bgPrimary.ignoresSafeArea()
            ProgressView()
                .tint(Tokens.Color.textSecondary)
        }
    }
}
