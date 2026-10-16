/**
 * =============================================================================
 * lib/store.tsx
 * -----------------------------------------------------------------------------
 * Context store terpusat aplikasi SIP Listrik.
 *
 * Mengelola sesi pengguna (JWT dari MySQL) dan menyediakan helper API untuk
 * seluruh komponen. Data TIDAK lagi disimpan di in-memory / localStorage —
 * setiap komponen dashboard mengambil langsung dari MySQL via API routes.
 *
 * Sesi pengguna (peran, nama, token) tetap disimpan di localStorage agar
 * AuthGuard dapat memeriksa rute tanpa round-trip ke server.
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
import {
  apiFetch,
  bacaToken,
  hapusToken,
  simpanToken,
  type ApiResponse,
} from "./api-client";
import { PETA_HALAMAN } from "./auth";
import type { Sesi } from "./types";

/** Kunci penyimpanan objek sesi (tanpa data sensitif) di localStorage. */
const KUNCI_SESI = "sip-listrik-sesi";

/**
 * Objek sesi minimal yang tersimpan di localStorage.
 * Token JWT disimpan terpisah di `sip-listrik-token`.
 */
interface SesiTersimpan {
  peran: Sesi["peran"];
  nama: string;
  username: string;
  noKontrol?: number;
  idPetugas?: number;
}

/** Nilai yang disediakan SistemProvider kepada seluruh komponen konsumen. */
export interface NilaiSistem {
  /** Sesi pengguna yang sedang login, atau null. */
  sesi: Sesi | null;
  /** true setelah data sesi selesai dimuat dari localStorage. */
  terhidrasi: boolean;
  /**
   * Login via API MySQL. Mengembalikan sesi bila kredensial cocok.
   * Menyimpan JWT ke localStorage secara otomatis.
   *
   * @param username - Username atau nomor kontrol pelanggan.
   * @param password - Password pengguna.
   * @returns Sesi bila berhasil, null bila gagal.
   * @throws Error bila ada masalah jaringan.
   */
  login: (username: string, password: string) => Promise<Sesi | null>;
  /**
   * Logout: hapus JWT & sesi dari localStorage dan context.
   */
  logout: () => void;
  /**
   * Wrapper fetch yang sudah menyisipkan token Authorization.
   * Dipakai komponen untuk memanggil API routes.
   */
  apiFetch: typeof apiFetch;
}

const SistemContext = createContext<NilaiSistem | null>(null);

/**
 * Hook untuk mengakses store dari komponen mana pun.
 * Harus dipanggil di dalam SistemProvider.
 *
 * @returns Nilai store sistem.
 * @throws Error bila dipanggil di luar SistemProvider.
 */
export function useSistem(): NilaiSistem {
  const ctx = useContext(SistemContext);
  if (!ctx) throw new Error("useSistem harus dipanggil di dalam <SistemProvider>");
  return ctx;
}

/**
 * Membaca sesi dari localStorage (bukan data sensitif, hanya metadata).
 *
 * @returns Sesi yang tersimpan, atau null.
 */
function bacaSesiLokal(): Sesi | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KUNCI_SESI);
    if (!raw) return null;
    const parsed: SesiTersimpan = JSON.parse(raw);
    if (!parsed.peran || !parsed.nama) return null;
    return parsed as Sesi;
  } catch {
    return null;
  }
}

/**
 * Menyimpan metadata sesi ke localStorage (bukan token).
 *
 * @param sesi - Objek sesi tanpa data sensitif.
 */
function simpanSesiLokal(sesi: Sesi): void {
  if (typeof window === "undefined") return;
  const data: SesiTersimpan = {
    peran: sesi.peran,
    nama: sesi.nama,
    username: sesi.username,
    noKontrol: sesi.noKontrol,
    idPetugas: sesi.idPetugas,
  };
  window.localStorage.setItem(KUNCI_SESI, JSON.stringify(data));
}

/**
 * Menghapus sesi dari localStorage saat logout.
 */
function hapusSesiLokal(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KUNCI_SESI);
}

/**
 * Provider context store.
 * Bungkus seluruh aplikasi pada root layout.
 *
 * @param props.children - Komponen anak yang membutuhkan akses store.
 * @returns Provider SistemContext yang membungkus children.
 */
export function SistemProvider({ children }: { children: ReactNode }) {
  const [sesi, setSesi] = useState<Sesi | null>(null);
  const [terhidrasi, setTerhidrasi] = useState(false);

  /**
   * Memuat sesi dari localStorage dan memvalidasi token saat komponen dipasang.
   * Bila token kadaluarsa (401 dari /api/auth/me), sesi dihapus.
   */
  useEffect(() => {
    const sesiLokal = bacaSesiLokal();
    const token = bacaToken();

    if (!sesiLokal || !token) {
      setTerhidrasi(true);
      return;
    }

    // Validasi token ke server untuk memastikan belum kadaluarsa
    apiFetch<{ username: string }>("/api/auth/me")
      .then((res) => {
        if (res.success) {
          setSesi(sesiLokal);
        } else {
          // Token tidak valid / kadaluarsa
          hapusToken();
          hapusSesiLokal();
        }
      })
      .catch(() => {
        // Bila offline, percayai sesi lokal sementara
        setSesi(sesiLokal);
      })
      .finally(() => setTerhidrasi(true));
  }, []);

  /**
   * Login via API MySQL.
   * Menyimpan JWT dan metadata sesi ke localStorage.
   *
   * @param username - Username atau nomor kontrol.
   * @param password - Password plain-text (tidak disimpan).
   * @returns Sesi bila berhasil, null bila gagal.
   */
  const login = useCallback(
    async (username: string, password: string): Promise<Sesi | null> => {
      const res = await apiFetch<{
        token: string;
        user: { id: number | null; nama: string; username: string; role: string; noKontrol?: number };
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!res.success || !res.data) return null;

      const { token, user } = res.data;
      simpanToken(token);

      const peranMap: Record<string, Sesi["peran"]> = {
        admin: "admin",
        petugas: "petugas",
        pelanggan: "pelanggan",
      };

      const sesiKini: Sesi = {
        peran: peranMap[user.role] ?? "pelanggan",
        nama: user.nama,
        username: user.username,
        noKontrol: user.noKontrol,
        idPetugas: user.id ?? undefined,
      };

      simpanSesiLokal(sesiKini);
      setSesi(sesiKini);
      return sesiKini;
    },
    [],
  );

  /**
   * Logout: menghapus token dan sesi.
   */
  const logout = useCallback((): void => {
    hapusToken();
    hapusSesiLokal();
    setSesi(null);
  }, []);

  const nilai = useMemo<NilaiSistem>(
    () => ({
      sesi,
      terhidrasi,
      login,
      logout,
      apiFetch,
    }),
    [sesi, terhidrasi, login, logout],
  );

  return <SistemContext.Provider value={nilai}>{children}</SistemContext.Provider>;
}

// Alias untuk kompatibilitas mundur dengan komponen lain
export { useSistem as default };
