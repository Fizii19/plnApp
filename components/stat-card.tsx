/**
 * =============================================================================
 * components/stat-card.tsx
 * -----------------------------------------------------------------------------
 * Kartu statistik ringkas (angka utama) untuk halaman dashboard.
 * =============================================================================
 */

import type { ReactNode } from "react";

/** Properti kartu statistik. */
export interface StatCardProps {
  /** Label keterangan di atas angka, contoh: "Total Pelanggan". */
  label: string;
  /** Nilai utama yang ditampilkan besar. */
  nilai: string;
  /** Teks kecil tambahan di bawah angka (opsional). */
  keterangan?: string;
  /** Node ikon dekoratif di pojok kanan atas (opsional). */
  ikon?: ReactNode;
  /** Warna aksen kartu (kelas Tailwind), default amber. */
  warna?: string;
}

/**
 * Merender satu kartu statistik berlatar putih dengan aksen warna.
 *
 * @param props - Lihat `StatCardProps`.
 * @returns Elemen kartu statistik siap tampil.
 */
export default function StatCard({ label, nilai, keterangan, ikon, warna = "bg-amber-400" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{nilai}</p>
          {keterangan ? <p className="mt-1 text-xs text-slate-400">{keterangan}</p> : null}
        </div>
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-white ${warna}`}>
          {ikon ?? "⚡"}
        </span>
      </div>
    </div>
  );
}
