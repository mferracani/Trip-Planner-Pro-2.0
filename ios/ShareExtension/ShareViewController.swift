import Social
import SwiftUI
import UIKit
import UniformTypeIdentifiers

// The system calls this class as the extension's principal class.
// It hosts a SwiftUI view inside a UIHostingController.
final class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.05, green: 0.05, blue: 0.05, alpha: 1)

        let hostingVC = UIHostingController(rootView: ShareView(context: extensionContext))
        hostingVC.view.backgroundColor = .clear

        addChild(hostingVC)
        view.addSubview(hostingVC.view)
        hostingVC.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingVC.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingVC.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingVC.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingVC.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        hostingVC.didMove(toParent: self)
    }
}

// MARK: - SwiftUI Share View

private struct ShareView: View {
    let context: NSExtensionContext?
    @State private var extractedText: String = ""
    @State private var selectedTripID: String = ""
    @State private var trips: [AppGroupBridge.TripSummary] = []
    @State private var isSending = false
    @State private var isDone = false

    var body: some View {
        VStack(spacing: 0) {
            // Handle bar
            Capsule()
                .fill(Color(white: 0.3))
                .frame(width: 36, height: 4)
                .padding(.top, 12)

            // Header
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(Color(red: 0.75, green: 0.35, blue: 0.95))
                Text("Trip Planner Pro")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                Button("Cancelar") { context?.cancelRequest(withError: CancellationError()) }
                    .font(.system(size: 15))
                    .foregroundStyle(Color(white: 0.6))
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)

            Divider().background(Color(white: 0.2)).padding(.top, 12)

            if isDone {
                doneState
            } else {
                mainContent
            }
        }
        .background(Color(red: 0.1, green: 0.1, blue: 0.1))
        .preferredColorScheme(.dark)
        .task { await extractContent() }
    }

    private var mainContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Text preview
            if !extractedText.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Contenido")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color(white: 0.5))
                        .kerning(0.6)

                    Text(extractedText.prefix(300) + (extractedText.count > 300 ? "…" : ""))
                        .font(.system(size: 13))
                        .foregroundStyle(Color(white: 0.7))
                        .lineLimit(5)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Color(white: 0.15)))
                }
            }

            // Trip picker
            if !trips.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Viaje destino")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Color(white: 0.5))
                        .kerning(0.6)

                    Picker("", selection: $selectedTripID) {
                        Text("Seleccionar viaje").tag("")
                        ForEach(trips) { trip in
                            Text(trip.name).tag(trip.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(Color(red: 0.04, green: 0.52, blue: 1))
                    .padding(10)
                    .background(RoundedRectangle(cornerRadius: 8).fill(Color(white: 0.15)))
                }
            }

            // Send button
            Button {
                send()
            } label: {
                HStack(spacing: 6) {
                    if isSending {
                        ProgressView().tint(.black).scaleEffect(0.8)
                    } else {
                        Image(systemName: "arrow.right.circle.fill")
                    }
                    Text("Abrir en Trip Planner Pro")
                        .font(.system(size: 15, weight: .semibold))
                }
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(canSend ? Color(red: 0.75, green: 0.35, blue: 0.95) : Color(white: 0.25))
                )
            }
            .disabled(!canSend || isSending)
        }
        .padding(16)
    }

    private var doneState: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 44))
                .foregroundStyle(Color(red: 0.19, green: 0.82, blue: 0.34))
            Text("Abriendo en la app...")
                .font(.system(size: 15))
                .foregroundStyle(Color(white: 0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(40)
    }

    private var canSend: Bool {
        !extractedText.isEmpty
    }

    private func extractContent() async {
        trips = AppGroupBridge.readTripSummaries()

        guard let item = context?.inputItems.first as? NSExtensionItem else { return }
        guard let attachments = item.attachments else { return }

        for provider in attachments {
            // Try plain text first
            if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                if let text = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String {
                    await MainActor.run { extractedText = text }
                    return
                }
            }
            // Try URL (Safari)
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                if let url = try? await provider.loadItem(forTypeIdentifier: UTType.url.identifier) as? URL {
                    await MainActor.run { extractedText = url.absoluteString }
                    return
                }
            }
            // Attributed string fallback
            if provider.hasItemConformingToTypeIdentifier(UTType.rtf.identifier) {
                if let attrStr = try? await provider.loadItem(forTypeIdentifier: UTType.rtf.identifier) as? NSAttributedString {
                    await MainActor.run { extractedText = attrStr.string }
                    return
                }
            }
        }
    }

    private func send() {
        guard canSend else { return }
        isSending = true

        AppGroupBridge.writePendingParse(text: extractedText)

        // Open the main app via URL scheme
        let urlString = "tripplannerro://parse"
        guard let url = URL(string: urlString) else {
            context?.completeRequest(returningItems: [], completionHandler: nil)
            return
        }

        isDone = true

        // Give iOS a moment to show the done state, then open the app
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            // Extensions can't call openURL directly — we open via extensionContext
            self.context?.open(url, completionHandler: nil)
            self.context?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
}
