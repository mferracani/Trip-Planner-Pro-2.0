import SwiftUI

// MARK: - TravelGlobeView
//
// Canvas-based globe using TimelineView for smooth 60fps rotation.
// Renders a dark sphere with simulated continent blobs and
// green markers for visited countries.

struct TravelGlobeView: View {
    var markers: [(lat: Double, lng: Double)]

    @State private var phase: Double = 0

    var body: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            Canvas { ctx, size in
                drawGlobe(context: ctx, size: size, time: t)
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }

    // MARK: - Draw

    private func drawGlobe(context: GraphicsContext, size: CGSize, time: TimeInterval) {
        let cx = size.width / 2
        let cy = size.height / 2
        let r = min(cx, cy) * 0.88
        let rotation = (time * 0.025).truncatingRemainder(dividingBy: 2 * .pi)

        // --- 1. Base sphere ---
        context.fill(
            Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)),
            with: .linearGradient(
                Gradient(stops: [
                    .init(color: Color(hex: 0x1A3A6B), location: 0),
                    .init(color: Color(hex: 0x0E1E3A), location: 0.5),
                    .init(color: Color(hex: 0x050D1A), location: 1)
                ]),
                startPoint: CGPoint(x: cx - r * 0.4, y: cy - r * 0.4),
                endPoint: CGPoint(x: cx + r * 0.6, y: cy + r * 0.6)
            )
        )

        // --- 2. Grid lines (meridians + parallels) ---
        var gridPath = Path()
        let lineCount = 8
        for i in 0..<lineCount {
            let angle = Double(i) * (.pi / Double(lineCount))
            let cosA = cos(angle + rotation)
            let ellipseW = abs(cosA) * r * 2
            if ellipseW > 2 {
                let rect = CGRect(
                    x: cx - ellipseW / 2,
                    y: cy - r,
                    width: ellipseW,
                    height: r * 2
                )
                gridPath.addEllipse(in: rect)
            }
        }
        // Horizontal parallels
        for i in 1..<4 {
            let lat = Double(i) / 4.0
            let yOff = r * (lat * 2 - 1)
            let parallelR = sqrt(max(0, r * r - yOff * yOff))
            if parallelR > 1 {
                gridPath.addEllipse(in: CGRect(
                    x: cx - parallelR, y: cy + yOff - parallelR * 0.22,
                    width: parallelR * 2, height: parallelR * 0.44
                ))
            }
        }
        context.stroke(gridPath, with: .color(.white.opacity(0.04)), lineWidth: 0.5)

        // --- 3. Continent blobs ---
        let continents: [(lat: Double, lng: Double, rLat: Double, rLng: Double, alpha: Double)] = [
            // Europe
            (55, 15, 18, 20, 0.18),
            // Africa
            (5, 20, 30, 22, 0.16),
            // North America
            (45, -100, 22, 30, 0.17),
            // South America
            (-15, -60, 20, 18, 0.15),
            // Asia
            (45, 90, 22, 45, 0.15),
            // Australia
            (-25, 135, 12, 16, 0.16),
        ]

        for cont in continents {
            guard let (projX, projY, depth) = projectSphere(
                lat: cont.lat, lng: cont.lng, cx: cx, cy: cy, r: r, rotation: rotation
            ), depth > 0 else { continue }

            let scaleX = cos(cont.rLng * .pi / 180) * r * sin(cont.rLng * .pi / 180 * 0.8)
            let scaleY = r * sin(cont.rLat * .pi / 180) * 0.55
            let blobRect = CGRect(
                x: projX - abs(scaleX) * 0.5,
                y: projY - abs(scaleY) * 0.5,
                width: abs(scaleX),
                height: abs(scaleY)
            )
            context.fill(
                Path(ellipseIn: blobRect),
                with: .color(Color(hex: 0x2A6A48).opacity(cont.alpha * depth))
            )
        }

        // --- 4. Country markers (visited) ---
        for marker in markers {
            guard let (projX, projY, depth) = projectSphere(
                lat: marker.lat, lng: marker.lng, cx: cx, cy: cy, r: r, rotation: rotation
            ), depth > 0.1 else { continue }

            let dotR = 4.0 * depth
            let dotRect = CGRect(x: projX - dotR, y: projY - dotR, width: dotR * 2, height: dotR * 2)

            // Glow
            context.fill(
                Path(ellipseIn: dotRect.insetBy(dx: -3, dy: -3)),
                with: .color(Color(hex: 0x30D158).opacity(0.25 * depth))
            )
            // Core dot
            context.fill(
                Path(ellipseIn: dotRect),
                with: .color(Color(hex: 0x30D158).opacity(0.9 * depth))
            )
        }

        // --- 5. Specular highlight ---
        context.fill(
            Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)),
            with: .linearGradient(
                Gradient(stops: [
                    .init(color: Color.white.opacity(0.15), location: 0),
                    .init(color: Color.clear, location: 0.5)
                ]),
                startPoint: CGPoint(x: cx - r * 0.5, y: cy - r * 0.7),
                endPoint: CGPoint(x: cx + r * 0.2, y: cy)
            )
        )

        // Outer glow ring
        context.stroke(
            Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)),
            with: .color(Color(hex: 0x0A84FF).opacity(0.12)),
            lineWidth: 6
        )
    }

    // MARK: - Projection

    /// Projects lat/lng onto the 2D canvas sphere.
    /// Returns (x, y, depth) where depth 0..1 indicates front-facing.
    private func projectSphere(
        lat: Double, lng: Double,
        cx: Double, cy: Double,
        r: Double,
        rotation: Double
    ) -> (Double, Double, Double)? {
        let latR = lat * .pi / 180
        let lngR = (lng * .pi / 180) + rotation

        let x3d = cos(latR) * sin(lngR)
        let y3d = sin(latR)
        let z3d = cos(latR) * cos(lngR)

        // Only render front hemisphere
        guard z3d > -0.2 else { return nil }

        let projX = cx + x3d * r
        let projY = cy - y3d * r
        let depth = (z3d + 0.2) / 1.2  // normalize 0..1

        return (projX, projY, depth)
    }
}

// MARK: - Preview

#Preview {
    TravelGlobeView(markers: [
        (lat: -34.6, lng: -58.4),
        (lat: 40.4, lng: -3.7),
        (lat: 48.8, lng: 2.3),
        (lat: 41.9, lng: 12.5),
    ])
    .frame(width: 280, height: 280)
    .background(Color(hex: 0x0D0D0D))
}
