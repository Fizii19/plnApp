// app/api/admin/petugas/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');

/**
 * GET /api/admin/petugas — Daftar seluruh petugas loket.
 * @param {Request} req
 */
export async function GET(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    const rows = await db.query(
      'SELECT id_petugas, nama_petugas, jenis_kelamin, no_hp, username, role FROM petugas_loket ORDER BY id_petugas ASC',
    );
    return ResponseUtil.success(rows, 'Data petugas berhasil diambil');
  } catch (e) {
    console.error('[GET /api/admin/petugas]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * POST /api/admin/petugas — Tambah petugas baru.
 * Body: { nama_petugas, jenis_kelamin, no_hp, username, password, role }
 * @param {Request} req
 */
export async function POST(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    let body;
    try { body = await req.json(); } catch { return ResponseUtil.badRequest('Body harus JSON'); }

    const { nama_petugas, jenis_kelamin, no_hp, username, password, role } = body;
    if (!nama_petugas || !jenis_kelamin || !username || !password) {
      return ResponseUtil.badRequest('nama_petugas, jenis_kelamin, username, password wajib diisi');
    }

    const existing = await db.queryOne('SELECT username FROM petugas_loket WHERE username = ?', [username]);
    if (existing) return ResponseUtil.error('Username sudah digunakan', 409);

    const hashedPwd = await AuthUtil.hashPassword(password);

    const [result] = await (await db.getPool()).execute(
      `INSERT INTO petugas_loket (nama_petugas, jenis_kelamin, no_hp, username, password, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nama_petugas.trim(), jenis_kelamin, (no_hp || '').trim(), username.trim(), hashedPwd, role || 'petugas'],
    );

    const created = await db.queryOne(
      'SELECT id_petugas, nama_petugas, jenis_kelamin, no_hp, username, role FROM petugas_loket WHERE id_petugas = ?',
      [result.insertId],
    );
    return ResponseUtil.success(created, 'Petugas berhasil ditambahkan', 201);
  } catch (e) {
    console.error('[POST /api/admin/petugas]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * PUT /api/admin/petugas — Ubah data petugas.
 * Bila password dikirim, password lama akan di-hash ulang.
 * @param {Request} req
 */
export async function PUT(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    let body;
    try { body = await req.json(); } catch { return ResponseUtil.badRequest('Body harus JSON'); }

    const { id_petugas, nama_petugas, jenis_kelamin, no_hp, username, password, role } = body;
    if (!id_petugas || !nama_petugas || !jenis_kelamin || !username) {
      return ResponseUtil.badRequest('Semua field wajib diisi kecuali password');
    }

    if (password && password.trim()) {
      const hashedPwd = await AuthUtil.hashPassword(password.trim());
      await db.query(
        'UPDATE petugas_loket SET nama_petugas=?, jenis_kelamin=?, no_hp=?, username=?, password=?, role=? WHERE id_petugas=?',
        [nama_petugas.trim(), jenis_kelamin, (no_hp || '').trim(), username.trim(), hashedPwd, role || 'petugas', id_petugas],
      );
    } else {
      await db.query(
        'UPDATE petugas_loket SET nama_petugas=?, jenis_kelamin=?, no_hp=?, username=?, role=? WHERE id_petugas=?',
        [nama_petugas.trim(), jenis_kelamin, (no_hp || '').trim(), username.trim(), role || 'petugas', id_petugas],
      );
    }

    return ResponseUtil.success(null, 'Petugas berhasil diperbarui');
  } catch (e) {
    console.error('[PUT /api/admin/petugas]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}

/**
 * DELETE /api/admin/petugas?id_petugas=<n>
 * @param {Request} req
 */
export async function DELETE(req) {
  try {
    const auth = AuthUtil.authenticateStaff(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    if (auth.user.role !== 'admin') return ResponseUtil.forbidden('Hanya admin');

    const { searchParams } = new URL(req.url);
    const idPetugas = Number(searchParams.get('id_petugas'));
    if (!idPetugas) return ResponseUtil.badRequest('id_petugas tidak valid');

    await db.query('DELETE FROM petugas_loket WHERE id_petugas = ?', [idPetugas]);
    return ResponseUtil.success(null, 'Petugas berhasil dihapus');
  } catch (e) {
    console.error('[DELETE /api/admin/petugas]', e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}
