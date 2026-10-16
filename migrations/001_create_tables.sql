CREATE TABLE IF NOT EXISTS pelanggan (
  no_kontrol INT PRIMARY KEY,
  nama_pelanggan VARCHAR(255) NOT NULL,
  alamat_pelanggan TEXT NOT NULL,
  no_tlp_pelanggan VARCHAR(20) NULL,
  jenis_pelanggan VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS petugas_loket (
  id_petugas INT AUTO_INCREMENT PRIMARY KEY,
  nama_petugas VARCHAR(255) NOT NULL,
  jenis_kelamin ENUM('laki-laki','perempuan') NOT NULL,
  no_hp VARCHAR(20) NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','petugas') NOT NULL DEFAULT 'petugas'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tarif (
  id_tarif INT AUTO_INCREMENT PRIMARY KEY,
  jenis_pelanggan VARCHAR(50) NOT NULL,
  biaya_beban DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tarif_kwh DECIMAL(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pemakaian (
  id_pemakaian INT AUTO_INCREMENT PRIMARY KEY,
  no_kontrol INT NOT NULL,
  tahun YEAR NOT NULL,
  bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  meter_awal INT NOT NULL DEFAULT 0,
  meter_akhir INT NOT NULL DEFAULT 0,
  jumlah_pakai INT NOT NULL DEFAULT 0,
  biaya_beban_pemakaian DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  biaya_pemakaian DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_pemakaian_pelanggan FOREIGN KEY (no_kontrol) REFERENCES pelanggan(no_kontrol) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pembayaran (
  id_pembayaran INT AUTO_INCREMENT PRIMARY KEY,
  id_tarif INT NOT NULL,
  no_kontrol INT NOT NULL,
  id_petugas INT NOT NULL,
  jumlah_bayar DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  biaya_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tanggal_bayar DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pembayaran_tarif FOREIGN KEY (id_tarif) REFERENCES tarif(id_tarif) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pembayaran_pelanggan FOREIGN KEY (no_kontrol) REFERENCES pelanggan(no_kontrol) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_pembayaran_petugas FOREIGN KEY (id_petugas) REFERENCES petugas_loket(id_petugas) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

INSERT IGNORE INTO petugas_loket (nama_petugas, jenis_kelamin, no_hp, username, password, role) VALUES
  ('Administrator','laki-laki','081234567890','admin','','admin'),
  ('Petugas Loket 1','laki-laki','081298765432','petugas','.S','petugas');

INSERT IGNORE INTO pelanggan (no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan) VALUES
  (123456,'Budi Santoso','Jl. Merdeka No. 10, Jakarta','081234500001','Rumah Tangga'),
  (123457,'Toko Maju Jaya','Jl. Raya No. 25, Jakarta','081234500002','Bisnis'),
  (123458,'PT Karya Abadi','Jl. Industri No. 5, Jakarta','081234500003','Industri');

INSERT IGNORE INTO tarif (jenis_pelanggan, biaya_beban, tarif_kwh) VALUES
  ('Rumah Tangga',25000.00,1500.00),
  ('Bisnis',50000.00,1750.00),
  ('Industri',100000.00,2000.00);

INSERT IGNORE INTO pemakaian (no_kontrol, tahun, bulan, meter_awal, meter_akhir, jumlah_pakai, biaya_beban_pemakaian, biaya_pemakaian) VALUES
  (123456,2026,9,1500,1650,150,25000.00,225000.00),
  (123457,2026,9,3200,3600,400,50000.00,700000.00),
  (123456,2026,10,1650,1800,150,25000.00,225000.00);

INSERT IGNORE INTO pembayaran (id_tarif, no_kontrol, id_petugas, jumlah_bayar, biaya_total, tanggal_bayar) VALUES
  (1,123456,2,250000.00,250000.00,'2026-10-05 09:00:00'),
  (2,123457,2,750000.00,750000.00,'2026-10-06 10:30:00');
