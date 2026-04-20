import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Trip Planner Pro 2",
  description: "Organizá tus viajes sin tipear.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="font-sans bg-[#0D0D0D] text-white antialiased min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
