// app/api/pelanggan/riwayat/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');
const BillingUtil = require('../../../../utils/billing');

/**
 * Menghitung ringkasan agregat riwayat pelanggan.
 *
 * @param {Array<Object>} daftarPemakaian
 * @param {Array<Object>} daftarPembayaran
 * @returns {{ total_periode, total_pemakaian_kwh, total_tagihan, total_dibayar, jumlah_transaksi }}
 */
function hitungRingkasan(daftarPemakaian, daftarPembayaran) {
  let totalPemakaian = 0;
  let totalTagihan = 0;
  for (const item of daftarPemakaian) {
    totalPemakaian += BillingUtil.toNumber(item.jumlah_pakai);
    totalTagihan += BillingUtil.toNumber(item.biaya_beban_pemakaian) + BillingUtil.toNumber(item.biaya_pemakaian);
  }
  let totalDibayar = 0;
  for (const item of daftarPembayaran) {
    totalDibayar += BillingUtil.toNumber(item.biaya_total);
  }
  return {
    total_periode: daftarPemakaian.length,
    total_pemakaian_kwh: totalPemakaian,
    total_tagihan: totalTagihan,
    total_dibayar: totalDibayar,
    jumlah_transaksi: daftarPembayaran.length,
  };
}

/**
 * GET /api/pelanggan/riwayat?no_kontrol=<n>
 * ──────────────────────────────────────────────────────────────────────────
 * Mengembalikan seluruh riwayat pemakaian dan pembayaran pelanggan.
 *
 * Setiap baris pemakaian disertai flag `sudah_bayar` dan field
 * `pembayaran_id` / `tanggal_bayar` bila sudah lunas, sehingga
 * frontend tidak perlu tebak-tebak matching bulan/tahun.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function GET(req) {
  try {
    const auth = AuthUtil.authenticate(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);

    const { searchParams } = new URL(req.url);
    const noKontrolRaw = searchParams.get('no_kontrol');

    if (!noKontrolRaw) return ResponseUtil.badRequest('Parameter no_kontrol wajib diisi');
    const noKontrol = Number(noKontrolRaw);
    if (!Number.isInteger(noKontrol) || noKontrol <= 0) {
      return ResponseUtil.badRequest('Parameter no_kontrol harus berupa angka positif');
    }

    // Pelanggan hanya boleh lihat data miliknya sendiri
    if (auth.user.role === 'pelanggan' && auth.user.no_kontrol !== noKontrol) {
      return ResponseUtil.forbidden('Akses ditolak: bukan data Anda');
    }

    const pelanggan = await db.queryOne(
      `SELECT no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan
         FROM pelanggan WHERE no_kontrol = ?`,
      [noKontrol],
    );
    if (!pelanggan) return ResponseUtil.notFound('Data pelanggan tidak ditemukan');

    // Ambil pemakaian + status lunas langsung dari JOIN ke pembayaran via id_pemakaian
    // Ini akurat 100% karena link langsung, tidak tebak lewat tanggal
    const pemakaian = await db.query(
      `SELECT
          pm.id_pemakaian,
          pm.no_kontrol,
          pm.tahun,
          pm.bulan,
          pm.meter_awal,
          pm.meter_akhir,
          pm.jumlah_pakai,
          pm.biaya_beban_pemakaian,
          pm.biaya_pemakaian,
          (pm.biaya_beban_pemakaian + pm.biaya_pemakaian) AS biaya_total,
          -- Status lunas: ada atau tidak di tabel pembayaran via id_pemakaian
          CASE WHEN pb.id_pembayaran IS NOT NULL THEN 1 ELSE 0 END AS sudah_bayar,
          pb.id_pembayaran   AS pembayaran_id,
          pb.tanggal_bayar   AS tanggal_bayar,
          pb.jumlah_bayar    AS jumlah_bayar,
          pt.nama_petugas    AS nama_petugas_bayar
         FROM pemakaian pm
         LEFT JOIN pembayaran pb ON pb.id_pemakaian = pm.id_pemakaian
         LEFT JOIN petugas_loket pt ON pb.id_petugas = pt.id_petugas
        WHERE pm.no_kontrol = ?
        ORDER BY pm.tahun DESC, pm.bulan DESC`,
      [noKontrol],
    );

    // Ambil daftar pembayaran terpisah (untuk tab riwayat bayar di halaman pelanggan)
    const pembayaran = await db.query(
      `SELECT
          pb.id_pembayaran,
          pb.id_pemakaian,
          pb.no_kontrol,
          pb.id_tarif,
          pb.id_petugas,
          pb.jumlah_bayar,
          pb.biaya_total,
          pb.tanggal_bayar,
          pt.nama_petugas,
          pm.bulan   AS bulan,
          pm.tahun   AS tahun,
          t.jenis_pelanggan  AS tarif_jenis,
          t.tarif_kwh,
          t.biaya_beban      AS tarif_biaya_beban
         FROM pembayaran pb
         LEFT JOIN pemakaian pm    ON pb.id_pemakaian = pm.id_pemakaian
         JOIN  petugas_loket pt    ON pb.id_petugas  = pt.id_petugas
         JOIN  tarif t             ON pb.id_tarif    = t.id_tarif
        WHERE pb.no_kontrol = ?
        ORDER BY pb.tanggal_bayar DESC`,
      [noKontrol],
    );

    const pemakaianLengkap = pemakaian.map((item) => ({
      id_pemakaian: item.id_pemakaian,
      no_kontrol: item.no_kontrol,
      tahun: Number(item.tahun),
      bulan: item.bulan,
      meter_awal: item.meter_awal,
      meter_akhir: item.meter_akhir,
      jumlah_pakai: item.jumlah_pakai,
      biaya_beban_pemakaian: BillingUtil.toNumber(item.biaya_beban_pemakaian),
      biaya_pemakaian: BillingUtil.toNumber(item.biaya_pemakaian),
      biaya_total: BillingUtil.toNumber(item.biaya_total),
      // ← flag ini yang dipakai frontend, tidak perlu tebak-tebak
      sudah_bayar: item.sudah_bayar === 1,
      pembayaran_id: item.pembayaran_id ?? null,
      tanggal_bayar: item.tanggal_bayar ?? null,
      jumlah_bayar: item.jumlah_bayar ? BillingUtil.toNumber(item.jumlah_bayar) : null,
      nama_petugas_bayar: item.nama_petugas_bayar ?? null,
    }));

    const pembayaranLengkap = pembayaran.map((item) => ({
      id_pembayaran: item.id_pembayaran,
      id_pemakaian: item.id_pemakaian,
      no_kontrol: item.no_kontrol,
      jumlah_bayar: BillingUtil.toNumber(item.jumlah_bayar),
      biaya_total: BillingUtil.toNumber(item.biaya_total),
      tanggal_bayar: item.tanggal_bayar,
      nama_petugas: item.nama_petugas,
      bulan: item.bulan ? Number(item.bulan) : null,
      tahun: item.tahun ? Number(item.tahun) : null,
      tarif_jenis: item.tarif_jenis,
      tarif_kwh: BillingUtil.toNumber(item.tarif_kwh),
      tarif_biaya_beban: BillingUtil.toNumber(item.tarif_biaya_beban),
    }));

    return ResponseUtil.success(
      {
        pelanggan,
        pemakaian: pemakaianLengkap,
        pembayaran: pembayaranLengkap,
        ringkasan: hitungRingkasan(pemakaian, pembayaran),
      },
      'Riwayat pelanggan berhasil diambil',
    );
  } catch (e) {
    console.error('[GET /api/pelanggan/riwayat]', e);
    return ResponseUtil.error('Terjadi kesalahan saat mengambil riwayat pelanggan', 500);
  }
}
