/**
 * =============================================================================
 * components/dashboard-shell.tsx
 * -----------------------------------------------------------------------------
 * Kerangka layout dashboard yang didesain ulang dengan Lucide React icons.
 * Sidebar navigasi per peran, header mobile, dan area konten utama.
 * =============================================================================
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  Receipt,
  Home,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Shield,
  Briefcase,
  User,
} from "lucide-react";
import { useSistem } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Peran } from "@/lib/types";

/** Satu item navigasi sidebar. */
interface ItemNav {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

/** Menu sidebar yang relevan untuk setiap peran pengguna. */
const NAV_PER_PERAN: Record<Peran, ItemNav[]> = {
  admin: [
    {
      href: "/admin",
      label: "Dashboard Admin",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
  ],
  petugas: [
    {
      href: "/petugas",
      label: "Loket Pembayaran",
      icon: <Receipt className="h-4 w-4" />,
    },
  ],
  pelanggan: [
    {
      href: "/pelanggan",
      label: "Tagihan & Riwayat",
      icon: <Home className="h-4 w-4" />,
    },
  ],
};

/** Konfigurasi visual per peran (warna aksen, ikon, label). */
const CONFIG_PERAN: Record<
  Peran,
  { label: string; icon: React.ReactNode; warna: string; warnaText: string; warnaBg: string }
> = {
  admin: {
    label: "Administrator",
    icon: <Shield className="h-3.5 w-3.5" />,
    warna: "bg-amber-400",
    warnaText: "text-amber-700",
    warnaBg: "bg-amber-50",
  },
  petugas: {
    label: "Petugas Loket",
    icon: <Briefcase className="h-3.5 w-3.5" />,
    warna: "bg-sky-500",
    warnaText: "text-sky-700",
    warnaBg: "bg-sky-50",
  },
  pelanggan: {
    label: "Pelanggan",
    icon: <User className="h-3.5 w-3.5" />,
    warna: "bg-emerald-500",
    warnaText: "text-emerald-700",
    warnaBg: "bg-emerald-50",
  },
};

/** Properti kerangka dashboard. */
export interface DashboardShellProps {
  peran: Peran;
  children: React.ReactNode;
}

/**
 * Merender kerangka dashboard dengan sidebar, header, dan area konten.
 * Sidebar tersembunyi saat dicetak.
 *
 * @param props - Lihat `DashboardShellProps`.
 * @returns Layout dashboard lengkap.
 */
export default function DashboardShell({ peran, children }: DashboardShellProps) {
  const { sesi, logout } = useSistem();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileTerbuka, setMobileTerbuka] = useState(false);

  const konfig = CONFIG_PERAN[peran];
  const menu = NAV_PER_PERAN[peran];

  /** Mengakhiri sesi dan kembali ke halaman login. */
  const keluar = () => {
    logout();
    router.replace("/login");
  };

  /** Inisial nama pengguna untuk avatar. */
  const inisial = sesi?.nama
    ? sesi.nama
        .split(" ")
        .slice(0, 2)
        .map((s) => s[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="flex min-h-screen bg-slate-100 print:bg-white">
      {/* ─────────────────────── SIDEBAR DESKTOP ─────────────────────── */}
      <aside className="print:hidden hidden md:flex w-64 flex-col border-r border-slate-200 bg-white fixed inset-y-0 left-0 z-30">
        {/* Brand header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400">
            <Zap className="h-5 w-5 text-slate-900" fill="currentColor" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">SIP Listrik</p>
            <p className="text-[11px] text-slate-400">Sistem Pembayaran Listrik</p>
          </div>
        </div>

        {/* Navigasi */}
        <nav className="flex-1 p-3 space-y-0.5">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Menu
          </p>
          {menu.map((item) => {
            const aktif = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  aktif
                    ? "bg-amber-50 text-amber-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                    aktif ? "bg-amber-100 text-amber-600" : "text-slate-400 group-hover:text-slate-600",
                  )}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {aktif && (
                  <ChevronRight className="h-4 w-4 text-amber-400" />
                )}
                {item.badge && (
                  <Badge variant="destructive" className="text-[10px] px-1.5">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* Kartu pengguna */}
        <div className="p-3">
          <div className={cn("rounded-xl p-3", konfig.warnaBg)}>
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold",
                  konfig.warna,
                )}
              >
                {inisial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {sesi?.nama ?? "-"}
                </p>
                <div className={cn("flex items-center gap-1 text-xs", konfig.warnaText)}>
                  {konfig.icon}
                  {konfig.label}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={keluar}
              className="mt-3 w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </Button>
          </div>
        </div>
      </aside>

      {/* ─────────────────── OVERLAY MOBILE SIDEBAR ───────────────────── */}
      {mobileTerbuka && (
        <div
          className="print:hidden fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileTerbuka(false)}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            {/* Header sidebar mobile */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400">
                  <Zap className="h-5 w-5 text-slate-900" fill="currentColor" />
                </div>
                <p className="font-bold text-slate-900">SIP Listrik</p>
              </div>
              <button
                onClick={() => setMobileTerbuka(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-0.5">
              {menu.map((item) => {
                const aktif = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileTerbuka(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                      aktif
                        ? "bg-amber-50 text-amber-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={keluar}
                className="w-full text-red-600 border-red-200"
              >
                <LogOut className="h-4 w-4" />
                Keluar dari {konfig.label}
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* ─────────────────────── AREA KONTEN UTAMA ─────────────────────── */}
      <div className="flex flex-1 flex-col md:ml-64">
        {/* Top bar */}
        <header className="print:hidden sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 md:px-6">
          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMobileTerbuka(true)}
            className="md:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb desktop */}
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-700">
              {menu.find((m) => m.href === pathname)?.label ?? "Dashboard"}
            </span>
          </div>

          {/* Right side: badge peran + notif */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                konfig.warnaBg,
                konfig.warnaText,
              )}
            >
              {konfig.icon}
              {konfig.label}
            </div>
            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
              <Bell className="h-4 w-4" />
            </button>
            {/* Avatar */}
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold cursor-default",
                konfig.warna,
              )}
              title={sesi?.nama}
            >
              {inisial}
            </div>
          </div>
        </header>

        {/* Konten halaman */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
