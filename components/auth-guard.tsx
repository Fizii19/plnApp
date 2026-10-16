/**
 * =============================================================================
 * components/auth-guard.tsx
 * -----------------------------------------------------------------------------
 * Penjaga rute (client-side guard) untuk seluruh dashboard.
 *
 * - Menunggu hidrasi data sesi dari localStorage.
 * - Mengalihkan ke /login bila belum login.
 * - Mengalihkan ke halaman peran yang benar bila peran tidak cocok.
 * =============================================================================
 */
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PETA_HALAMAN } from "@/lib/auth";
import { useSistem } from "@/lib/store";
import type { Peran } from "@/lib/types";
import DashboardShell from "./dashboard-shell";

/** Properti penjaga rute. */
export interface AuthGuardProps {
  /** Peran yang diizinkan mengakses halaman ini. */
  peran: Peran;
  /** Konten halaman yang dilindungi. */
  children: ReactNode;
}

/**
 * Merender isi halaman bila sesi valid, atau layar pemberitahuan
 * selama proses verifikasi/pengalihan berlangsung.
 *
 * @param props - Lihat `AuthGuardProps`.
 * @returns Konten terlindungi atau layar pemuatan.
 */
export default function AuthGuard({ peran, children }: AuthGuardProps) {
  const { sesi, terhidrasi } = useSistem();
  const router = useRouter();

  // Efek pengalihan dijalankan di browser setelah data sesi dimuat.
  useEffect(() => {
    if (!terhidrasi) return;
    if (!sesi) {
      router.replace("/login");
      return;
    }
    if (sesi.peran !== peran) {
      router.replace(PETA_HALAMAN[sesi.peran]);
    }
  }, [terhidrasi, sesi, peran, router]);

  // Selama verifikasi (atau sesi tidak cocok), tampilkan layar memuat.
  if (!terhidrasi || !sesi || sesi.peran !== peran) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-amber-300 border-t-amber-500" />
        <p className="text-sm text-slate-500">Memverifikasi sesi pengguna…</p>
      </div>
    );
  }

  return <DashboardShell peran={peran}>{children}</DashboardShell>;
}
