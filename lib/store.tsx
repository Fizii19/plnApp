/**
 * =============================================================================
 * lib/store.tsx
 * -----------------------------------------------------------------------------
 * Context store (React Context) yang menjadi sumber data tunggal aplikasi:
 *   - data master: pelanggan, tarif, petugas
 *   - transaksi: pemakaian, pembayaran
 *   - sesi login pengguna
 *
 * Seluruh data tinggal di memori browser dan otomatis disimpan ke
 * localStorage sehingga perubahan tetap ada saat halaman dimuat ulang.
 * Untuk menghubungkan ke database sungguhan, ganti isi aksi-aksi di bawah
 * dengan panggilan API/backend.
 * =============================================================================
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { verifikasiLogin } from "./auth";
import {
  PELANGGAN_SEED,
  PEMBAYARAN_SEED,
  PEMAKAIAN_SEED,
  PETUGAS_SEED,
  TARIF_SEED,
} from "./mock-data";
import type { ModeSimpan, Pembayaran, Pelanggan, Pemakaian, Petugas, Sesi, Tarif } from "./types";

/** Kunci penyimpanan data aplikasi di localStorage browser. */
const KUNCI_PENYIMPANAN = "sistem-listrik-v1";

/** Bentuk data yang dipertukarkan dengan localStorage. */
interface DataTersimpan {
  sesi: Sesi | null;
  pelanggan: Pelanggan[];
  tarif: Tarif[];
  petugas: Petugas[];
  pemakaian: Pemakaian[];
  pembayaran: Pembayaran[];
}

/** Nilai yang disediakan `SistemProvider` kepada seluruh komponen konsumen. */
export interface NilaiSistem extends DataTersimpan {
  /** true setelah data selesai dimuat dari localStorage (aman dirender). */
  terhidrasi: boolean;
  /** Memulai sesi baru; mengembalikan sesi bila kredensial cocok. */
  login: (username: string, password: string) => Sesi | null;
  /** Menghapus sesi (logout) dan kembali ke halaman login. */
  logout: () => void;
  /** Menambah/mengubah data pelanggan berdasarkan nomor kontrol. */
  simpanPelanggan: (baris: Pelanggan, mode: ModeSimpan) => void;
  /** Menghapus data pelanggan beserta riwayatnya berdasarkan nomor kontrol. */
  hapusPelanggan: (noKontrol: number) => void;
  /** Menambah/mengubah data tarif berdasarkan id tarif. */
  simpanTarif: (baris: Tarif, mode: ModeSimpan) => void;
  /** Menghapus data tarif berdasarkan id tarif. */
  hapusTarif: (idTarif: number) => void;
  /** Menambah/mengubah data petugas loket berdasarkan id petugas. */
  simpanPetugas: (baris: Petugas, mode: ModeSimpan) => void;
  /** Menghapus data petugas loket berdasarkan id petugas. */
  hapusPetugas: (idPetugas: number) => void;
  /** Menambah/mengubah catatan pemakaian berdasarkan id pemakaian. */
  simpanPemakaian: (baris: Pemakaian, mode: ModeSimpan) => void;
  /** Menghapus catatan pemakaian berdasarkan id pemakaian. */
  hapusPemakaian: (idPemakaian: number) => void;
  /** Menambah/mengubah transaksi pembayaran berdasarkan id pembayaran. */
  simpanPembayaran: (baris: Pembayaran, mode: ModeSimpan) => void;
  /** Menghapus transaksi pembayaran berdasarkan id pembayaran. */
  hapusPembayaran: (idPembayaran: number) => void;
}

const SistemContext = createContext<NilaiSistem | null>(null);

/**
 * Menambah atau mengganti satu baris pada sebuah daftar berdasarkan kunci.
 *
 * @param daftar - Daftar data saat ini.
 * @param kunci - Nama field primary key.
 * @param nilai - Baris baru (tambah) atau hasil edit (ubah).
 * @param mode - "tambah" untuk menempel di akhir, "ubah" untuk menimpa.
 * @returns Daftar baru (immutabel) hasil penyimpanan.
 */
function upsertDaftar<T>(daftar: T[], kunci: keyof T, nilai: T, mode: ModeSimpan): T[] {
  if (mode === "tambah") {
    return [...daftar, nilai];
  }
  return daftar.map((item) => (item[kunci] === nilai[kunci] ? nilai : item));
}

/**
 * Menghapus satu baris dari sebuah daftar berdasarkan kunci.
 *
 * @param daftar - Daftar data saat ini.
 * @param kunci - Nama field primary key.
 * @param nilaiKunci - Nilai kunci baris yang ingin dihapus.
 * @returns Daftar baru tanpa baris yang dimaksud.
 */
function hapusDariDaftar<T>(daftar: T[], kunci: keyof T, nilaiKunci: T[keyof T]): T[] {
  return daftar.filter((item) => item[kunci] !== nilaiKunci);
}

/**
 * Menghasilkan id auto-increment berikutnya dari sebuah daftar.
 * Berguna untuk mengusulkan id baris baru pada form CRUD.
 *
 * @param daftar - Daftar data dengan field kunci bertipe angka.
 * @param kunci - Nama field kunci numerik.
 * @returns Nilai id terbesar + 1 (dimulai dari 1 bila daftar kosong).
 *
 * @example idBerikutnya([{ idPemakaian: 3 }], "idPemakaian"); // 4
 */
export function idBerikutnya<T>(daftar: T[], kunci: keyof T): number {
  const nilai = daftar.map((item) => Number(item[kunci]) || 0);
  return Math.max(0, ...nilai) + 1;
}

/**
 * Membaca data tersimpan dari localStorage, atau memakai seed bila kosong/rusak.
 *
 * @returns Objek data lengkap siap dipakai provider.
 */
function muatDataAwal(): DataTersimpan {
  const seed: DataTersimpan = {
    sesi: null,
    pelanggan: PELANGGAN_SEED,
    tarif: TARIF_SEED,
    petugas: PETUGAS_SEED,
    pemakaian: PEMAKAIAN_SEED,
    pembayaran: PEMBAYARAN_SEED,
  };

  // localStorage hanya tersedia di browser; jangan sentuh saat prerender.
  if (typeof window === "undefined") return seed;

  try {
    const mentah = window.localStorage.getItem(KUNCI_PENYIMPANAN);
    if (!mentah) return seed;
    const data = JSON.parse(mentah) as Partial<DataTersimpan>;
    return {
      sesi: data.sesi ?? null,
      pelanggan: data.pelanggan ?? seed.pelanggan,
      tarif: data.tarif ?? seed.tarif,
      petugas: data.petugas ?? seed.petugas,
      pemakaian: data.pemakaian ?? seed.pemakaian,
      pembayaran: data.pembayaran ?? seed.pembayaran,
    };
  } catch {
    // Data rusak/tidak valid -> kembali ke seed agar aplikasi tetap jalan.
    return seed;
  }
}

/**
 * Provider context store; bungkus seluruh aplikasi pada root layout.
 *
 * @param props.children - Komponen anak yang membutuhkan akses data.
 * @returns Provider `SistemContext` yang membungkus children.
 */
export function SistemProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataTersimpan>(() => ({
    sesi: null,
    pelanggan: PELANGGAN_SEED,
    tarif: TARIF_SEED,
    petugas: PETUGAS_SEED,
    pemakaian: PEMAKAIAN_SEED,
    pembayaran: PEMBAYARAN_SEED,
  }));
  const [terhidrasi, setTerhidrasi] = useState(false);

  // Muat data dari localStorage setelah komponen terpasang di browser
  // (tidak saat prerender, agar tidak terjadi mismatch hydration).
  useEffect(() => {
    setData(muatDataAwal());
    setTerhidrasi(true);
  }, []);

  // Persistensikan data ke localStorage setiap kali berubah (setelah hidrasi).
  useEffect(() => {
    if (!terhidrasi || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(KUNCI_PENYIMPANAN, JSON.stringify(data));
    } catch {
      // Kuota penuh/diabaikan: aplikasi tetap berjalan tanpa persistensi.
    }
  }, [data, terhidrasi]);

  /** Memperbarui seluruh objek data dengan hasil mutasi parsial. */
  const perbarui = useCallback((bagian: Partial<DataTersimpan>) => {
    setData((sebelumnya) => ({ ...sebelumnya, ...bagian }));
  }, []);

  const login = useCallback(
    (username: string, password: string): Sesi | null => {
      const sesi = verifikasiLogin(username, password, data.petugas, data.pelanggan);
      if (sesi) perbarui({ sesi });
      return sesi;
    },
    [data.petugas, data.pelanggan, perbarui],
  );

  const logout = useCallback(() => perbarui({ sesi: null }), [perbarui]);

  const simpanPelanggan = useCallback(
    (baris: Pelanggan, mode: ModeSimpan) =>
      setData((d) => ({ ...d, pelanggan: upsertDaftar(d.pelanggan, "noKontrol", baris, mode) })),
    [],
  );

  const hapusPelanggan = useCallback(
    (noKontrol: number) =>
      setData((d) => ({
        ...d,
        pelanggan: hapusDariDaftar(d.pelanggan, "noKontrol", noKontrol),
        // Ikut bersihkan riwayat milik pelanggan yang dihapus (cascading).
        pemakaian: hapusDariDaftar(d.pemakaian, "noKontrol", noKontrol),
        pembayaran: hapusDariDaftar(d.pembayaran, "noKontrol", noKontrol),
      })),
    [],
  );

  const simpanTarif = useCallback(
    (baris: Tarif, mode: ModeSimpan) =>
      setData((d) => ({ ...d, tarif: upsertDaftar(d.tarif, "idTarif", baris, mode) })),
    [],
  );

  const hapusTarif = useCallback(
    (idTarif: number) => setData((d) => ({ ...d, tarif: hapusDariDaftar(d.tarif, "idTarif", idTarif) })),
    [],
  );

  const simpanPetugas = useCallback(
    (baris: Petugas, mode: ModeSimpan) =>
      setData((d) => ({ ...d, petugas: upsertDaftar(d.petugas, "idPetugas", baris, mode) })),
    [],
  );

  const hapusPetugas = useCallback(
    (idPetugas: number) =>
      setData((d) => ({ ...d, petugas: hapusDariDaftar(d.petugas, "idPetugas", idPetugas) })),
    [],
  );

  const simpanPemakaian = useCallback(
    (baris: Pemakaian, mode: ModeSimpan) =>
      setData((d) => ({ ...d, pemakaian: upsertDaftar(d.pemakaian, "idPemakaian", baris, mode) })),
    [],
  );

  const hapusPemakaian = useCallback(
    (idPemakaian: number) =>
      setData((d) => ({ ...d, pemakaian: hapusDariDaftar(d.pemakaian, "idPemakaian", idPemakaian) })),
    [],
  );

  const simpanPembayaran = useCallback(
    (baris: Pembayaran, mode: ModeSimpan) =>
      setData((d) => ({ ...d, pembayaran: upsertDaftar(d.pembayaran, "idPembayaran", baris, mode) })),
    [],
  );

  const hapusPembayaran = useCallback(
    (idPembayaran: number) =>
      setData((d) => ({ ...d, pembayaran: hapusDariDaftar(d.pembayaran, "idPembayaran", idPembayaran) })),
    [],
  );

  const nilai = useMemo<NilaiSistem>(
    () => ({
      ...data,
      terhidrasi,
      login,
      logout,
      simpanPelanggan,
      hapusPelanggan,
      simpanTarif,
      hapusTarif,
      simpanPetugas,
      hapusPetugas,
      simpanPemakaian,
      hapusPemakaian,
      simpanPembayaran,
      hapusPembayaran,
    }),
    [
      data,
      terhidrasi,
      login,
      logout,
      simpanPelanggan,
      hapusPelanggan,
      simpanTarif,
      hapusTarif,
      simpanPetugas,
      hapusPetugas,
      simpanPemakaian,
      hapusPemakaian,
      simpanPembayaran,
      hapusPembayaran,
    ],
  );

  return <SistemContext.Provider value={nilai}>{children}</SistemContext.Provider>;
}

/**
 * Hook untuk mengakses seluruh data & aksi sistem dari komponen klien.
 *
 * @throws Error bila dipakai di luar `SistemProvider`.
 * @returns Nilai context store aplikasi.
 *
 * @example const { pelanggan, simpanPelanggan } = useSistem();
 */
export function useSistem(): NilaiSistem {
  const konteks = useContext(SistemContext);
  if (!konteks) {
    throw new Error("useSistem() harus dipakai di dalam <SistemProvider>.");
  }
  return konteks;
}
