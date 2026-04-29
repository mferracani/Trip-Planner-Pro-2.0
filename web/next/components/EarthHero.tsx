"use client";

import Image from "next/image";
import { useState } from "react";

// Stars: deterministic pseudo-random positions to avoid hydration mismatch
const STARS = Array.from({ length: 80 }, (_, i) => {
  const seed = (i * 2654435761) >>> 0;
  const x = ((seed ^ (seed >>> 16)) * 2246822519) >>> 0;
  const y = ((x ^ (x >>> 13)) * 3266489917) >>> 0;
  const s = ((y ^ (y >>> 16)) * 2654435761) >>> 0;
  return {
    cx: (x % 14400) / 100,
    cy: (y % 8100) / 100,
    r: 0.5 + (s % 10) / 20,
    opacity: 0.2 + (s % 60) / 100,
    delay: (i % 7) * 0.4,
  };
});

export function EarthHero() {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="earth-hero-root w-full aspect-video relative overflow-hidden rounded-2xl select-none">
      {/* Background fill */}
      <div className="absolute inset-0" style={{ background: "#090806" }} />

      {/* Stars layer — very slow parallax via CSS */}
      <svg
        className="earth-hero-stars absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 144 81"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="#ffffff"
            opacity={s.opacity}
            style={{ animationDelay: `${s.delay}s` }}
          />
        ))}
      </svg>

      {/* Earth image — earthRotate + cameraPush stacked */}
      <div className="earth-hero-camera absolute inset-0">
        <div className="earth-hero-translate absolute inset-0">
          {!imgError ? (
            <Image
              src="/earth-hero.jpg"
              alt=""
              fill
              priority
              className="object-cover"
              onError={() => setImgError(true)}
              sizes="100vw"
            />
          ) : (
            /* Fallback gradient when image is missing */
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 70% at 50% 55%, #0d2b3e 0%, #071520 45%, #090806 100%)",
              }}
            />
          )}
        </div>
      </div>

      {/* Atmospheric glow overlay */}
      <div
        className="earth-hero-glow absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 72% 65% at 50% 52%, transparent 38%, rgba(13,148,136,0.18) 62%, rgba(20,184,166,0.28) 78%, rgba(9,8,6,0.85) 100%)",
        }}
      />

      {/* Vignette — darken edges for cinematic feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 85% at 50% 50%, transparent 50%, rgba(9,8,6,0.55) 100%)",
        }}
      />

      {/* SVG arcs + particles layer */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1440 810"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          {/* Gold glow filter */}
          <filter id="goldGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Subtle arc glow */}
          <filter id="arcGlow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Arc 1 — Buenos Aires → Madrid */}
        <path
          id="arc-ba-mad"
          d="M 320,600 C 400,300 900,200 1100,350"
          stroke="#FFD16A"
          strokeWidth="1.5"
          fill="none"
          filter="url(#arcGlow)"
          className="earth-hero-arc"
          style={{ animationDelay: "0s" }}
        />
        <circle r="3" fill="#FFD16A" filter="url(#goldGlow)" opacity="0.95">
          <animateMotion
            dur="5s"
            repeatCount="indefinite"
            keyTimes="0;0.05;0.95;1"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
            calcMode="spline"
          >
            <mpath href="#arc-ba-mad" />
          </animateMotion>
        </circle>

        {/* Arc 2 — São Paulo → Londres */}
        <path
          id="arc-sp-lon"
          d="M 380,560 C 450,280 950,180 1050,300"
          stroke="#FFD16A"
          strokeWidth="1.5"
          fill="none"
          filter="url(#arcGlow)"
          className="earth-hero-arc"
          style={{ animationDelay: "0.8s" }}
        />
        <circle r="3" fill="#FFD16A" filter="url(#goldGlow)" opacity="0.90">
          <animateMotion
            dur="4.5s"
            begin="1.2s"
            repeatCount="indefinite"
            keyTimes="0;0.05;0.95;1"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
            calcMode="spline"
          >
            <mpath href="#arc-sp-lon" />
          </animateMotion>
        </circle>

        {/* Arc 3 — Santiago → París */}
        <path
          id="arc-scl-par"
          d="M 290,620 C 380,320 880,220 1080,320"
          stroke="#FFD16A"
          strokeWidth="1.5"
          fill="none"
          filter="url(#arcGlow)"
          className="earth-hero-arc"
          style={{ animationDelay: "1.6s" }}
        />
        <circle r="3" fill="#FFD16A" filter="url(#goldGlow)" opacity="0.85">
          <animateMotion
            dur="6s"
            begin="2.4s"
            repeatCount="indefinite"
            keyTimes="0;0.05;0.95;1"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
            calcMode="spline"
          >
            <mpath href="#arc-scl-par" />
          </animateMotion>
        </circle>
      </svg>

      {/* Atmospheric pulse overlay — second pass with teal */}
      <div
        className="earth-hero-atm absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 52%, rgba(20,184,166,0.07) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
