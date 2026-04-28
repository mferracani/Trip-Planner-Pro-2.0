"use client";

import { useEffect, useRef, useCallback } from "react";
import createGlobe from "cobe";
import type { Globe } from "cobe";

export interface GlobeMarker {
  location: [number, number];
  size: number;
}

interface Props {
  markers: GlobeMarker[];
}

export function TravelGlobe({ markers }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);
  const globeRef = useRef<Globe | null>(null);
  const rafRef = useRef<number>(0);

  const initGlobe = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

    globeRef.current = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: 600,
      height: 600,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.08, 0.08, 0.14],
      markerColor: [0.1, 0.82, 0.42],
      glowColor: [0.08, 0.28, 0.58],
      markers: markers.map((m) => ({ location: m.location, size: m.size })),
    });

    function animate() {
      phiRef.current += 0.003;
      globeRef.current?.update({ phi: phiRef.current });
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    // Fade in
    canvas.style.opacity = "0";
    requestAnimationFrame(() => {
      canvas.style.transition = "opacity 800ms ease";
      canvas.style.opacity = "0.9";
    });
  }, [markers]);

  useEffect(() => {
    initGlobe();
    return () => {
      cancelAnimationFrame(rafRef.current);
      globeRef.current?.destroy();
    };
  }, [initGlobe]);

  return (
    <div className="relative w-full" style={{ maxWidth: 600, margin: "0 auto" }}>
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          display: "block",
        }}
      />
    </div>
  );
}
