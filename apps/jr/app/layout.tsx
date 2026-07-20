import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jr. Learning",
  description: "Jr. TOEFL Learning Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
