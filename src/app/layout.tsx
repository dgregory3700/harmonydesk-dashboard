// src/app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import Footer from "../components/layout/footer"; // Commenting this out to avoid double footers in dashboard

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HarmonyDesk Dashboard",
  description: "Scheduling and case management for HarmonyDesk.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // CHANGE 1: "dark" instead of "light" forces the theme
    <html lang="en" className="dark"> 
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-slate-950 text-slate-200`}
      >
        <main className="flex-1">
          {children}
        </main>
        {/* <Footer /> */} 
      </body>
    </html>
  );
}
