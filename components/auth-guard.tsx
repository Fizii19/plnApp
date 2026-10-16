/**
 * =============================================================================
 * components/auth-guard.tsx
 * -----------------------------------------------------------------------------
 * Penjaga rute berbasis JWT + React Context.
 *
 * - Menunggu validasi token selesai (terhidrasi = true).
 * - Mengalihkan ke /login bila tidak ada sesi atau token tidak valid.
 * - Mengalihkan ke halaman peran yang benar bila peran tidak cocok.
 * - Mem-render DashboardShell hanya bila sesi valid dan peran sesuai.
 * =============================================================================
 */
"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { PETA_HALAMAN } from "@/lib/auth";
import { useSistem } from "@/lib/store";
import DashboardShell from "./dashboard-shell";
import type { Peran } from "@/lib/types";

/** Properti penjaga rute. */
export interface AuthGuardProps {
  /** Peran yang diizinkan mengakses halaman ini. */
  peran: Peran;
  /** Konten halaman yang dilindungi. */
  children: ReactNode;
}

/**
 * Merender konten halaman bila sesi JWT valid dan peran cocok.
 * Menampilkan layar muat selama verifikasi, lalu mengalihkan bila perlu.
 *
 * @param props - Lihat `AuthGuardProps`.
 * @returns Konten terlindungi atau layar pemuatan.
 */
export default function AuthGuard({ peran, children }: AuthGuardProps) {
  const { sesi, terhidrasi } = useSistem();
  const router = useRouter();

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

  // Selama verifikasi atau bila sesi/peran tidak cocok, tampilkan loading
  if (!terhidrasi || !sesi || sesi.peran !== peran) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 shadow-lg">
          <Zap className="h-7 w-7 text-slate-900 animate-pulse" fill="currentColor" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="h-1 w-40 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 animate-[loading_1s_ease-in-out_infinite] rounded-full bg-amber-400" />
          </div>
          <p className="text-sm text-slate-500">Memverifikasi sesi pengguna…</p>
        </div>
      </div>
    );
  }

  return <DashboardShell peran={peran}>{children}</DashboardShell>;
}
