import SwiftUI

struct ProgressRing: View {
    let progress: Double
    var size: CGFloat = 80
    var lineWidth: CGFloat = 6

    private var trimEnd: CGFloat { CGFloat(min(max(progress, 0), 1)) }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Tokens.Color.elevated, lineWidth: lineWidth)

            Circle()
                .trim(from: 0, to: trimEnd)
                .stroke(
                    Tokens.Gradient.progressRing,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: Tokens.Motion.base), value: trimEnd)

            VStack(spacing: 0) {
                Text("\(Int(progress * 100))%")
                    .font(Tokens.Typography.statSmall)
                    .foregroundStyle(Tokens.Color.textPrimary)
                Text("Progreso")
                    .font(Tokens.Typography.caption2)
                    .foregroundStyle(Tokens.Color.textSecondary)
            }
        }
        .frame(width: size, height: size)
    }
}

#Preview {
    HStack(spacing: 24) {
        ProgressRing(progress: 0.11)
        ProgressRing(progress: 0.50)
        ProgressRing(progress: 0.85)
    }
    .padding()
    .background(Tokens.Color.bgPrimary)
    .preferredColorScheme(.dark)
}
