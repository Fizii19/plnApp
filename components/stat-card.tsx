/**
 * =============================================================================
 * components/stat-card.tsx
 * -----------------------------------------------------------------------------
 * Kartu statistik yang didesain ulang dengan Lucide React icons dan
 * indikator tren opsional. Dipakai di seluruh dashboard aplikasi.
 * =============================================================================
 */
import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Arah tren statistik untuk indikator visual. */
type ArahTren = "naik" | "turun" | "netral";

/** Properti kartu statistik. */
export interface StatCardProps {
  /** Label keterangan di atas angka. */
  label: string;
  /** Nilai utama yang ditampilkan besar. */
  nilai: string;
  /** Teks kecil tambahan di bawah angka. */
  keterangan?: string;
  /** Node ikon Lucide di area ikon. */
  ikon?: ReactNode;
  /** Kelas Tailwind untuk background ikon (default amber). */
  warna?: string;
  /** Arah tren untuk menampilkan indikator. */
  tren?: ArahTren;
  /** Nilai tren yang ditampilkan, contoh: "+12%" */
  nilaiTren?: string;
}

/**
 * Merender kartu statistik dengan nilai utama, ikon, dan indikator tren opsional.
 *
 * @param props - Lihat `StatCardProps`.
 * @returns Elemen kartu statistik.
 */
export default function StatCard({
  label,
  nilai,
  keterangan,
  ikon,
  warna = "bg-amber-400",
  tren,
  nilaiTren,
}: StatCardProps) {
  /** Konfigurasi visual berdasarkan arah tren. */
  const konfTren = {
    naik: {
      icon: <TrendingUp className="h-3 w-3" />,
      kelas: "text-emerald-600 bg-emerald-50",
    },
    turun: {
      icon: <TrendingDown className="h-3 w-3" />,
      kelas: "text-red-600 bg-red-50",
    },
    netral: {
      icon: <Minus className="h-3 w-3" />,
      kelas: "text-slate-500 bg-slate-100",
    },
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Dekorasi latar samar */}
      <div
        className={cn(
          "absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 transition-opacity group-hover:opacity-20",
          warna,
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 truncate">
            {nilai}
          </p>
          {keterangan ? (
            <p className="mt-1 text-xs text-slate-400 truncate">{keterangan}</p>
          ) : null}

          {/* Indikator tren */}
          {tren && nilaiTren ? (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                konfTren[tren].kelas,
              )}
            >
              {konfTren[tren].icon}
              {nilaiTren}
            </div>
          ) : null}
        </div>

        {/* Ikon */}
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
            warna,
          )}
        >
          {ikon}
        </div>
      </div>
    </div>
  );
}
