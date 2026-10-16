// app/api/admin/tarif/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');

/**
 * GET /api/admin/tarif — Daftar seluruh tarif.
 * @param {Request} req
 */
export async function GET(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);

    const rows = await db.query(
      'SELECT id_tarif, jenis_pelanggan, biaya_beban, tarif_kwh FROM tarif ORDER BY id_tarif ASC',
    );
    return ResponseUtil.success(rows, 'Data tarif berhasil diambil');
  } catch (e) {
    console.error('[GET /api/admin/tarif]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * POST /api/admin/tarif — Tambah tarif baru.
 * Body: { jenis_pelanggan, biaya_beban, tarif_kwh }
 * @param {Request} req
 */
export async function POST(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    let body;
    try { body = await req.json(); } catch { return ResponseUtil.badRequest('Body harus JSON'); }

    const { jenis_pelanggan, biaya_beban, tarif_kwh } = body;
    if (!jenis_pelanggan || biaya_beban === undefined || tarif_kwh === undefined) {
      return ResponseUtil.badRequest('jenis_pelanggan, biaya_beban, tarif_kwh wajib diisi');
    }

    const [result] = await (await db.getPool()).execute(
      'INSERT INTO tarif (jenis_pelanggan, biaya_beban, tarif_kwh) VALUES (?, ?, ?)',
      [jenis_pelanggan, Number(biaya_beban), Number(tarif_kwh)],
    );

    const created = await db.queryOne('SELECT * FROM tarif WHERE id_tarif = ?', [result.insertId]);
    return ResponseUtil.success(created, 'Tarif berhasil ditambahkan', 201);
  } catch (e) {
    console.error('[POST /api/admin/tarif]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * PUT /api/admin/tarif — Ubah tarif berdasarkan id_tarif.
 * @param {Request} req
 */
export async function PUT(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    let body;
    try { body = await req.json(); } catch { return ResponseUtil.badRequest('Body harus JSON'); }

    const { id_tarif, jenis_pelanggan, biaya_beban, tarif_kwh } = body;
    if (!id_tarif || !jenis_pelanggan || biaya_beban === undefined || tarif_kwh === undefined) {
      return ResponseUtil.badRequest('Semua field wajib diisi');
    }

    await db.query(
      'UPDATE tarif SET jenis_pelanggan=?, biaya_beban=?, tarif_kwh=? WHERE id_tarif=?',
      [jenis_pelanggan, Number(biaya_beban), Number(tarif_kwh), id_tarif],
    );
    return ResponseUtil.success(null, 'Tarif berhasil diperbarui');
  } catch (e) {
    console.error('[PUT /api/admin/tarif]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * DELETE /api/admin/tarif?id_tarif=<n>
 * @param {Request} req
 */
export async function DELETE(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    const { searchParams } = new URL(req.url);
    const idTarif = Number(searchParams.get('id_tarif'));
    if (!idTarif) return ResponseUtil.badRequest('id_tarif tidak valid');

    await db.query('DELETE FROM tarif WHERE id_tarif = ?', [idTarif]);
    return ResponseUtil.success(null, 'Tarif berhasil dihapus');
  } catch (e) {
    console.error('[DELETE /api/admin/tarif]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}
