// scripts/migrate.js
// Menjalankan SEMUA file .sql di folder migrations/ secara berurutan.
// Idempoten: file yang sudah pernah diterapkan dicatat di tabel
// schema_migrations sehingga seed INSERT IGNORE tidak menduplikasi data
// saat script dijalankan ulang.
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

/**
 * Membuang baris komentar SQL (diawali --) dari isi file migrasi.
 * Tanpa ini, statement yang diawali komentar terbuang saat split ';' dan
 * migrasi terlewat diam-diam (bug yang menyebabkan kolom id_pemakaian hilang).
 * @param {string} sql - Isi file .sql.
 * @returns {string} SQL tanpa baris komentar.
 */
function buangKomentar(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

async function runMigration() {
  try {
    console.log('[MIGRASI] Mulai...');
    await db.init();

    // Tabel pelacak migrasi yang sudah diterapkan.
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nama_file VARCHAR(255) PRIMARY KEY,
        diterapkan TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const [rows] = await (await db.getPool()).query('SELECT nama_file FROM schema_migrations');
    const sudahDiterapkan = new Set(rows.map((r) => r.nama_file));

    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (sudahDiterapkan.has(file)) {
        console.log(`[MIGRASI] Lewat (sudah diterapkan): ${file}`);
        continue;
      }

      console.log(`[MIGRASI] Menjalankan ${file}...`);
      const sql = buangKomentar(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // Setiap statement dicoba; kegagalan dicatat tapi tidak menghentikan
      // migrasi berikutnya (mis. "table already exists" saat DB lama).
      for (const statement of statements) {
        try {
          await db.query(statement);
        } catch (e) {
          console.warn(`[MIGRASI] ${file}: ${e.message}`);
        }
      }

      await db.query('INSERT IGNORE INTO schema_migrations (nama_file) VALUES (?)', [file]);
      console.log(`[MIGRASI] Selesai: ${file}`);
    }

    console.log('[MIGRASI] Semua migrasi selesai');
    await db.close();
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
runMigration();
