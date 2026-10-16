/**
 * =============================================================================
 * lib/auth.ts
 * -----------------------------------------------------------------------------
 * Logika autentikasi sederhana untuk prototipe UI.
 *
 * Verifikasi dilakukan terhadap data in-memory (bukan database) dan sesi
 * disimpan di context store + localStorage. Bila nanti dipindah ke backend,
 * cukup ganti isi `verifikasiLogin()` dengan panggilan API login.
 *
 * Alur mengikuti flowchart pada `blueprints/system-blueprint.json`:
 *   LOGIN -> cocokkan username/password -> salah: error, benar: buka dashboard
 *   sesuai peran (admin / petugas loket / pelanggan).
 * =============================================================================
 */

import { AKUN_ADMIN } from "./mock-data";
import type { Pelanggan, Peran, Petugas, Sesi } from "./types";

/** Password tunggal untuk seluruh akun pelanggan pada demo ini. */
export const PASSWORD_PELANGGAN = "pelanggan123";

/** Peta tujuan navigasi setelah login untuk setiap peran pengguna. */
export const PETA_HALAMAN: Record<Peran, string> = {
  admin: "/admin",
  petugas: "/petugas",
  pelanggan: "/pelanggan",
};

/**
 * Memverifikasi kredensial login dan menentukan peran pengguna.
 *
 * Urutan pemeriksaan: admin -> petugas loket -> pelanggan (no kontrol).
 *
 * @param username - Username / nomor kontrol yang diinput pengguna.
 * @param password - Password yang diinput pengguna.
 * @param daftarPetugas - Data petugas dari store (dipakai mencocokkan akun).
 * @param daftarPelanggan - Data pelanggan dari store (dipakai no kontrol).
 * @returns Objek `Sesi` bila cocok, atau `null` bila username/password salah.
 *
 * @example verifikasiLogin("admin", "admin123", petugas, pelanggan)?.peran; // "admin"
 */
export function verifikasiLogin(
  username: string,
  password: string,
  daftarPetugas: Petugas[],
  daftarPelanggan: Pelanggan[],
): Sesi | null {
  const user = username.trim();

  // 1) Periksa akun administrator (nilai konstan, bukan tabel).
  if (user === AKUN_ADMIN.username && password === AKUN_ADMIN.password) {
    return { peran: "admin", nama: AKUN_ADMIN.nama, username: user };
  }

  // 2) Periksa akun petugas loket berdasarkan data tabel petugas_loket.
  const petugas = daftarPetugas.find(
    (p) => p.username === user && p.password === password,
  );
  if (petugas) {
    return {
      peran: "petugas",
      nama: petugas.nama,
      username: petugas.username,
      idPetugas: petugas.idPetugas,
    };
  }

  // 3) Periksa akun pelanggan: username = nomor kontrol, password = sandi umum.
  if (password === PASSWORD_PELANGGAN) {
    const noKontrol = Number(user);
    const pelanggan = daftarPelanggan.find((p) => p.noKontrol === noKontrol);
    if (pelanggan) {
      return {
        peran: "pelanggan",
        nama: pelanggan.nama,
        username: user,
        noKontrol: pelanggan.noKontrol,
      };
    }
  }

  // Tidak ada kecocokan -> kembalikan null (menampilkan pesan error login).
  return null;
}
