/**
 * =============================================================================
 * lib/mock-data.ts
 * -----------------------------------------------------------------------------
 * Data awal (seed) untuk prototipe UI. Seluruh struktur mengikuti ERD pada
 * `blueprints/system-blueprint.json`.
 *
 * Data ini hanya hidup di memori browser (state React) dan dapat diubah
 * melalui fitur CRUD di halaman admin. Bila nanti dipindah ke database,
 * cukup ganti pembacaan seed ini dengan query ke backend.
 * =============================================================================
 */

import { getTarifUntukJenis, getTarifUntukPelanggan, cariPemakaian, hitungRincianTagihan, totalDariPemakaian } from "./billing";
import type { Pelanggan, Pembayaran, Pemakaian, Petugas, Tarif } from "./types";

/** Daftar jenis pelanggan yang tersedia pada sistem (untuk dropdown form). */
export const DAFTAR_JENIS: readonly string[] = [
  "Rumah Tangga",
  "Niaga",
  "Industri",
  "Sosial",
] as const;

/** Data tarif per jenis pelanggan (tabel `tarif`). */
export const TARIF_SEED: Tarif[] = [
  { idTarif: 1, jenisPlg: "Rumah Tangga", biayaBeban: 5000, tarifKwh: 1445 },
  { idTarif: 2, jenisPlg: "Niaga", biayaBeban: 10000, tarifKwh: 1650 },
  { idTarif: 3, jenisPlg: "Industri", biayaBeban: 25000, tarifKwh: 1750 },
  { idTarif: 4, jenisPlg: "Sosial", biayaBeban: 3000, tarifKwh: 1150 },
];

/** Data kartu pelanggan (tabel `pelanggan`). */
export const PELANGGAN_SEED: Pelanggan[] = [
  {
    noKontrol: 1001,
    nama: "Slamet Riyadi",
    alamat: "Jl. Merdeka No. 12, Kel. Sukamaju",
    noTlp: "081234567890",
    jenis: "Rumah Tangga",
  },
  {
    noKontrol: 1002,
    nama: "Dewi Lestari",
    alamat: "Jl. Kenanga No. 5, Kel. Melati",
    noTlp: "081234567891",
    jenis: "Rumah Tangga",
  },
  {
    noKontrol: 1003,
    nama: "Toko Barokah Maju",
    alamat: "Jl. Pasar Baru No. 8, Kel. Sukamaju",
    noTlp: "081234567892",
    jenis: "Niaga",
  },
  {
    noKontrol: 1004,
    nama: "CV Cahaya Teknik",
    alamat: "Jl. Industri Raya KM 3, Kel. Tegalrejo",
    noTlp: "081234567893",
    jenis: "Industri",
  },
  {
    noKontrol: 1005,
    nama: "Masjid Al-Ikhlas",
    alamat: "Jl. Sudirman No. 21, Kel. Melati",
    noTlp: "081234567894",
    jenis: "Sosial",
  },
  {
    noKontrol: 1006,
    nama: "Andi Saputra",
    alamat: "Jl. Melati Indah No. 17, Kel. Tegalrejo",
    noTlp: "081234567895",
    jenis: "Rumah Tangga",
  },
];

/** Data petugas loket (tabel `petugas_loket`) beserta akun login demo. */
export const PETUGAS_SEED: Petugas[] = [
  {
    idPetugas: 1,
    nama: "Budi Santoso",
    jenisKelamin: "Laki-laki",
    noHp: "081234567801",
    username: "budi",
    password: "petugas123",
  },
  {
    idPetugas: 2,
    nama: "Siti Aminah",
    jenisKelamin: "Perempuan",
    noHp: "081234567802",
    username: "siti",
    password: "petugas123",
  },
];

/**
 * Catatan meter mentah yang dipakai membangun seed pemakaian.
 * Urutan tuple: `[noKontrol, bulan, tahun, meterAwal, meterAkhir]`.
 * Nilai biaya turunan dihitung otomatis oleh `buatBarisPemakaian`.
 */
const CATATAN_METER: Array<[number, number, number, number, number]> = [
  [1001, 7, 2026, 1180, 1245],
  [1001, 8, 2026, 1245, 1312],
  [1001, 9, 2026, 1312, 1385],
  [1002, 7, 2026, 940, 1002],
  [1002, 8, 2026, 1002, 1061],
  [1002, 9, 2026, 1061, 1130],
  [1003, 8, 2026, 24000, 24980],
  [1003, 9, 2026, 24980, 25910],
  [1004, 9, 2026, 56000, 57450],
  [1005, 8, 2026, 3000, 3120],
  [1005, 9, 2026, 3120, 3245],
  [1006, 9, 2026, 760, 815],
];

/**
 * Membuat satu baris data pemakaian lengkap dengan biaya turunannya.
 *
 * @param id - Kunci `idPemakaian`.
 * @param noKontrol - Pemilik meter.
 * @param bulan - Bulan pencatatan (1-12).
 * @param tahun - Tahun pencatatan.
 * @param meterAwal - Angka meter awal.
 * @param meterAkhir - Angka meter akhir.
 * @returns Baris `Pemakaian` siap simpan, memakai tarif jenis pelanggan.
 */
function buatBarisPemakaian(
  id: number,
  noKontrol: number,
  bulan: number,
  tahun: number,
  meterAwal: number,
  meterAkhir: number,
): Pemakaian {
  const pelanggan = PELANGGAN_SEED.find((p) => p.noKontrol === noKontrol);
  const tarif = pelanggan ? getTarifUntukJenis(TARIF_SEED, pelanggan.jenis) : undefined;
  const rincian = hitungRincianTagihan(tarif, meterAwal, meterAkhir);

  return {
    idPemakaian: id,
    noKontrol,
    bulan,
    tahun,
    meterAwal,
    meterAkhir,
    jumlahPakai: rincian.jumlahPakai,
    biayaBebanPemakaian: rincian.biayaBeban,
    biayaPemakaian: rincian.biayaPemakaian,
  };
}

/** Data pemakaian bulanan (tabel `pemakaian`) hasil pembangunan dari `CATATAN_METER`. */
export const PEMAKAIAN_SEED: Pemakaian[] = CATATAN_METER.map((catatan, index) =>
  buatBarisPemakaian(index + 1, ...catatan),
);

/**
 * Membuat satu baris transaksi pembayaran yang terhubung ke pemakaian.
 *
 * @param id - Kunci `idPembayaran`.
 * @param noKontrol - Pelanggan yang membayar.
 * @param bulan - Bulan tagihan yang dibayar.
 * @param tahun - Tahun tagihan yang dibayar.
 * @param tanggalBayar - Tanggal bayar format ISO (YYYY-MM-DD).
 * @param idPetugas - Petugas loket penerima pembayaran.
 * @returns Baris `Pembayaran` dengan total mengikuti pemakaian terkait.
 */
function buatBarisPembayaran(
  id: number,
  noKontrol: number,
  bulan: number,
  tahun: number,
  tanggalBayar: string,
  idPetugas: number,
): Pembayaran {
  const pemakaian = cariPemakaian(PEMAKAIAN_SEED, noKontrol, bulan, tahun);
  const tarif = getTarifUntukPelanggan(PELANGGAN_SEED, TARIF_SEED, noKontrol);
  const total = pemakaian ? totalDariPemakaian(pemakaian) : 0;

  return {
    idPembayaran: id,
    noKontrol,
    idTarif: tarif?.idTarif ?? 0,
    idPetugas,
    bulan,
    tahun,
    tanggalBayar,
    biayaTotal: total,
    jumlahBayar: total,
  };
}

/** Data pembayaran (tabel `pembayaran`). Tagihan bulan berjalan sengaja belum dibayar. */
export const PEMBAYARAN_SEED: Pembayaran[] = [
  buatBarisPembayaran(1, 1001, 7, 2026, "2026-07-28", 1),
  buatBarisPembayaran(2, 1001, 8, 2026, "2026-08-27", 1),
  buatBarisPembayaran(3, 1002, 7, 2026, "2026-07-29", 2),
  buatBarisPembayaran(4, 1002, 8, 2026, "2026-08-28", 1),
  buatBarisPembayaran(5, 1003, 8, 2026, "2026-08-30", 2),
  buatBarisPembayaran(6, 1005, 8, 2026, "2026-08-30", 2),
  buatBarisPembayaran(7, 1006, 9, 2026, "2026-10-02", 1),
];

/** Akun login untuk peran admin (di luar tabel ERD, khusus demo UI). */
export const AKUN_ADMIN = {
  username: "admin",
  password: "admin123",
  nama: "Administrator Sistem",
} as const;
