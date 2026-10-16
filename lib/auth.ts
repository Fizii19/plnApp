/**
 * =============================================================================
 * lib/auth.ts
 * -----------------------------------------------------------------------------
 * Konstanta navigasi dan helper autentikasi sisi klien.
 *
 * Autentikasi sesungguhnya dilakukan melalui API MySQL di:
 *   POST /api/auth/login  (bcrypt + JWT)
 *   GET  /api/auth/me     (validasi token)
 *
 * File ini hanya menyimpan peta navigasi antar halaman per peran.
 * =============================================================================
 */

import type { Peran } from "./types";

/** Peta tujuan navigasi setelah login untuk setiap peran pengguna. */
export const PETA_HALAMAN: Record<Peran, string> = {
  admin: "/admin",
  petugas: "/petugas",
  pelanggan: "/pelanggan",
};
