// app/api/admin/ringkasan/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');
const BillingUtil = require('../../../../utils/billing');

/**
 * GET /api/admin/ringkasan
 * Mengambil statistik ringkasan untuk kartu stat di dashboard admin:
 * total pelanggan, total pendapatan, tagihan belum dibayar, petugas aktif,
 * dan 5 pembayaran terbaru.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function GET(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    const [[{ total_pelanggan }]] = await (await db.getPool()).execute(
      'SELECT COUNT(*) AS total_pelanggan FROM pelanggan',
    );

    const [[{ total_pendapatan, total_transaksi }]] = await (await db.getPool()).execute(
      'SELECT COALESCE(SUM(jumlah_bayar), 0) AS total_pendapatan, COUNT(*) AS total_transaksi FROM pembayaran',
    );

    // Tagihan belum dibayar: pemakaian yang belum ada pasangan pembayaran di periode yang sama
    const [[{ tagihan_belum_bayar }]] = await (await db.getPool()).execute(`
      SELECT COUNT(*) AS tagihan_belum_bayar
        FROM pemakaian pm
       WHERE NOT EXISTS (
         SELECT 1 FROM pembayaran pb
          WHERE pb.no_kontrol = pm.no_kontrol
            AND YEAR(pb.tanggal_bayar) = pm.tahun
            AND MONTH(pb.tanggal_bayar) = pm.bulan
       )
    `);

    const [[{ total_petugas }]] = await (await db.getPool()).execute(
      "SELECT COUNT(*) AS total_petugas FROM petugas_loket WHERE role = 'petugas'",
    );

    const pembayaranTerbaru = await db.query(`
      SELECT pb.id_pembayaran, pb.no_kontrol, pb.jumlah_bayar, pb.biaya_total, pb.tanggal_bayar,
             pl.nama_pelanggan, pt.nama_petugas, pm.bulan, pm.tahun
        FROM pembayaran pb
        JOIN pelanggan pl ON pb.no_kontrol = pl.no_kontrol
        JOIN petugas_loket pt ON pb.id_petugas = pt.id_petugas
        LEFT JOIN pemakaian pm ON pm.no_kontrol = pb.no_kontrol
                              AND pm.id_pemakaian = (
                                SELECT MAX(id_pemakaian) FROM pemakaian
                                 WHERE no_kontrol = pb.no_kontrol
                                   AND YEAR(pb.tanggal_bayar) = tahun
                              )
       ORDER BY pb.tanggal_bayar DESC
       LIMIT 5
    `);

    const tarifBerlaku = await db.query(
      'SELECT id_tarif, jenis_pelanggan, biaya_beban, tarif_kwh FROM tarif ORDER BY id_tarif ASC',
    );

    return ResponseUtil.success(
      {
        total_pelanggan: Number(total_pelanggan),
        total_pendapatan: BillingUtil.toNumber(total_pendapatan),
        total_transaksi: Number(total_transaksi),
        tagihan_belum_bayar: Number(tagihan_belum_bayar),
        total_petugas: Number(total_petugas),
        pembayaran_terbaru: pembayaranTerbaru.map((r) => ({
          ...r,
          jumlah_bayar: BillingUtil.toNumber(r.jumlah_bayar),
          biaya_total: BillingUtil.toNumber(r.biaya_total),
        })),
        tarif_berlaku: tarifBerlaku.map((t) => ({
          ...t,
          biaya_beban: BillingUtil.toNumber(t.biaya_beban),
          tarif_kwh: BillingUtil.toNumber(t.tarif_kwh),
        })),
      },
      'Ringkasan berhasil diambil',
    );
  } catch (e) {
    console.error('[GET /api/admin/ringkasan]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}
