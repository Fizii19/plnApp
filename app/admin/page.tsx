/**
 * =============================================================================
 * app/admin/page.tsx
 * -----------------------------------------------------------------------------
 * Dashboard Administrator yang terhubung ke MySQL via API routes.
 * Semua data diambil dari database, bukan mock data.
 * CRUD dilakukan via API dengan prepared statements (SQL Injection aman).
 * =============================================================================
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  DollarSign,
  AlertTriangle,
  UserCog,
  Zap,
  TrendingUp,
  Receipt,
  Calendar,
  CircleDollarSign,
  ArrowUpRight,
  Activity,
  RefreshCw,
  Loader2,
  ServerCrash,
} from "lucide-react";
import StatCard from "@/components/stat-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useSistem } from "@/lib/store";
import { formatPeriode, formatRupiah, formatTanggal, namaBulan } from "@/lib/format";
import {
  AdminTabelPelanggan,
  AdminTabelTarif,
  AdminTabelPetugas,
  AdminTabelPemakaian,
  AdminTabelPembayaran,
} from "@/components/admin-tables";

/** Struktur ringkasan dari API `/api/admin/ringkasan`. */
interface Ringkasan {
  total_pelanggan: number;
  total_pendapatan: number;
  total_transaksi: number;
  tagihan_belum_bayar: number;
  total_petugas: number;
  pembayaran_terbaru: Array<{
    id_pembayaran: number;
    no_kontrol: number;
    nama_pelanggan: string;
    nama_petugas: string;
    jumlah_bayar: number;
    biaya_total: number;
    tanggal_bayar: string;
    bulan?: number;
    tahun?: number;
  }>;
  tarif_berlaku: Array<{
    id_tarif: number;
    jenis_pelanggan: string;
    biaya_beban: number;
    tarif_kwh: number;
  }>;
}

/**
 * Merender dashboard administrator dengan data MySQL.
 *
 * @returns Elemen halaman admin.
 */
export default function HalamanAdmin() {
  const { apiFetch } = useSistem();

  const [tabAktif, setTabAktif] = useState("ringkasan");
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [loadingRingkasan, setLoadingRingkasan] = useState(true);
  const [errorRingkasan, setErrorRingkasan] = useState("");

  /**
   * Mengambil data ringkasan dari API `/api/admin/ringkasan`.
   */
  const muatRingkasan = useCallback(async () => {
    setLoadingRingkasan(true);
    setErrorRingkasan("");
    try {
      const res = await apiFetch<Ringkasan>("/api/admin/ringkasan");
      if (res.success && res.data) {
        setRingkasan(res.data);
      } else {
        setErrorRingkasan(res.message || "Gagal memuat ringkasan");
      }
    } catch {
      setErrorRingkasan("Tidak dapat terhubung ke server");
    } finally {
      setLoadingRingkasan(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    muatRingkasan();
  }, [muatRingkasan]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Kelola data pelanggan, tarif, petugas, pemakaian, dan pembayaran listrik.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={tabAktif} onValueChange={setTabAktif} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="ringkasan" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Ringkasan
          </TabsTrigger>
          <TabsTrigger value="pelanggan" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Pelanggan
          </TabsTrigger>
          <TabsTrigger value="tarif" className="gap-1.5">
            <CircleDollarSign className="h-3.5 w-3.5" />
            Tarif
          </TabsTrigger>
          <TabsTrigger value="petugas" className="gap-1.5">
            <UserCog className="h-3.5 w-3.5" />
            Petugas
          </TabsTrigger>
          <TabsTrigger value="pemakaian" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Pemakaian
          </TabsTrigger>
          <TabsTrigger value="pembayaran" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Pembayaran
          </TabsTrigger>
        </TabsList>

        {/* ──────────────── TAB RINGKASAN ──────────────── */}
        <TabsContent value="ringkasan" className="space-y-6">
          {loadingRingkasan ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Memuat data dari database…</span>
            </div>
          ) : errorRingkasan ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <ServerCrash className="h-10 w-10 text-red-400" />
                <p className="text-sm font-medium text-red-700">{errorRingkasan}</p>
                <Button variant="outline" size="sm" onClick={muatRingkasan}>
                  <RefreshCw className="h-4 w-4" />
                  Coba Lagi
                </Button>
              </CardContent>
            </Card>
          ) : ringkasan ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Total Pelanggan"
                  nilai={String(ringkasan.total_pelanggan)}
                  keterangan="Terdaftar di database"
                  warna="bg-amber-400"
                  ikon={<Users className="h-5 w-5" />}
                />
                <StatCard
                  label="Total Pendapatan"
                  nilai={formatRupiah(ringkasan.total_pendapatan)}
                  keterangan={`${ringkasan.total_transaksi} transaksi`}
                  warna="bg-emerald-500"
                  ikon={<DollarSign className="h-5 w-5" />}
                  tren="naik"
                />
                <StatCard
                  label="Tagihan Belum Bayar"
                  nilai={String(ringkasan.tagihan_belum_bayar)}
                  keterangan="Periode pemakaian tertunggak"
                  warna="bg-red-500"
                  ikon={<AlertTriangle className="h-5 w-5" />}
                  tren={ringkasan.tagihan_belum_bayar > 0 ? "turun" : "netral"}
                />
                <StatCard
                  label="Petugas Loket"
                  nilai={String(ringkasan.total_petugas)}
                  keterangan="Staf aktif di sistem"
                  warna="bg-sky-500"
                  ikon={<UserCog className="h-5 w-5" />}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Pembayaran terbaru */}
                <Card className="lg:col-span-2">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                          Pembayaran Terbaru
                        </CardTitle>
                        <CardDescription>5 transaksi terakhir dari database</CardDescription>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTabAktif("pembayaran")}
                        className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"
                      >
                        Lihat semua <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-50 bg-slate-50/50 text-xs">
                            <th className="px-5 py-3 text-left font-semibold text-slate-500">No Bukti</th>
                            <th className="px-5 py-3 text-left font-semibold text-slate-500">Pelanggan</th>
                            <th className="px-5 py-3 text-left font-semibold text-slate-500">Periode</th>
                            <th className="px-5 py-3 text-left font-semibold text-slate-500">Tanggal</th>
                            <th className="px-5 py-3 text-right font-semibold text-slate-500">Jumlah</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ringkasan.pembayaran_terbaru.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                                Belum ada transaksi pembayaran.
                              </td>
                            </tr>
                          ) : (
                            ringkasan.pembayaran_terbaru.map((b) => (
                              <tr key={b.id_pembayaran} className="border-b border-slate-50 hover:bg-slate-50/50">
                                <td className="px-5 py-3 font-mono text-xs font-bold text-slate-400">
                                  #{b.id_pembayaran}
                                </td>
                                <td className="px-5 py-3 font-medium text-slate-700">{b.nama_pelanggan}</td>
                                <td className="px-5 py-3 text-slate-500">
                                  {b.bulan && b.tahun ? formatPeriode(b.bulan, b.tahun) : "—"}
                                </td>
                                <td className="px-5 py-3 text-slate-500">
                                  {formatTanggal(b.tanggal_bayar.split("T")[0])}
                                </td>
                                <td className="px-5 py-3 text-right font-semibold text-emerald-600">
                                  {formatRupiah(b.jumlah_bayar)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Tarif berlaku */}
                <Card>
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-amber-500" />
                      Tarif Berlaku
                    </CardTitle>
                    <CardDescription>Digunakan hitung tagihan otomatis</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-slate-50">
                      {ringkasan.tarif_berlaku.map((t) => (
                        <li key={t.id_tarif} className="flex items-center justify-between px-5 py-3.5">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{t.jenis_pelanggan}</p>
                            <p className="text-xs text-slate-400">
                              Beban {formatRupiah(t.biaya_beban)}/bln
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-amber-600">
                              {formatRupiah(t.tarif_kwh)}
                            </p>
                            <p className="text-xs text-slate-400">per kWh</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* ──────────────── TAB CRUD (komponen terpisah) ──────────────── */}
        <TabsContent value="pelanggan">
          <AdminTabelPelanggan />
        </TabsContent>
        <TabsContent value="tarif">
          <AdminTabelTarif />
        </TabsContent>
        <TabsContent value="petugas">
          <AdminTabelPetugas />
        </TabsContent>
        <TabsContent value="pemakaian">
          <AdminTabelPemakaian />
        </TabsContent>
        <TabsContent value="pembayaran">
          <AdminTabelPembayaran />
        </TabsContent>
      </Tabs>
    </div>
  );
}
