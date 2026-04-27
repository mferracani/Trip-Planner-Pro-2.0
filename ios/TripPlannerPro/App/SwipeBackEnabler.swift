import SwiftUI
import UIKit

// Re-enables interactivePopGestureRecognizer when .toolbar(.hidden) suppresses it.
extension View {
    func enableSwipeBack() -> some View {
        background(SwipeBackEnablerView())
    }
}

private struct SwipeBackEnablerView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> SwipeBackVC { SwipeBackVC() }
    func updateUIViewController(_ vc: SwipeBackVC, context: Context) {}
}

private final class SwipeBackVC: UIViewController {
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard let nav = navigationController else { return }
        nav.interactivePopGestureRecognizer?.isEnabled = true
        nav.interactivePopGestureRecognizer?.delegate = nil
    }
}
