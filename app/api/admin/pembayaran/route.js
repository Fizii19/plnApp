// app/api/admin/pembayaran/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');
const BillingUtil = require('../../../../utils/billing');

/**
 * GET /api/admin/pembayaran — Seluruh data pembayaran dengan join.
 * @param {Request} req
 */
export async function GET(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);

    const rows = await db.query(
      `SELECT pb.id_pembayaran, pb.no_kontrol, pb.id_tarif, pb.id_petugas,
              pb.jumlah_bayar, pb.biaya_total, pb.tanggal_bayar,
              pl.nama_pelanggan, pt.nama_petugas,
              t.jenis_pelanggan, t.tarif_kwh,
              pm.bulan, pm.tahun
         FROM pembayaran pb
         JOIN pelanggan pl  ON pb.no_kontrol  = pl.no_kontrol
         JOIN petugas_loket pt ON pb.id_petugas = pt.id_petugas
         JOIN tarif t        ON pb.id_tarif    = t.id_tarif
         LEFT JOIN pemakaian pm ON pm.no_kontrol = pb.no_kontrol
                               AND pm.id_pemakaian = (
                                 SELECT MAX(id_pemakaian) FROM pemakaian
                                  WHERE no_kontrol = pb.no_kontrol
                                    AND YEAR(pb.tanggal_bayar) = tahun
                               )
        ORDER BY pb.tanggal_bayar DESC`,
    );

    const hasil = rows.map((r) => ({
      ...r,
      jumlah_bayar: BillingUtil.toNumber(r.jumlah_bayar),
      biaya_total: BillingUtil.toNumber(r.biaya_total),
      tarif_kwh: BillingUtil.toNumber(r.tarif_kwh),
    }));

    return ResponseUtil.success(hasil, 'Data pembayaran berhasil diambil');
  } catch (e) {
    console.error('[GET /api/admin/pembayaran]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * DELETE /api/admin/pembayaran?id_pembayaran=<n>
 * @param {Request} req
 */
export async function DELETE(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id_pembayaran'));
    if (!id) return ResponseUtil.badRequest('id_pembayaran tidak valid');

    await db.query('DELETE FROM pembayaran WHERE id_pembayaran = ?', [id]);
    return ResponseUtil.success(null, 'Pembayaran berhasil dihapus');
  } catch (e) {
    console.error('[DELETE /api/admin/pembayaran]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}
