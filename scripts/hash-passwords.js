#!/usr/bin/env node
/**
 * scripts/hash-passwords.js
 * ============================================================
 * Script sekali-jalan untuk meng-hash password petugas_loket
 * yang masih tersimpan plain-text ke dalam hash bcrypt.
 *
 * Jalankan SETELAH migrasi tabel awal:
 *   node scripts/hash-passwords.js
 *
 * Script ini aman untuk dijalankan berulang: password yang sudah
 * di-hash (dimulai dengan "$2") tidak akan di-hash ulang.
 * ============================================================
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

/** Password default untuk seed data (ubah sesuai kebutuhan). */
const DEFAULT_PASSWORDS = {
  admin: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  petugas: process.env.DEFAULT_PETUGAS_PASSWORD || 'petugas123',
};

/** Jumlah putaran bcrypt (12 direkomendasikan untuk produksi). */
const SALT_ROUNDS = 12;

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'db_listrik',
    waitForConnections: true,
    connectionLimit: 3,
  });

  try {
    console.log('🔐 Memulai proses hashing password petugas_loket...\n');

    const [rows] = await pool.execute(
      'SELECT id_petugas, username, password, role FROM petugas_loket ORDER BY id_petugas ASC',
    );

    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      // Lewati jika sudah berupa hash bcrypt (dimulai dengan $2a$ atau $2b$)
      if (row.password && row.password.startsWith('$2')) {
        console.log(`  ✓ [SKIP] ${row.username} — sudah berupa hash bcrypt`);
        skipped++;
        continue;
      }

      // Tentukan password yang akan di-hash
      let plainPassword;
      if (row.password && row.password.trim() !== '') {
        plainPassword = row.password.trim();
      } else {
        // Gunakan default berdasarkan role
        plainPassword = row.role === 'admin' ? DEFAULT_PASSWORDS.admin : DEFAULT_PASSWORDS.petugas;
        console.log(`  ⚠️  [WARN] ${row.username} — password kosong, gunakan default: "${plainPassword}"`);
      }

      const hashed = await bcrypt.hash(plainPassword, SALT_ROUNDS);
      await pool.execute(
        'UPDATE petugas_loket SET password = ? WHERE id_petugas = ?',
        [hashed, row.id_petugas],
      );

      console.log(`  ✅ [HASH] ${row.username} (${row.role}) — password berhasil di-hash`);
      updated++;
    }

    console.log(`\n📊 Selesai: ${updated} di-hash, ${skipped} di-skip`);
    console.log('✨ Semua password petugas_loket sudah aman (bcrypt).\n');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
