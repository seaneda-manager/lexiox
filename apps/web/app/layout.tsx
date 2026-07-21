// apps/web/app/layout.tsx
export const dynamic = 'force-dynamic';

import "./globals.css";
import "@/styles/theme.css";
import React from "react";
import RootShell from "@/components/layout/RootShell";
import PWARegister from "@/components/PWARegister";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "LEXiOX",
  description: "LEXiOX 학습 플랫폼",
  manifest: "/manifest.json",
  icons: {
    icon: "/lingox/mascot/fox/fox-calm.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LEXiOX",
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      {/* bg-color은 globals.css body에서 #f2f4f1로 단일 관리 */}
      <body className="min-h-screen" suppressHydrationWarning>
        <PWARegister />
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}