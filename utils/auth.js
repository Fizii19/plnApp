// utils/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

class AuthUtil {
  /**
   * Hash password
   * @param {string} password
   * @param {number} [saltRounds=10]
   */
  static async hashPassword(password, saltRounds = 10) {
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Bandingkan password
   * @param {string} password
   * @param {string} hash
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT
   * @param {Object} user
   */
  static generateToken(user) {
    const payload = {
      id_petugas: user.id_petugas,
      username: user.username,
      role: user.role,
      nama_petugas: user.nama_petugas,
    };
    const secret = process.env.JWT_SECRET || 'default_secret_key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify JWT
   * @param {string} token
   */
  static verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'default_secret_key';
      return jwt.verify(token, secret);
    } catch (e) {
      return null;
    }
  }

  /**
   * Ambil token dari header
   * @param {Request} req
   */
  static extractTokenFromHeader(req) {
    const h = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!h) return null;
    const [t, token] = h.split(' ');
    if (t !== 'Bearer' || !token) return null;
    return token;
  }

  /**
   * Auth request
   * @param {Request} req
   */
  static authenticate(req) {
    const token = this.extractTokenFromHeader(req);
    if (!token) return { isValid: false, user: null, error: 'Token tidak ditemukan' };
    const d = this.verifyToken(token);
    if (!d) return { isValid: false, user: null, error: 'Token tidak valid atau kadaluarsa' };
    return { isValid: true, user: d, error: null };
  }
}

module.exports = AuthUtil;
