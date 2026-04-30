import SwiftUI

// MARK: - CountUpText
//
// Animates a number from 0 to `target` in `duration` seconds with easeOut cubic.

struct CountUpText: View {
    let target: Int
    var suffix: String = ""
    var duration: Double = 1.2

    @State private var current: Int = 0

    var body: some View {
        Text("\(current)\(suffix)")
            .contentTransition(.numericText())
            .onAppear {
                animateToTarget()
            }
            .onChange(of: target) {
                current = 0
                animateToTarget()
            }
    }

    private func animateToTarget() {
        guard target > 0 else { return }
        let steps = 60
        for i in 1...steps {
            let delay = Double(i) * (duration / Double(steps))
            let t = Double(i) / Double(steps)
            let eased = 1 - pow(1 - t, 3)  // easeOut cubic
            let value = Int(Double(target) * eased)
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                current = i == steps ? target : value
            }
        }
    }
}

#Preview {
    CountUpText(target: 42, suffix: " países")
        .font(.system(size: 48, weight: .bold))
        .foregroundStyle(.white)
        .padding()
        .background(Color(hex: 0x0D0D0D))
}
