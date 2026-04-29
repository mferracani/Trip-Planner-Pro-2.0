import Foundation
import Network
import Observation

@MainActor
@Observable
final class NetworkMonitor {
    static let shared = NetworkMonitor()

    private(set) var isConnected: Bool = true
    private(set) var isWiFi: Bool = false

    // Rises to true on offline → online transition; call consumeReconnect() after handling.
    private(set) var didReconnect: Bool = false

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "tpp.network-monitor", qos: .utility)
    private var previouslyConnected: Bool = true

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self else { return }
                let connected = path.status == .satisfied
                let wifi = path.usesInterfaceType(.wifi)
                if !self.previouslyConnected && connected {
                    self.didReconnect = true
                }
                self.previouslyConnected = connected
                self.isConnected = connected
                self.isWiFi = wifi
            }
        }
        monitor.start(queue: monitorQueue)
    }

    func consumeReconnect() {
        didReconnect = false
    }

    deinit {
        monitor.cancel()
    }
}
