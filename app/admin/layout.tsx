/**
 * =============================================================================
 * app/admin/layout.tsx
 * -----------------------------------------------------------------------------
 * Layout area admin: melindungi rute dengan `AuthGuard` peran admin sehingga
 * hanya pengguna yang login sebagai admin yang dapat mengakses `/admin/*`.
 * =============================================================================
 */

import AuthGuard from "@/components/auth-guard";

/**
 * Membungkus seluruh halaman admin dengan penjaga sesi & kerangka dashboard.
 *
 * @param props.children - Halaman admin yang sedang dirender.
 * @returns Konten admin yang terlindungi.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard peran="admin">{children}</AuthGuard>;
}
