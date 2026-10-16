// app/api/auth/login/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');

/**
 * Kata sandi bersama untuk seluruh akun pelanggan.
 * Disimpan sebagai konstanta server-side — tidak pernah dikirim ke klien.
 * Ubah nilai ini (dan env var PASSWORD_PELANGGAN) sesuai kebutuhan produksi.
 */
const PASSWORD_PELANGGAN = process.env.PASSWORD_PELANGGAN || 'pelanggan123';

/**
 * POST /api/auth/login
 * ──────────────────────────────────────────────────────────────────────────
 * Autentikasi tiga peran:
 *   1. admin / petugas — cocokkan username + bcrypt(password) di petugas_loket.
 *   2. pelanggan       — username = no_kontrol (angka), password = kata sandi umum.
 *
 * Menggunakan Prepared Statements untuk mencegah SQL Injection.
 *
 * Body JSON:
 *   { username: string, password: string }
 *
 * Response (200):
 *   { success: true, data: { token, user: { id, nama, username, role, noKontrol? } } }
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return ResponseUtil.badRequest('Body request harus berupa JSON yang valid');
    }

    const username = (body.username ?? '').trim();
    const password = (body.password ?? '').trim();

    if (!username || !password) {
      return ResponseUtil.badRequest('Username dan password wajib diisi');
    }

    // ── Langkah 1: Coba login sebagai admin/petugas ──────────────────────
    const petugas = await db.queryOne(
      `SELECT id_petugas, nama_petugas, username, password, role
         FROM petugas_loket
        WHERE username = ?
        LIMIT 1`,
      [username],
    );

    if (petugas) {
      const passwordValid = await AuthUtil.comparePassword(password, petugas.password);
      if (!passwordValid) {
        return ResponseUtil.unauthorized('Username atau password salah');
      }

      const token = AuthUtil.generateToken(petugas);
      // Jangan kirimkan hash password ke klien
      return ResponseUtil.success(
        {
          token,
          user: {
            id: petugas.id_petugas,
            nama: petugas.nama_petugas,
            username: petugas.username,
            role: petugas.role,          // "admin" | "petugas"
          },
        },
        'Login berhasil',
      );
    }

    // ── Langkah 2: Coba login sebagai pelanggan (username = no_kontrol) ──
    const noKontrol = Number(username);
    if (Number.isInteger(noKontrol) && noKontrol > 0 && password === PASSWORD_PELANGGAN) {
      const pelanggan = await db.queryOne(
        `SELECT no_kontrol, nama_pelanggan, jenis_pelanggan
           FROM pelanggan
          WHERE no_kontrol = ?
          LIMIT 1`,
        [noKontrol],
      );

      if (pelanggan) {
        // Buat token khusus pelanggan (tanpa id_petugas)
        const tokenPelanggan = AuthUtil.generateTokenPelanggan(pelanggan);
        return ResponseUtil.success(
          {
            token: tokenPelanggan,
            user: {
              id: null,
              nama: pelanggan.nama_pelanggan,
              username: String(pelanggan.no_kontrol),
              role: 'pelanggan',
              noKontrol: pelanggan.no_kontrol,
            },
          },
          'Login berhasil',
        );
      }
    }

    // ── Tidak cocok di kedua tabel ────────────────────────────────────────
    return ResponseUtil.unauthorized('Username atau password salah');
  } catch (e) {
    console.error('[POST /api/auth/login]', e);
    return ResponseUtil.error('Terjadi kesalahan saat login', 500);
  }
}
