/**
 * =============================================================================
 * components/dashboard-shell.tsx
 * -----------------------------------------------------------------------------
 * Kerangka layout dashboard: sidebar navigasi (per peran), header, dan area
 * konten. Dipakai oleh halaman admin, petugas loket, dan pelanggan.
 * =============================================================================
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSistem } from "@/lib/store";
import type { Peran } from "@/lib/types";

/** Satu item navigasi sidebar. */
interface ItemNav {
  /** Tujuan rute halaman. */
  href: string;
  /** Label tampilan. */
  label: string;
  /** Glyph ikon sederhana. */
  ikon: string;
}

/** Menu sidebar yang relevan untuk setiap peran pengguna. */
const NAV_PER_PERAN: Record<Peran, ItemNav[]> = {
  admin: [{ href: "/admin", label: "Dashboard Admin", ikon: "▦" }],
  petugas: [{ href: "/petugas", label: "Loket Pembayaran", ikon: "🧾" }],
  pelanggan: [{ href: "/pelanggan", label: "Tagihan & Riwayat", ikon: "🏠" }],
};

/** Nama peran untuk ditampilkan pada kartu pengguna. */
const LABEL_PERAN: Record<Peran, string> = {
  admin: "Administrator",
  petugas: "Petugas Loket",
  pelanggan: "Pelanggan",
};

/** Properti kerangka dashboard. */
export interface DashboardShellProps {
  /** Peran pemilik halaman, menentukan menu sidebar. */
  peran: Peran;
  /** Isi halaman di dalam area konten. */
  children: React.ReactNode;
}

/**
 * Merender kerangka dashboard dengan sidebar dan area konten.
 *
 * @param props - Lihat `DashboardShellProps`.
 * @returns Layout dashboard; otomatis disembunyikan saat halaman dicetak.
 */
export default function DashboardShell({ peran, children }: DashboardShellProps) {
  const { sesi, logout } = useSistem();
  const pathname = usePathname();
  const router = useRouter();

  /** Mengakhiri sesi lalu kembali ke halaman login. */
  const keluar = () => {
    logout();
    router.replace("/login");
  };

  const menu = NAV_PER_PERAN[peran];

  return (
    <div className="min-h-screen bg-slate-100 print:hidden">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-lg text-slate-900">
              ⚡
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-800">SIP Listrik</p>
              <p className="text-xs text-slate-400">Sistem Pembayaran Listrik</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {menu.map((item) => {
              const aktif = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    aktif
                      ? "bg-amber-50 text-amber-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span aria-hidden="true">{item.ikon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Kartu pengguna + tombol keluar */}
          <div className="border-t border-slate-100 p-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="truncate text-sm font-semibold text-slate-800">{sesi?.nama ?? "-"}</p>
              <p className="text-xs text-slate-400">{LABEL_PERAN[peran]}</p>
              <button
                type="button"
                onClick={keluar}
                className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
              >
                Keluar
              </button>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          {/* Header mobile */}
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 md:hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-900">
                ⚡
              </span>
              <span className="text-sm font-bold text-slate-800">SIP Listrik</span>
            </div>
            <button
              type="button"
              onClick={keluar}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
            >
              Keluar
            </button>
          </header>

          <main className="flex-1 p-5 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
