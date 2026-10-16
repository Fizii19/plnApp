-- ============================================================
-- migrations/002_hash_passwords.sql
-- ============================================================
-- PENTING: Password di tabel petugas_loket HARUS berupa hash bcrypt.
-- Jalankan script `node scripts/hash-passwords.js` untuk mengisi
-- password yang sudah di-hash ke dalam database, JANGAN masukkan
-- plain-text password langsung ke SQL.
--
-- Contoh hash bcrypt untuk "admin123" (bcrypt rounds=12):
--   $2a$12$xxx... (generate dengan AuthUtil.hashPassword)
--
-- Script helper tersedia di scripts/hash-passwords.js
-- ============================================================

-- Pastikan kolom password cukup panjang untuk hash bcrypt (60 karakter)
ALTER TABLE petugas_loket MODIFY COLUMN password VARCHAR(255) NOT NULL;

-- CATATAN: UPDATE password dilakukan via script Node.js, bukan di sini,
-- karena SQL tidak memiliki fungsi bcrypt bawaan.
-- Jalankan: node scripts/hash-passwords.js
