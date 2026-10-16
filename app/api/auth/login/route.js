// app/api/auth/login/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');

/**
 * POST /api/auth/login
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password } = body;
    if (!username || !password) {
      return ResponseUtil.badRequest('Username dan password wajib diisi');
    }
    const user = await db.queryOne(
      'SELECT id_petugas, nama_petugas, username, password, role FROM petugas_loket WHERE username = ?',
      [username]
    );
    if (!user) return ResponseUtil.unauthorized('Username atau password salah');
    const ok = await AuthUtil.comparePassword(password, user.password);
    if (!ok) return ResponseUtil.unauthorized('Username atau password salah');
    const token = AuthUtil.generateToken(user);
    const { password: _, ...u } = user;
    return ResponseUtil.success({ token, user: u }, 'Login berhasil');
  } catch (e) {
    console.error(e);
    return ResponseUtil.error('Terjadi kesalahan saat login', 500);
  }
}
