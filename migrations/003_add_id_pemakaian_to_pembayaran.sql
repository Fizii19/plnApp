-- ============================================================
-- migrations/003_add_id_pemakaian_to_pembayaran.sql
-- ============================================================
-- Menambah kolom id_pemakaian ke tabel pembayaran agar setiap
-- transaksi bayar terhubung langsung ke periode pemakaian yang dibayar.
-- Ini menghilangkan ambiguitas matching bulan/tahun via tanggal_bayar.
-- ============================================================

ALTER TABLE pembayaran
  ADD COLUMN id_pemakaian INT NULL
    AFTER no_kontrol,
  ADD CONSTRAINT fk_pembayaran_pemakaian
    FOREIGN KEY (id_pemakaian) REFERENCES pemakaian(id_pemakaian)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- Update seed data: hubungkan pembayaran yang sudah ada ke pemakaian yang sesuai
-- Pembayaran id=1 (no_kontrol=123456 Sep 2026) → pemakaian id=1
-- Pembayaran id=2 (no_kontrol=123457 Sep 2026) → pemakaian id=2
UPDATE pembayaran SET id_pemakaian = 1 WHERE id_pembayaran = 1;
UPDATE pembayaran SET id_pemakaian = 2 WHERE id_pembayaran = 2;
