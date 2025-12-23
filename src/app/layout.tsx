import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import FloatingActionButton from "@/components/FloatingActionButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Matched Betting App",
  description: "Gestión de operaciones de matched betting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthGuard>
          <Navbar />
          <main className="pt-16 pb-20 md:pb-0">
            {children}
          </main>
          <BottomNav />
          <FloatingActionButton />
        </AuthGuard>
      </body>
    </html>
  );
}
