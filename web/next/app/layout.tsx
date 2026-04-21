import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Trip Planner Pro",
  description: "Organizá tus viajes sin tipear.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trip Planner",
    startupImage: [],
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${interTight.variable} h-full`}>
      <body className="bg-[#0D0D0D] text-white antialiased min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
