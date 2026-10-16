/**
 * =============================================================================
 * app/petugas/layout.tsx
 * -----------------------------------------------------------------------------
 * Layout area petugas loket: melindungi rute dengan `AuthGuard` peran
 * petugas sehingga hanya petugas login yang dapat mengakses `/petugas`.
 * =============================================================================
 */

import AuthGuard from "@/components/auth-guard";

/**
 * Membungkus halaman loket dengan penjaga sesi & kerangka dashboard.
 *
 * @param props.children - Halaman petugas yang sedang dirender.
 * @returns Konten petugas yang terlindungi.
 */
export default function PetugasLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard peran="petugas">{children}</AuthGuard>;
}
