/**
 * =============================================================================
 * app/pelanggan/layout.tsx
 * -----------------------------------------------------------------------------
 * Layout area pelanggan: melindungi rute dengan `AuthGuard` peran pelanggan
 * sehingga hanya pelanggan login (berdasarkan no kontrol) yang dapat mengakses
 * `/pelanggan/*`.
 * =============================================================================
 */

import AuthGuard from "@/components/auth-guard";

/**
 * Membungkus halaman pelanggan dengan penjaga sesi & kerangka dashboard.
 *
 * @param props.children - Halaman pelanggan yang sedang dirender.
 * @returns Konten pelanggan yang terlindungi.
 */
export default function PelangganLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard peran="pelanggan">{children}</AuthGuard>;
}
