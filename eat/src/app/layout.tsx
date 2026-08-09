import type { Metadata, Viewport } from "next";
import { Fraunces, Fragment_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
});

const fragment = Fragment_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fragment",
});

export const metadata: Metadata = {
  title: "EAT食 — curate your craving palette",
  description:
    "What's worth eating near you, right now, at a price worth walking for. 衣食住行 · That Nonsense Company.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f0efea",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${fragment.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
