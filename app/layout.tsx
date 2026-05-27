import type { Metadata, Viewport } from "next";

import { APP_DESCRIPTION, APP_NAME, APP_SEO_TITLE } from "@/lib/brand";

import "./globals.css";

const metadataBase = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: APP_SEO_TITLE,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [{ url: "/brand/ulvori-app-icon-180.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    title: APP_SEO_TITLE,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [{ url: "/brand/ulvori-logo-horizontal-transparent.png", alt: "Ulvori logo" }]
  },
  twitter: {
    card: "summary_large_image",
    title: APP_SEO_TITLE,
    description: APP_DESCRIPTION,
    images: ["/brand/ulvori-logo-horizontal-transparent.png"]
  }
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
