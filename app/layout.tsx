import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SistemProvider } from "@/lib/store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIP Listrik — Sistem Pembayaran Listrik",
  description:
    "Aplikasi pembayaran listrik: dashboard admin, loket petugas, dan riwayat pelanggan.",
};

/**
 * Root layout aplikasi (App Router).
 * Membungkus seluruh halaman dengan font Geist dan provider data global.
 *
 * @param props.children - Halaman/route yang sedang dirender.
 * @returns Elemen html lengkap aplikasi.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        {/* SistemProvider menyediakan data & sesi untuk semua halaman */}
        <SistemProvider>{children}</SistemProvider>
      </body>
    </html>
  );
}
