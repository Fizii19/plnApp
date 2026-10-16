/**
 * =============================================================================
 * lib/types.ts
 * -----------------------------------------------------------------------------
 * Definisi tipe data seluruh entitas sistem pembayaran listrik.
 *
 * Struktur mengikuti ERD pada `blueprints/system-blueprint.json`:
 *   pelanggan, pemakaian, petugas_loket, tarif, pembayaran.
 *
 * Semua nama field ditulis dalam camelCase agar konsisten dengan kode
 * TypeScript, dan memetakan 1:1 ke kolom database (snake_case).
 * =============================================================================
 */

/** Peran pengguna yang dapat masuk ke sistem (menentukan halaman tujuan). */
export type Peran = "admin" | "petugas" | "pelanggan";

/** Klasifikasi jenis pelanggan, digunakan untuk menentukan tarif berlaku. */
export type JenisPelanggan = "Rumah Tangga" | "Niaga" | "Industri" | "Sosial";

/** Jenis kelamin petugas loket (ENUM pada ERD). */
export type JenisKelamin = "Laki-laki" | "Perempuan";

/** Mode penyimpanan pada form CRUD: menambah baris baru atau mengubah lama. */
export type ModeSimpan = "tambah" | "ubah";

/**
 * Data pelanggan / kartu pelanggan (tabel `pelanggan`).
 * `noKontrol` adalah primary key sekaligus nomor yang diinput petugas loket.
 */
export interface Pelanggan {
  /** Nomor kontrol pelanggan (PK, INT). */
  noKontrol: number;
  /** Nama lengkap pelanggan (VARCHAR 255, NOT NULL). */
  nama: string;
  /** Alamat pelanggan (TEXT, NOT NULL). */
  alamat: string;
  /** Nomor telepon pelanggan (VARCHAR 20). */
  noTlp: string;
  /** Jenis pelanggan, menentukan tarif yang dipakai (VARCHAR 50). */
  jenis: JenisPelanggan;
}

/**
 * Data tarif listrik per jenis pelanggan (tabel `tarif`).
 * ERD: FK `jenis_plg` menuju pelanggan (one-to-one dengan klasifikasi jenis).
 */
export interface Tarif {
  /** Kunci tarif (PK, INT AUTO_INCREMENT). */
  idTarif: number;
  /** Jenis pelanggan yang dikenai tarif ini (FK -> pelanggan.jenis). */
  jenisPlg: JenisPelanggan;
  /** Biaya beban / abonemen tetap per bulan (DECIMAL 10,2). */
  biayaBeban: number;
  /** Tarif per kWh / kWh rate (DECIMAL 10,2). */
  tarifKwh: number;
}

/**
 * Data petugas loket (tabel `petugas_loket`).
 * Field `username`/`password` adalah tambahan di luar ERD khusus untuk
 * proses autentikasi halaman login (demo UI, bukan kolom database).
 */
export interface Petugas {
  /** Kunci petugas (PK, INT AUTO_INCREMENT). */
  idPetugas: number;
  /** Nama petugas (VARCHAR 255). */
  nama: string;
  /** Jenis kelamin petugas (ENUM: Laki-laki, Perempuan). */
  jenisKelamin: JenisKelamin;
  /** Nomor HP petugas (BIGINT/VARCHAR). */
  noHp: string;
  /** Username login petugas (tambahan untuk autentikasi demo). */
  username: string;
  /** Password login petugas (tambahan untuk autentikasi demo). */
  password: string;
}

/**
 * Catatan pemakaian listrik bulanan (tabel `pemakaian`).
 * Field biaya bersifat *terturun* (derived) dari meter dan tarif, namun tetap
 * disimpan agar riwayat tagihan tidak berubah ketika tarif diperbarui.
 */
export interface Pemakaian {
  /** Kunci pemakaian (PK, INT AUTO_INCREMENT). */
  idPemakaian: number;
  /** Pelanggan pemilik meter (FK -> pelanggan.noKontrol). */
  noKontrol: number;
  /** Tahun pencatatan meter (YEAR). */
  tahun: number;
  /** Bulan pencatatan meter, 1-12 (INT). */
  bulan: number;
  /** Angka meter awal / reading awal (INT). */
  meterAwal: number;
  /** Angka meter akhir / reading akhir (INT). */
  meterAkhir: number;
  /** Jumlah pemakaian dalam kWh = meterAkhir - meterAwal (INT). */
  jumlahPakai: number;
  /** Biaya beban yang dikenakan pada periode ini (DECIMAL 10,2). */
  biayaBebanPemakaian: number;
  /** Biaya pemakaian kWh (DECIMAL 10,2). */
  biayaPemakaian: number;
}

/**
 * Transaksi pembayaran tagihan listrik (tabel `pembayaran`).
 * ERD: FK `id_tarif`, `no_kontrol`, `id_petugas`.
 * Field `bulan`/`tahun` adalah tambahan agar periode tagihan yang dibayar
 * dapat ditampilkan pada riwayat pelanggan tanpa join ke tabel pemakaian.
 */
export interface Pembayaran {
  /** Kunci pembayaran (PK, INT AUTO_INCREMENT). */
  idPembayaran: number;
  /** Pelanggan yang membayar (FK -> pelanggan.noKontrol). */
  noKontrol: number;
  /** Tarif yang dipakai saat tagihan dihitung (FK -> tarif.idTarif). */
  idTarif: number;
  /** Petugas loket yang menerima pembayaran (FK -> petugas_loket.idPetugas). */
  idPetugas: number;
  /** Bulan tagihan yang dibayar, 1-12 (tambahan). */
  bulan: number;
  /** Tahun tagihan yang dibayar (tambahan). */
  tahun: number;
  /** Tanggal pembayaran dalam format ISO YYYY-MM-DD. */
  tanggalBayar: string;
  /** Total tagihan periode tersebut (biaya_total). */
  biayaTotal: number;
  /** Jumlah uang yang diterima (jumlah_bayar). */
  jumlahBayar: number;
}

/**
 * Hasil perhitungan komponen biaya tagihan satu periode.
 * Dipakai oleh form petugas, dokumen cetak, dan halaman pelanggan.
 */
export interface RincianTagihan {
  /** Jumlah pemakaian dalam kWh. */
  jumlahPakai: number;
  /** Biaya beban tetap. */
  biayaBeban: number;
  /** Biaya pemakaian = jumlahPakai x tarif kWh. */
  biayaPemakaian: number;
  /** Total tagihan = biaya beban + biaya pemakaian. */
  total: number;
  /** Tarif yang dipakai menghitung rincian (undefined bila jenis tak dikenal). */
  tarif?: Tarif;
}

/**
 * Sesi login pengguna yang disimpan di context store dan localStorage.
 * Nilainya dibuat oleh `verifikasiLogin()` pada `lib/auth.ts`.
 */
export interface Sesi {
  /** Peran pengguna yang berhasil login. */
  peran: Peran;
  /** Nama tampilan untuk header/dashboard. */
  nama: string;
  /** Username yang digunakan login. */
  username: string;
  /** Diisi bila peran = pelanggan (no kontrol milik akun tersebut). */
  noKontrol?: number;
  /** Diisi bila peran = petugas (id petugas milik akun tersebut). */
  idPetugas?: number;
}

/** Tipe kembalian form CRUD pada komponen `CrudTable`. */
export type NilaiForm = Record<string, string>;
