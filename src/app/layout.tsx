import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next"


const inter = Inter({ subsets: ["latin"] });
const apiKey = process.env.GOOGLE_API_KEY

export const metadata: Metadata = {
  title: {default: "Grub Guide - Discover Random Restaurants Near You", template: "%s | Grub Guide"},
  description: "Discover new places to eat with Grub Guide. Enter your location, set a search radius, and let us surprise you with a random restaurant nearby. Perfect for adventurous eaters and those who can't decide where to dine.",
  keywords: ["restaurant finder", "random restaurant", "food near me", "restaurant roulette", "where to eat", "restaurant discovery", "local restaurants", "Grub Guide"],
  authors: [{ name: "Grub Guide Team" }],
  creator: "Grub Guide",
  publisher: "Grub Guide",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://grubguide.food"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Grub Guide - Discover Random Restaurants Near You",
    description: "Can't decide where to eat? Let Grub Guide surprise you with a random restaurant near your location. Set your search radius and roll the culinary dice!",
    url: "https://grubguide.food",
    siteName: "Grub Guide",
    images: [
      {
        url: "/grubguide_logo_bg-removebg-preview.png",
        width: 800,
        height: 200,
        alt: "Grub Guide Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Grub Guide - Discover Random Restaurants Near You",
    description: "Can't decide where to eat? Let Grub Guide surprise you with a random restaurant near your location.",
    images: ["/grubguide_logo_bg-removebg-preview.png"],
    creator: "@grubguide",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Analytics />
        <SpeedInsights />
        {/* Load Google Maps JS API after the page is interactive.
            The autocomplete component polls for window.google readiness.
            Using v=weekly to get the latest Places API updates. */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
