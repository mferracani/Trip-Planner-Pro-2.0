import SwiftUI

// Discrete banner shown at the top of the screen when there's no connectivity.
// Mount it inside safeAreaInset(edge: .top) so it doesn't overlap content.

struct OfflineBanner: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Tokens.Color.textSecondary)
            Text("Sin conexión — los cambios se sincronizan al reconectar")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Tokens.Color.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Tokens.Color.surface)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Tokens.Color.border)
                .frame(height: 0.5)
        }
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}
