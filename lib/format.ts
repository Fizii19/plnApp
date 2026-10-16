/**
 * =============================================================================
 * lib/format.ts
 * -----------------------------------------------------------------------------
 * Helper pemformatan data untuk ditampilkan di seluruh halaman.
 *
 * Semua fungsi bekerja pada nilai murni (tanpa `Date.now()` / `new Date()`
 * tanpa argumen) agar aman saat prerender Next.js Cache Components yang
 * melarang pemanggilan API sinkron non-deterministik saat build.
 * =============================================================================
 */

import type { JenisPelanggan } from "./types";

/** Nama bulan Indonesia sesuai index `bulan` pada tabel pemakaian (0 = Januari). */
export const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/**
 * Mengubah angka menjadi format mata uang Rupiah (tanpa desimal).
 *
 * @param nilai - Nominal yang akan diformat, contoh: 144500.
 * @returns String Rupiah, contoh: "Rp144.500".
 *
 * @example formatRupiah(144500); // "Rp144.500"
 */
export function formatRupiah(nilai: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(nilai);
}

/**
 * Mengubah angka menjadi pemisah ribuan saja (tanpa simbol mata uang).
 * Berguna untuk nilai kWh, nomor meter, dan nomor kontrol.
 *
 * @param nilai - Angka yang akan diformat.
 * @returns String berpemisah titik, contoh: "1.268".
 */
export function formatAngka(nilai: number): string {
  return new Intl.NumberFormat("id-ID").format(nilai);
}

/**
 * Mengubah nomor bulan (1-12) menjadi nama bulan Indonesia.
 *
 * @param bulan - Nomor bulan, 1 = Januari sampai 12 = Desember.
 * @returns Nama bulan, atau string kosong bila di luar rentang 1-12.
 *
 * @example namaBulan(7); // "Juli"
 */
export function namaBulan(bulan: number): string {
  if (bulan < 1 || bulan > 12) return "";
  return NAMA_BULAN[bulan - 1];
}

/**
 * Memformat tanggal ISO (YYYY-MM-DD) menjadi format Indonesia panjang.
 *
 * Tanggal dibangun dari parsing string manual (bukan `new Date()`) agar
 * deterministik dan tidak memicu error sync-IO saat prerender.
 *
 * @param iso - Tanggal format ISO, contoh: "2026-09-30".
 * @returns Tanggal panjang, contoh: "30 September 2026"; "" bila format salah.
 *
 * @example formatTanggal("2026-09-30"); // "30 September 2026"
 */
export function formatTanggal(iso: string): string {
  const pola = /^(\d{4})-(\d{2})-(\d{2})$/;
  const cocok = pola.exec(iso.trim());
  if (!cocok) return "";
  const [, tahun, bulan, tanggal] = cocok;
  return `${Number(tanggal)} ${namaBulan(Number(bulan))} ${tahun}`;
}

/**
 * Menggabungkan periode bulan+tahun menjadi label, contoh: "Juli 2026".
 *
 * @param bulan - Nomor bulan 1-12.
 * @param tahun - Empat digit tahun.
 * @returns Label periode, contoh: "Juli 2026".
 */
export function formatPeriode(bulan: number, tahun: number): string {
  return `${namaBulan(bulan)} ${tahun}`;
}

/**
 * Memformat nomor telepon/hp agar konsisten tampil (08xx -> 08xx-xxxx).
 *
 * @param nomor - Nomor telepon mentah.
 * @returns Nomor dengan pemisah tipis, atau nomor asli bila bukan digit.
 */
export function formatNoTelepon(nomor: string): string {
  const bersih = nomor.replace(/\D/g, "");
  if (bersih.length < 8) return nomor;
  return `${bersih.slice(0, 4)}-${bersih.slice(4, 8)}-${bersih.slice(8)}`;
}

/**
 * Memberi label singkat jenis pelanggan untuk ditampilkan sebagai badge.
 *
 * @param jenis - Jenis pelanggan.
 * @returns Label badge, contoh: "RT" untuk "Rumah Tangga".
 */
export function labelSingkatJenis(jenis: JenisPelanggan): string {
  const peta: Record<JenisPelanggan, string> = {
    "Rumah Tangga": "RT",
    Niaga: "NIAGA",
    Industri: "IND",
    Sosial: "SOS",
  };
  return peta[jenis];
}
