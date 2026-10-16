// app/api/admin/pelanggan/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');

/**
 * GET /api/admin/pelanggan
 * Mengambil seluruh data pelanggan.
 * Hanya dapat diakses oleh admin.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function GET(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin yang dapat mengakses');

    const rows = await db.query(
      `SELECT no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan
         FROM pelanggan
        ORDER BY no_kontrol ASC`,
    );
    return ResponseUtil.success(rows, 'Data pelanggan berhasil diambil');
  } catch (e) {
    console.error('[GET /api/admin/pelanggan]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * POST /api/admin/pelanggan
 * Menambah pelanggan baru.
 * Dapat diakses oleh admin DAN petugas (untuk pendaftaran pelanggan baru di loket).
 *
 * Body: { no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan }
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function POST(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);

    let body;
    try { body = await req.json(); } catch {
      return ResponseUtil.badRequest('Body harus berupa JSON');
    }

    const { no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan } = body;

    if (!no_kontrol || !nama_pelanggan || !alamat_pelanggan || !jenis_pelanggan) {
      return ResponseUtil.badRequest('no_kontrol, nama_pelanggan, alamat_pelanggan, jenis_pelanggan wajib diisi');
    }

    const noKontrol = Number(no_kontrol);
    if (!Number.isInteger(noKontrol) || noKontrol <= 0) {
      return ResponseUtil.badRequest('no_kontrol harus berupa angka positif');
    }

    const jenisDiizinkan = ['Rumah Tangga', 'Niaga', 'Industri', 'Sosial'];
    if (!jenisDiizinkan.includes(jenis_pelanggan)) {
      return ResponseUtil.badRequest(`jenis_pelanggan harus salah satu dari: ${jenisDiizinkan.join(', ')}`);
    }

    // Cek duplikat no_kontrol
    const existing = await db.queryOne(
      'SELECT no_kontrol FROM pelanggan WHERE no_kontrol = ?',
      [noKontrol],
    );
    if (existing) {
      return ResponseUtil.error(`No kontrol ${noKontrol} sudah terdaftar`, 409);
    }

    await db.query(
      `INSERT INTO pelanggan (no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan)
       VALUES (?, ?, ?, ?, ?)`,
      [noKontrol, nama_pelanggan.trim(), alamat_pelanggan.trim(), (no_tlp_pelanggan || '').trim(), jenis_pelanggan],
    );

    const created = await db.queryOne(
      'SELECT no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan FROM pelanggan WHERE no_kontrol = ?',
      [noKontrol],
    );

    return ResponseUtil.success(created, 'Pelanggan berhasil ditambahkan', 201);
  } catch (e) {
    console.error('[POST /api/admin/pelanggan]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * PUT /api/admin/pelanggan
 * Mengubah data pelanggan berdasarkan no_kontrol.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function PUT(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    let body;
    try { body = await req.json(); } catch {
      return ResponseUtil.badRequest('Body harus JSON');
    }

    const { no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan } = body;
    if (!no_kontrol || !nama_pelanggan || !alamat_pelanggan || !jenis_pelanggan) {
      return ResponseUtil.badRequest('Semua field wajib diisi');
    }

    const existing = await db.queryOne('SELECT no_kontrol FROM pelanggan WHERE no_kontrol = ?', [no_kontrol]);
    if (!existing) return ResponseUtil.notFound('Pelanggan tidak ditemukan');

    await db.query(
      `UPDATE pelanggan SET nama_pelanggan=?, alamat_pelanggan=?, no_tlp_pelanggan=?, jenis_pelanggan=?
        WHERE no_kontrol=?`,
      [nama_pelanggan.trim(), alamat_pelanggan.trim(), (no_tlp_pelanggan || '').trim(), jenis_pelanggan, no_kontrol],
    );

    return ResponseUtil.success(null, 'Pelanggan berhasil diperbarui');
  } catch (e) {
    console.error('[PUT /api/admin/pelanggan]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * DELETE /api/admin/pelanggan?no_kontrol=<n>
 * Menghapus pelanggan beserta pemakaian & pembayarannya.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function DELETE(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    const { searchParams } = new URL(req.url);
    const noKontrol = Number(searchParams.get('no_kontrol'));
    if (!Number.isInteger(noKontrol) || noKontrol <= 0) {
      return ResponseUtil.badRequest('Parameter no_kontrol tidak valid');
    }

    const existing = await db.queryOne('SELECT no_kontrol FROM pelanggan WHERE no_kontrol = ?', [noKontrol]);
    if (!existing) return ResponseUtil.notFound('Pelanggan tidak ditemukan');

    // Hapus child records terlebih dahulu (FK constraint)
    await db.query('DELETE FROM pembayaran WHERE no_kontrol = ?', [noKontrol]);
    await db.query('DELETE FROM pemakaian WHERE no_kontrol = ?', [noKontrol]);
    await db.query('DELETE FROM pelanggan WHERE no_kontrol = ?', [noKontrol]);

    return ResponseUtil.success(null, 'Pelanggan berhasil dihapus');
  } catch (e) {
    console.error('[DELETE /api/admin/pelanggan]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}
