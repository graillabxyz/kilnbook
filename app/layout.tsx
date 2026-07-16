import type { Metadata } from "next";
import { PRODUCT } from "@/lib/product";
import "./globals.css";

export const metadata: Metadata = {
  title: PRODUCT.name,
  description: PRODUCT.description,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
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
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
