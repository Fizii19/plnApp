// app/api/pembayaran/cari/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');

/**
 * GET /api/pembayaran/cari
 */
export async function GET(req) {
  try {
    const auth = AuthUtil.authenticate(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);

    const { searchParams } = new URL(req.url);
    const noKontrol = searchParams.get('no_kontrol');
    const tahun = searchParams.get('tahun');
    const bulan = searchParams.get('bulan');

    if (!noKontrol) return ResponseUtil.badRequest('Parameter no_kontrol wajib diisi');
    if (isNaN(noKontrol)) return ResponseUtil.badRequest('Parameter no_kontrol harus angka');

    const pelanggan = await db.queryOne(
      'SELECT no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan FROM pelanggan WHERE no_kontrol = ?',
      [noKontrol]
    );
    if (!pelanggan) return ResponseUtil.notFound('Data pelanggan tidak ditemukan');

    let qP = 'SELECT * FROM pemakaian WHERE no_kontrol = ?';
    const pP = [noKontrol];
    if (tahun) { qP += ' AND tahun = ?'; pP.push(tahun); }
    if (bulan) {
      const b = parseInt(bulan);
      if (isNaN(b) || b < 1 || b > 12) return ResponseUtil.badRequest('Bulan 1-12');
      qP += ' AND bulan = ?'; pP.push(b);
    }
    qP += ' ORDER BY tahun DESC, bulan DESC';
    const pemakaian = await db.query(qP, pP);

    let qB = `SELECT p.*, t.jenis_pelanggan, t.biaya_beban, t.tarif_kwh, pl.nama_petugas, pl.username, pl.role
      FROM pembayaran p
      JOIN tarif t ON p.id_tarif = t.id_tarif
      JOIN petugas_loket pl ON p.id_petugas = pl.id_petugas
      WHERE p.no_kontrol = ?`;
    const pB = [noKontrol];
    if (tahun) { qB += ' AND YEAR(p.tanggal_bayar)=?'; pB.push(tahun); }
    if (bulan) { qB += ' AND MONTH(p.tanggal_bayar)=?'; pB.push(parseInt(bulan)); }
    qB += ' ORDER BY p.tanggal_bayar DESC';
    const pembayaran = await db.query(qB, pB);

    return ResponseUtil.success({ pelanggan, pemakaian, pembayaran }, 'Data ditemukan');
  } catch (e) {
    console.error(e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}
