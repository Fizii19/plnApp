// app/api/auth/me/route.js
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');

/**
 * GET /api/auth/me
 */
export async function GET(req) {
  try {
    const auth = AuthUtil.authenticate(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);
    return ResponseUtil.success(auth.user, 'Data user berhasil diambil');
  } catch (e) {
    console.error(e);
    return ResponseUtil.error('Terjadi kesalahan', 500);
  }
}
