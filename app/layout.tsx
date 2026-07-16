import type { Metadata } from "next";
import { PRODUCT } from "@/lib/product";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: PRODUCT.name,
  description: PRODUCT.description,
  applicationName: PRODUCT.name,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  appleWebApp: {
    capable: true,
    title: PRODUCT.name,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: PRODUCT.name,
    description: PRODUCT.description,
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: PRODUCT.name,
    description: PRODUCT.description,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#a34324" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={PRODUCT.name} />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/pwa-icon-192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/pwa-icon-512.png" sizes="512x512" type="image/png" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
