import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keto Tracker",
  description: "Net-carb and weight tracking for keto",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Keto",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#16a34a",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight text-lg">
              <span className="text-accent">●</span> Keto Tracker
            </Link>
            <Link
              href="/settings"
              className="text-sm text-muted hover:text-foreground"
            >
              Settings
            </Link>
          </div>
        </header>
        <main className="flex-1 w-full max-w-xl mx-auto px-4 pb-28 pt-4">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
