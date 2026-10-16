/**
 * =============================================================================
 * lib/billing.ts
 * -----------------------------------------------------------------------------
 * Kalkulator biaya listrik: mengubah pembacaan meter + tarif menjadi
 * rincian tagihan (jumlah kWh, biaya beban, biaya pemakaian, total).
 *
 * Rumus mengikuti komponen biaya pada ERD tabel `pemakaian`:
 *   jumlah_pakai          = meter_akhir - meter_awal
 *   biaya_beban_pemakaian = tarif.biaya_beban
 *   biaya_pemakaian       = jumlah_pakai * tarif.tarif_kwh
 *   total tagihan         = biaya_beban + biaya_pemakaian
 * =============================================================================
 */

import { formatPeriode } from "./format";
import type { JenisPelanggan, Pelanggan, Pemakaian, RincianTagihan, Tarif } from "./types";

/**
 * Mencari tarif yang berlaku untuk sebuah jenis pelanggan.
 *
 * @param daftarTarif - Seluruh data tarif dari store.
 * @param jenis - Jenis pelanggan yang dicari.
 * @returns Objek tarif bila cocok, atau `undefined` bila jenis tidak dikenal.
 *
 * @example getTarifUntukJenis(tarifList, "Rumah Tangga")?.tarifKwh; // 1445
 */
export function getTarifUntukJenis(
  daftarTarif: Tarif[],
  jenis: JenisPelanggan,
): Tarif | undefined {
  return daftarTarif.find((tarif) => tarif.jenisPlg === jenis);
}

/**
 * Mengambil tarif berdasarkan pelanggan (gabungan pencarian pelanggan + jenis).
 *
 * @param daftarPelanggan - Data pelanggan.
 * @param daftarTarif - Data tarif.
 * @param noKontrol - Nomor kontrol pelanggan.
 * @returns Tarif yang dipakai pelanggan tersebut, atau `undefined` bila tidak ada.
 */
export function getTarifUntukPelanggan(
  daftarPelanggan: Pelanggan[],
  daftarTarif: Tarif[],
  noKontrol: number,
): Tarif | undefined {
  const pelanggan = daftarPelanggan.find((p) => p.noKontrol === noKontrol);
  if (!pelanggan) return undefined;
  return getTarifUntukJenis(daftarTarif, pelanggan.jenis);
}

/**
 * Menghitung jumlah pemakaian listrik dari selisih pembacaan meter.
 *
 * @param meterAwal - Angka meter pada awal periode.
 * @param meterAkhir - Angka meter pada akhir periode.
 * @returns Selisih dalam kWh; 0 bila meter akhir lebih kecil dari meter awal
 *          (kasus koreksi pencatatan).
 *
 * @example hitungJumlahPakai(1200, 1268); // 68
 */
export function hitungJumlahPakai(meterAwal: number, meterAkhir: number): number {
  const selisih = meterAkhir - meterAwal;
  return selisih > 0 ? selisih : 0;
}

/**
 * Menghitung biaya pemakaian (biaya variabel per kWh).
 *
 * @param jumlahKwh - Jumlah pemakaian dalam kWh.
 * @param tarif - Tarif yang berlaku untuk pelanggan tersebut.
 * @returns jumlahKwh x tarif.tarifKwh, dibulatkan ke integer Rupiah.
 *
 * @example hitungBiayaPemakaian(68, tarif); // 98240
 */
export function hitungBiayaPemakaian(jumlahKwh: number, tarif: Tarif): number {
  return Math.round(jumlahKwh * tarif.tarifKwh);
}

/**
 * Menghitung total tagihan dari komponen biaya.
 *
 * @param biayaBeban - Biaya beban/abonemen bulan berjalan.
 * @param biayaPemakaian - Biaya variabel kWh.
 * @returns Total tagihan yang harus dibayar pelanggan.
 */
export function hitungTotalTagihan(biayaBeban: number, biayaPemakaian: number): number {
  return biayaBeban + biayaPemakaian;
}

/**
 * Menghitung seluruh komponen biaya satu periode pemakaian sekaligus.
 * Dipakai form petugas loket, dokumen cetak, dan halaman pelanggan.
 *
 * @param tarif - Tarif yang berlaku.
 * @param meterAwal - Pembacaan meter awal.
 * @param meterAkhir - Pembacaan meter akhir.
 * @returns Rincian tagihan lengkap (kWh, beban, pemakaian, total, tarif).
 *
 * @example hitungRincianTagihan(tarif, 1200, 1268).total;
 */
export function hitungRincianTagihan(
  tarif: Tarif | undefined,
  meterAwal: number,
  meterAkhir: number,
): RincianTagihan {
  const jumlahPakai = hitungJumlahPakai(meterAwal, meterAkhir);
  const biayaBeban = tarif?.biayaBeban ?? 0;
  const biayaPemakaian = tarif ? hitungBiayaPemakaian(jumlahPakai, tarif) : 0;
  return {
    jumlahPakai,
    biayaBeban,
    biayaPemakaian,
    total: hitungTotalTagihan(biayaBeban, biayaPemakaian),
    tarif,
  };
}

/**
 * Menghitung total tagihan dari satu baris data pemakaian tersimpan.
 *
 * @param pemakaian - Baris tabel pemakaian.
 * @returns Total = biaya_beban_pemakaian + biaya_pemakaian.
 */
export function totalDariPemakaian(pemakaian: Pemakaian): number {
  return hitungTotalTagihan(pemakaian.biayaBebanPemakaian, pemakaian.biayaPemakaian);
}

/**
 * Mencari tagihan bulanan milik satu pelanggan berdasarkan periode.
 *
 * @param daftarPemakaian - Seluruh data pemakaian.
 * @param noKontrol - Nomor kontrol pelanggan.
 * @param bulan - Bulan periode (1-12).
 * @param tahun - Tahun periode.
 * @returns Baris pemakaian yang cocok, atau `undefined`.
 */
export function cariPemakaian(
  daftarPemakaian: Pemakaian[],
  noKontrol: number,
  bulan: number,
  tahun: number,
): Pemakaian | undefined {
  return daftarPemakaian.find(
    (p) => p.noKontrol === noKontrol && p.bulan === bulan && p.tahun === tahun,
  );
}

/**
 * Menyaring seluruh riwayat pemakaian milik satu pelanggan, terbaru dahulu.
 *
 * @param daftarPemakaian - Seluruh data pemakaian.
 * @param noKontrol - Nomor kontrol pelanggan.
 * @returns Daftar pemakaian milik pelanggan, diurutkan tahun & bulan menurun.
 */
export function riwayatPemakaian(
  daftarPemakaian: Pemakaian[],
  noKontrol: number,
): Pemakaian[] {
  return daftarPemakaian
    .filter((p) => p.noKontrol === noKontrol)
    .sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan);
}

/**
 * Membuat label tagihan yang mudah dibaca untuk daftar riwayat.
 *
 * @param pemakaian - Baris pemakaian yang akan diberi label.
 * @returns Label periode, contoh: "Juli 2026".
 */
export function labelTagihan(pemakaian: Pemakaian): string {
  return formatPeriode(pemakaian.bulan, pemakaian.tahun);
}
