// scripts/migrate.js
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
  try {
    console.log('[MIGRASI] Mulai...');
    await db.init();
    const sqlPath = path.join(__dirname, '../migrations/001_create_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));
    for (let i = 0; i < statements.length; i++) {
      try {
        await db.query(statements[i]);
      } catch (e) {
        console.warn(e.message);
      }
    }
    console.log('[MIGRASI] Selesai');
    await db.close();
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
runMigration();
