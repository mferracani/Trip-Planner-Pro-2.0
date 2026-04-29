import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Allow Firebase Storage URLs for images and PDFs displayed inline
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://firebasestorage.googleapis.com",
      "media-src 'self' https://firebasestorage.googleapis.com",
      "object-src https://firebasestorage.googleapis.com",
      "frame-src https://firebasestorage.googleapis.com",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://fcm.googleapis.com wss://*.firebaseio.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
