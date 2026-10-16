// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Kelas Database untuk mengelola koneksi MySQL menggunakan connection pool
 */
class Database {
  constructor() {
    this.pool = null;
  }

  /**
   * Inisialisasi connection pool MySQL
   * @returns {Promise<import('mysql2/promise').Pool>}
   */
  async init() {
    if (this.pool) return this.pool;
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'db_listrik',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        dateStrings: true,
      });
      const conn = await this.pool.getConnection();
      await conn.ping();
      conn.release();
      return this.pool;
    } catch (error) {
      throw new Error("Gagal inisialisasi DB: " + error.message);
    }
  }

  /**
   * Ambil pool koneksi
   * @returns {Promise<import('mysql2/promise').Pool>}
   */
  async getPool() {
    if (!this.pool) await this.init();
    return this.pool;
  }

  /**
   * Jalankan query
   * @param {string} sql
   * @param {Array<any>} [params=[]]
   * @returns {Promise<any>}
   */
  async query(sql, params = []) {
    const pool = await this.getPool();
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  /**
   * Ambil 1 baris
   * @param {string} sql
   * @param {Array<any>} [params=[]]
   * @returns {Promise<any|null>}
   */
  async queryOne(sql, params = []) {
    const res = await this.query(sql, params);
    return res.length > 0 ? res[0] : null;
  }

  /**
   * Tutup pool
   * @returns {Promise<void>}
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

const db = new Database();
module.exports = db;
