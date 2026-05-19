import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, Noto_Serif_TC, Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { clinicConfig } from "@/lib/clinic-config";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
  variable: "--font-noto-sans-tc",
  display: "swap",
});

const notoSerifTC = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-noto-serif-tc",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${clinicConfig.name} · 候診時間查詢`,
  description: `查詢您在${clinicConfig.name}的預估看診時間`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-Hant"
      suppressHydrationWarning
      className={`${notoSansTC.variable} ${notoSerifTC.variable} ${fraunces.variable} ${inter.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
