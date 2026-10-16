// app/api/admin/pemakaian/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');
const BillingUtil = require('../../../../utils/billing');

/**
 * GET /api/admin/pemakaian — Seluruh data pemakaian dengan nama pelanggan.
 * @param {Request} req
 */
export async function GET(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);

    const rows = await db.query(
      `SELECT pm.id_pemakaian, pm.no_kontrol, pl.nama_pelanggan,
              pm.tahun, pm.bulan, pm.meter_awal, pm.meter_akhir,
              pm.jumlah_pakai, pm.biaya_beban_pemakaian, pm.biaya_pemakaian
         FROM pemakaian pm
         JOIN pelanggan pl ON pm.no_kontrol = pl.no_kontrol
        ORDER BY pm.tahun DESC, pm.bulan DESC, pm.no_kontrol ASC`,
    );

    const hasil = rows.map((r) => ({
      ...r,
      biaya_beban_pemakaian: BillingUtil.toNumber(r.biaya_beban_pemakaian),
      biaya_pemakaian: BillingUtil.toNumber(r.biaya_pemakaian),
    }));

    return ResponseUtil.success(hasil, 'Data pemakaian berhasil diambil');
  } catch (e) {
    console.error('[GET /api/admin/pemakaian]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * POST /api/admin/pemakaian — Tambah catatan pemakaian.
 * Body: { no_kontrol, tahun, bulan, meter_awal, meter_akhir }
 * Biaya dihitung otomatis dari tarif pelanggan.
 * @param {Request} req
 */
export async function POST(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    let body;
    try { body = await req.json(); } catch { return ResponseUtil.badRequest('Body harus JSON'); }

    const { no_kontrol, tahun, bulan, meter_awal, meter_akhir } = body;
    if (!no_kontrol || !tahun || !bulan || meter_awal === undefined || meter_akhir === undefined) {
      return ResponseUtil.badRequest('no_kontrol, tahun, bulan, meter_awal, meter_akhir wajib diisi');
    }

    const pelanggan = await db.queryOne('SELECT jenis_pelanggan FROM pelanggan WHERE no_kontrol = ?', [no_kontrol]);
    if (!pelanggan) return ResponseUtil.notFound('Pelanggan tidak ditemukan');

    const tarif = await db.queryOne(
      'SELECT biaya_beban, tarif_kwh FROM tarif WHERE jenis_pelanggan = ? ORDER BY id_tarif DESC LIMIT 1',
      [pelanggan.jenis_pelanggan],
    );
    if (!tarif) return ResponseUtil.badRequest('Tarif untuk jenis pelanggan ini belum diatur');

    const rincian = BillingUtil.hitungRincianTagihan(tarif.biaya_beban, tarif.tarif_kwh, meter_awal, meter_akhir);

    const duplikat = await db.queryOne(
      'SELECT id_pemakaian FROM pemakaian WHERE no_kontrol=? AND tahun=? AND bulan=?',
      [no_kontrol, tahun, bulan],
    );
    if (duplikat) return ResponseUtil.error('Periode ini sudah tercatat', 409);

    const [result] = await (await db.getPool()).execute(
      `INSERT INTO pemakaian (no_kontrol, tahun, bulan, meter_awal, meter_akhir, jumlah_pakai, biaya_beban_pemakaian, biaya_pemakaian)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [no_kontrol, tahun, bulan, meter_awal, meter_akhir, rincian.jumlah_pakai, rincian.biaya_beban, rincian.biaya_pemakaian],
    );

    return ResponseUtil.success({ id_pemakaian: result.insertId, ...rincian }, 'Pemakaian berhasil ditambahkan', 201);
  } catch (e) {
    console.error('[POST /api/admin/pemakaian]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * PUT /api/admin/pemakaian — Ubah catatan pemakaian.
 * @param {Request} req
 */
export async function PUT(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    let body;
    try { body = await req.json(); } catch { return ResponseUtil.badRequest('Body harus JSON'); }

    const { id_pemakaian, no_kontrol, tahun, bulan, meter_awal, meter_akhir } = body;
    if (!id_pemakaian || !no_kontrol || !tahun || !bulan || meter_awal === undefined || meter_akhir === undefined) {
      return ResponseUtil.badRequest('Semua field wajib diisi');
    }

    const pelanggan = await db.queryOne('SELECT jenis_pelanggan FROM pelanggan WHERE no_kontrol = ?', [no_kontrol]);
    if (!pelanggan) return ResponseUtil.notFound('Pelanggan tidak ditemukan');

    const tarif = await db.queryOne(
      'SELECT biaya_beban, tarif_kwh FROM tarif WHERE jenis_pelanggan = ? ORDER BY id_tarif DESC LIMIT 1',
      [pelanggan.jenis_pelanggan],
    );
    if (!tarif) return ResponseUtil.badRequest('Tarif belum diatur');

    const rincian = BillingUtil.hitungRincianTagihan(tarif.biaya_beban, tarif.tarif_kwh, meter_awal, meter_akhir);

    await db.query(
      `UPDATE pemakaian SET no_kontrol=?, tahun=?, bulan=?, meter_awal=?, meter_akhir=?,
              jumlah_pakai=?, biaya_beban_pemakaian=?, biaya_pemakaian=?
        WHERE id_pemakaian=?`,
      [no_kontrol, tahun, bulan, meter_awal, meter_akhir, rincian.jumlah_pakai, rincian.biaya_beban, rincian.biaya_pemakaian, id_pemakaian],
    );

    return ResponseUtil.success(null, 'Pemakaian berhasil diperbarui');
  } catch (e) {
    console.error('[PUT /api/admin/pemakaian]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * DELETE /api/admin/pemakaian?id_pemakaian=<n>
 * @param {Request} req
 */
export async function DELETE(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    const { searchParams } = new URL(req.url);
    const idPemakaian = Number(searchParams.get('id_pemakaian'));
    if (!idPemakaian) return ResponseUtil.badRequest('id_pemakaian tidak valid');

    await db.query('DELETE FROM pemakaian WHERE id_pemakaian = ?', [idPemakaian]);
    return ResponseUtil.success(null, 'Pemakaian berhasil dihapus');
  } catch (e) {
    console.error('[DELETE /api/admin/pemakaian]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}
