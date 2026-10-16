// utils/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

/**
 * AuthUtil — Utilitas autentikasi server-side.
 * Menyediakan hashing bcrypt, penerbitan JWT, dan verifikasi token
 * untuk semua API route aplikasi SIP Listrik.
 */
class AuthUtil {
  /**
   * Hash password menggunakan bcrypt.
   *
   * @param {string} password - Password plain-text.
   * @param {number} [saltRounds=12] - Jumlah putaran salt (produksi ≥ 12).
   * @returns {Promise<string>} Hash bcrypt yang aman disimpan ke database.
   */
  static async hashPassword(password, saltRounds = 12) {
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Membandingkan password plain-text dengan hash bcrypt yang tersimpan.
   *
   * @param {string} password - Password plain-text dari form login.
   * @param {string} hash - Hash bcrypt dari database.
   * @returns {Promise<boolean>} true bila password cocok.
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Menerbitkan JWT untuk akun admin / petugas loket.
   *
   * @param {{ id_petugas: number, username: string, role: string, nama_petugas: string }} user
   * @returns {string} JWT yang ditandatangani.
   */
  static generateToken(user) {
    const payload = {
      id_petugas: user.id_petugas,
      username: user.username,
      role: user.role,
      nama_petugas: user.nama_petugas,
    };
    const secret = process.env.JWT_SECRET || 'default_secret_change_in_production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Menerbitkan JWT untuk akun pelanggan (login via no_kontrol).
   *
   * @param {{ no_kontrol: number, nama_pelanggan: string, jenis_pelanggan: string }} pelanggan
   * @returns {string} JWT yang ditandatangani.
   */
  static generateTokenPelanggan(pelanggan) {
    const payload = {
      id_petugas: null,
      username: String(pelanggan.no_kontrol),
      role: 'pelanggan',
      nama_petugas: pelanggan.nama_pelanggan,
      no_kontrol: pelanggan.no_kontrol,
    };
    const secret = process.env.JWT_SECRET || 'default_secret_change_in_production';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Memverifikasi JWT dan mengembalikan payload yang di-decode.
   *
   * @param {string} token - JWT yang akan diverifikasi.
   * @returns {Object|null} Payload decoded, atau null bila token tidak valid / kadaluarsa.
   */
  static verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'default_secret_change_in_production';
      return jwt.verify(token, secret);
    } catch {
      return null;
    }
  }

  /**
   * Mengekstrak token Bearer dari header Authorization request.
   *
   * @param {Request} req - Objek Request Next.js App Router.
   * @returns {string|null} String token, atau null bila header tidak ada / tidak valid.
   */
  static extractTokenFromHeader(req) {
    const h = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!h) return null;
    const [type, token] = h.split(' ');
    if (type !== 'Bearer' || !token) return null;
    return token;
  }

  /**
   * Mengautentikasi request berdasarkan JWT di header Authorization.
   * Dipakai sebagai guard di setiap API route yang memerlukan login.
   *
   * @param {Request} req - Objek Request Next.js App Router.
   * @returns {{ isValid: boolean, user: Object|null, error: string|null }}
   */
  static authenticate(req) {
    const token = this.extractTokenFromHeader(req);
    if (!token) {
      return { isValid: false, user: null, error: 'Token tidak ditemukan' };
    }
    const decoded = this.verifyToken(token);
    if (!decoded) {
      return { isValid: false, user: null, error: 'Token tidak valid atau kadaluarsa' };
    }
    return { isValid: true, user: decoded, error: null };
  }

  /**
   * Memeriksa apakah request berasal dari admin atau petugas loket.
   * Dipakai di route yang hanya boleh diakses staf (bukan pelanggan).
   *
   * @param {Request} req
   * @returns {{ isValid: boolean, user: Object|null, error: string|null }}
   */
  static authenticateStaff(req) {
    const result = this.authenticate(req);
    if (!result.isValid) return result;
    if (result.user.role === 'pelanggan') {
      return { isValid: false, user: null, error: 'Akses ditolak: bukan staf' };
    }
    return result;
  }
}

module.exports = AuthUtil;
