// utils/billing.js
/**
 * =============================================================================
 * utils/billing.js
 * -----------------------------------------------------------------------------
 * Kumpulan fungsi kalkulasi tagihan listrik untuk sisi backend (CommonJS).
 * Dipakai oleh API route: /api/pelanggan/cari, /api/pelanggan/riwayat, dan
 * /api/pembayaran/proses agar rumus hanya didefinisikan di satu tempat.
 *
 * Rumus mengikuti ERD tabel `pemakaian`:
 *   jumlah_pakai          = meter_akhir - meter_awal
 *   biaya_beban_pemakaian = tarif.biaya_beban
 *   biaya_pemakaian       = jumlah_pakai * tarif.tarif_kwh
 *   biaya_total           = biaya_beban + biaya_pemakaian
 * =============================================================================
 */

class BillingUtil {
  /**
   * Menghitung jumlah pemakaian (kWh) dari selisih pembacaan meter.
   *
   * @param {number|string} meterAwal - Pembacaan meter awal periode.
   * @param {number|string} meterAkhir - Pembacaan meter akhir periode.
   * @returns {number} Selisih kWh; 0 bila meter akhir <= meter awal (kasus koreksi).
   */
  static hitungJumlahPakai(meterAwal, meterAkhir) {
    const selisih = Number(meterAkhir) - Number(meterAwal);
    return selisih > 0 ? selisih : 0;
  }

  /**
   * Menghitung biaya pemakaian (komponen variabel per kWh).
   *
   * @param {number|string} jumlahPakai - Jumlah pemakaian (kWh).
   * @param {number|string} tarifKwh - Tarif per kWh milik pelanggan.
   * @returns {number} Biaya pemakaian dibulatkan ke Rupiah (integer).
   */
  static hitungBiayaPemakaian(jumlahPakai, tarifKwh) {
    return Math.round(Number(jumlahPakai) * Number(tarifKwh));
  }

  /**
   * Menjumlahkan komponen biaya beban dan biaya pemakaian.
   *
   * @param {number|string} biayaBeban - Biaya beban/abonemen.
   * @param {number|string} biayaPemakaian - Biaya variabel kWh.
   * @returns {number} Total tagihan yang harus dibayar.
   */
  static hitungTotalTagihan(biayaBeban, biayaPemakaian) {
    return Number(biayaBeban) + Number(biayaPemakaian);
  }

  /**
   * Menghitung seluruh rincian tagihan satu periode sekaligus.
   *
   * @param {number|string} biayaBeban - Nilai tarif.biaya_beban.
   * @param {number|string} tarifKwh - Nilai tarif.tarif_kwh.
   * @param {number|string} meterAwal - Pembacaan meter awal.
   * @param {number|string} meterAkhir - Pembacaan meter akhir.
   * @returns {{jumlah_pakai: number, biaya_beban: number, biaya_pemakaian: number, biaya_total: number}}
   *          Rincian tagihan lengkap.
   */
  static hitungRincianTagihan(biayaBeban, tarifKwh, meterAwal, meterAkhir) {
    const jumlahPakai = this.hitungJumlahPakai(meterAwal, meterAkhir);
    const beban = Number(biayaBeban);
    const biayaPemakaian = this.hitungBiayaPemakaian(jumlahPakai, tarifKwh);
    return {
      jumlah_pakai: jumlahPakai,
      biaya_beban: beban,
      biaya_pemakaian: biayaPemakaian,
      biaya_total: this.hitungTotalTagihan(beban, biayaPemakaian),
    };
  }

  /**
   * Memvalidasi rentang periode bulan/tahun.
   *
   * @param {number} bulan - Bulan periode (1-12).
   * @param {number} tahun - Tahun periode.
   * @returns {string|null} Pesan kesalahan bila tidak valid, atau null bila valid.
   */
  static validasiPeriode(bulan, tahun) {
    if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) {
      return 'Bulan harus berupa angka dengan rentang 1-12';
    }
    if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
      return 'Tahun tidak valid, gunakan rentang 2000-2100';
    }
    return null;
  }

  /**
   * Mengonversi nilai DECIMAL MySQL (dikembalikan mysql2 sebagai string)
   * menjadi `number` yang aman, dengan fallback 0.
   *
   * @param {any} nilai - Nilai dari kolom DECIMAL/string.
   * @returns {number} Nilai numerik, atau 0 bila tidak dapat diparse.
   */
  static toNumber(nilai) {
    const angka = Number(nilai);
    return Number.isFinite(angka) ? angka : 0;
  }
}

module.exports = BillingUtil;
