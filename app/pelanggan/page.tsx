/**
 * =============================================================================
 * app/pelanggan/page.tsx
 * -----------------------------------------------------------------------------
 * Halaman Pelanggan — cek tagihan dan riwayat pembayaran real-time dari MySQL.
 *
 * Menampilkan:
 *   • Kartu identitas pelanggan
 *   • 4 stat cards (total tagihan, tunggakan, sudah bayar, tagihan terakhir)
 *   • Tab "Pemakaian" — daftar meter per bulan + status Lunas/Belum
 *   • Tab "Riwayat Bayar" — semua transaksi pembayaran dengan no. bukti & petugas
 * =============================================================================
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  User,
  MapPin,
  Phone,
  Tag,
  Zap,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  ArrowRight,
  Banknote,
  Loader2,
  RefreshCw,
  ServerCrash,
  CreditCard,
  FileText,
  Hash,
  UserCheck,
} from "lucide-react";
import StatCard from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSistem } from "@/lib/store";
import {
  formatAngka,
  formatNoTelepon,
  formatPeriode,
  formatRupiah,
  formatTanggal,
} from "@/lib/format";

// ─── Tipe data dari API /api/pelanggan/riwayat ───────────────────────────────

interface PelangganData {
  no_kontrol: number;
  nama_pelanggan: string;
  alamat_pelanggan: string;
  no_tlp_pelanggan: string;
  jenis_pelanggan: string;
}

interface PemakaianItem {
  id_pemakaian: number;
  no_kontrol: number;
  tahun: number;
  bulan: number;
  meter_awal: number;
  meter_akhir: number;
  jumlah_pakai: number;
  biaya_beban_pemakaian: number;
  biaya_pemakaian: number;
  biaya_total: number;
}

interface PembayaranItem {
  id_pembayaran: number;
  no_kontrol: number;
  jumlah_bayar: number;
  biaya_total: number;
  tanggal_bayar: string;
  nama_petugas: string;
  /** Bulan periode yang dibayar (dari JOIN pemakaian, bisa null jika tak ada data pemakaian) */
  bulan: number | null;
  /** Tahun periode yang dibayar */
  tahun: number | null;
  /** id_pemakaian terkait (dari JOIN) */
  pemakaian_id: number | null;
}

interface Ringkasan {
  total_periode: number;
  total_pemakaian_kwh: number;
  total_tagihan: number;
  total_dibayar: number;
  jumlah_transaksi: number;
}

interface RiwayatData {
  pelanggan: PelangganData;
  pemakaian: PemakaianItem[];
  pembayaran: PembayaranItem[];
  ringkasan: Ringkasan;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Halaman utama pelanggan. Semua data diambil dari MySQL via API.
 *
 * @returns Elemen halaman pelanggan.
 */
export default function HalamanPelanggan() {
  const { sesi, apiFetch } = useSistem();

  const [riwayat, setRiwayat] = useState<RiwayatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("pemakaian");

  /**
   * Mengambil seluruh data riwayat dari MySQL via /api/pelanggan/riwayat.
   * Hanya dipanggil ketika sesi.noKontrol tersedia.
   */
  const muat = useCallback(async () => {
    if (!sesi?.noKontrol) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<RiwayatData>(
        `/api/pelanggan/riwayat?no_kontrol=${sesi.noKontrol}`,
      );
      if (res.success && res.data) {
        setRiwayat(res.data);
      } else {
        setError(res.message || "Gagal memuat data riwayat dari database.");
      }
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  }, [sesi, apiFetch]);

  useEffect(() => {
    muat();
  }, [muat]);

  // ─── Hitung status lunas tiap pemakaian ─────────────────────────────────────
  // Matching: pemakaian.bulan + pemakaian.tahun === pembayaran.bulan + pembayaran.tahun
  // (bulan/tahun di pembayaran sudah di-JOIN dari pemakaian di API)
  function cekLunas(p: PemakaianItem): boolean {
    if (!riwayat) return false;
    return riwayat.pembayaran.some(
      (b) => b.bulan === p.bulan && b.tahun === p.tahun,
    );
  }

  function cariBukti(p: PemakaianItem): PembayaranItem | undefined {
    if (!riwayat) return undefined;
    return riwayat.pembayaran.find(
      (b) => b.bulan === p.bulan && b.tahun === p.tahun,
    );
  }

  const jumlahBelumLunas = riwayat
    ? riwayat.pemakaian.filter((p) => !cekLunas(p)).length
    : 0;

  const totalTunggakan = riwayat
    ? riwayat.pemakaian
        .filter((p) => !cekLunas(p))
        .reduce((sum, p) => sum + p.biaya_total, 0)
    : 0;

  // ─── Loading / Error screens ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
        <p className="text-sm">Memuat data dari database MySQL…</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <ServerCrash className="h-12 w-12 text-red-400" />
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Button variant="outline" size="sm" onClick={muat}>
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!riwayat) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-800">Data tidak ditemukan</h2>
          <p className="max-w-sm text-sm text-slate-500">
            Akun Anda tidak terhubung ke kartu pelanggan di database. Hubungi loket untuk pengecekan.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { pelanggan, pemakaian, pembayaran, ringkasan } = riwayat;
  const tagihanTerakhir = pemakaian[0];

  // ─── Render utama ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tagihan &amp; Riwayat</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Halo, <span className="font-semibold text-slate-700">{pelanggan.nama_pelanggan}</span> —
            pantau pemakaian dan riwayat pembayaran listrik Anda.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={muat} className="text-slate-400">
          <RefreshCw className="h-4 w-4" />
          Perbarui Data
        </Button>
      </header>

      {/* ── Kartu Identitas Pelanggan ── */}
      <Card className="overflow-hidden">
        {/* accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
        <CardContent className="pt-5">
          <div className="grid gap-6 sm:grid-cols-3">

            {/* Kolom 1: identitas */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Data Pelanggan
              </p>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <User className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg leading-tight">
                    {pelanggan.nama_pelanggan}
                  </p>
                  <p className="text-xs font-mono text-slate-400">
                    No. Kontrol: {pelanggan.no_kontrol}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p className="text-sm text-slate-600">{pelanggan.alamat_pelanggan}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                <p className="text-sm text-slate-600">
                  {formatNoTelepon(pelanggan.no_tlp_pelanggan) || "—"}
                </p>
              </div>
            </div>

            {/* Kolom 2: jenis + konsumsi */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Jenis &amp; Konsumsi
              </p>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-400" />
                <Badge variant="success" className="text-sm px-3 py-1">
                  {pelanggan.jenis_pelanggan}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <p className="text-sm text-slate-600">
                  Total{" "}
                  <span className="font-semibold text-slate-800">
                    {formatAngka(ringkasan.total_pemakaian_kwh)} kWh
                  </span>{" "}
                  sepanjang riwayat
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-800">{ringkasan.total_periode}</span>{" "}
                  periode tercatat
                </p>
              </div>
            </div>

            {/* Kolom 3: status */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Status Tagihan
              </p>
              {jumlahBelumLunas > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-sm font-semibold text-red-700">Ada Tunggakan</p>
                  </div>
                  <p className="text-xs text-red-600 pl-5">
                    {jumlahBelumLunas} periode belum dibayar
                  </p>
                  <p className="text-xs text-red-500 pl-5 font-medium">
                    Total: {formatRupiah(totalTunggakan)}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" fill="currentColor" />
                    <p className="text-sm font-semibold text-emerald-700">Semua Lunas</p>
                  </div>
                  <p className="text-xs text-emerald-600 pl-5">Tidak ada tunggakan</p>
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Tagihan"
          nilai={formatRupiah(ringkasan.total_tagihan)}
          keterangan={`${ringkasan.total_periode} periode pemakaian`}
          warna="bg-amber-400"
          ikon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          label="Tunggakan"
          nilai={formatRupiah(totalTunggakan)}
          keterangan={`${jumlahBelumLunas} periode belum dibayar`}
          warna="bg-red-500"
          ikon={<AlertCircle className="h-5 w-5" />}
          tren={jumlahBelumLunas > 0 ? "turun" : "netral"}
        />
        <StatCard
          label="Sudah Dibayar"
          nilai={formatRupiah(ringkasan.total_dibayar)}
          keterangan={`${ringkasan.jumlah_transaksi} transaksi`}
          warna="bg-emerald-500"
          ikon={<Banknote className="h-5 w-5" />}
          tren={ringkasan.jumlah_transaksi > 0 ? "naik" : "netral"}
        />
        <StatCard
          label="Tagihan Terakhir"
          nilai={tagihanTerakhir ? formatRupiah(tagihanTerakhir.biaya_total) : "—"}
          keterangan={
            tagihanTerakhir
              ? formatPeriode(tagihanTerakhir.bulan, tagihanTerakhir.tahun)
              : "Belum ada data"
          }
          warna="bg-sky-500"
          ikon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* ── Tabs: Pemakaian + Riwayat Bayar ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="pemakaian" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Pemakaian
            {pemakaian.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                {pemakaian.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pembayaran" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Riwayat Bayar
            {pembayaran.length > 0 && (
              <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                {pembayaran.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB PEMAKAIAN ── */}
        <TabsContent value="pemakaian">
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Riwayat Pemakaian Listrik
              </CardTitle>
              <CardDescription>
                Pembacaan meter dan rincian biaya per periode. Status menunjukkan apakah tagihan
                periode tersebut sudah dibayar di loket.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {pemakaian.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-slate-400">
                  <Zap className="h-10 w-10 opacity-20" />
                  <p className="text-sm font-medium">Belum ada data pemakaian</p>
                  <p className="text-xs text-slate-300">
                    Data pemakaian dimasukkan oleh petugas melalui dashboard admin.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-xs">
                        {[
                          "Periode",
                          "Meter Awal → Akhir",
                          "kWh",
                          "Biaya Beban",
                          "Biaya Pemakaian",
                          "Total Tagihan",
                          "Status",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pemakaian.map((p) => {
                        const lunas = cekLunas(p);
                        const bukti = cariBukti(p);
                        return (
                          <tr
                            key={p.id_pemakaian}
                            className="border-b border-slate-50 transition-colors hover:bg-slate-50"
                          >
                            {/* Periode */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                {formatPeriode(p.bulan, p.tahun)}
                              </div>
                            </td>
                            {/* Meter */}
                            <td className="px-5 py-3 text-slate-500">
                              <div className="flex items-center gap-1 font-mono text-xs">
                                <span className="font-medium text-slate-700">
                                  {formatAngka(p.meter_awal)}
                                </span>
                                <ArrowRight className="h-3 w-3 text-slate-300" />
                                <span className="font-medium text-slate-700">
                                  {formatAngka(p.meter_akhir)}
                                </span>
                              </div>
                            </td>
                            {/* kWh */}
                            <td className="px-5 py-3">
                              <Badge variant="info">{formatAngka(p.jumlah_pakai)} kWh</Badge>
                            </td>
                            {/* Biaya beban */}
                            <td className="px-5 py-3 text-right text-slate-600">
                              {formatRupiah(p.biaya_beban_pemakaian)}
                            </td>
                            {/* Biaya pemakaian */}
                            <td className="px-5 py-3 text-right text-slate-600">
                              {formatRupiah(p.biaya_pemakaian)}
                            </td>
                            {/* Total */}
                            <td className="px-5 py-3 text-right font-semibold text-slate-800">
                              {formatRupiah(p.biaya_total)}
                            </td>
                            {/* Status */}
                            <td className="px-5 py-3">
                              <div className="flex flex-col items-start gap-1">
                                {lunas ? (
                                  <Badge variant="success" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3" fill="currentColor" />
                                    Lunas
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    Belum Bayar
                                  </Badge>
                                )}
                                {bukti && (
                                  <p className="text-[10px] text-slate-400">
                                    {formatTanggal(
                                      (bukti.tanggal_bayar || "").split("T")[0],
                                    )}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            {pemakaian.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-3">
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>
                    Total:{" "}
                    <span className="font-semibold text-slate-700">
                      {pemakaian.length} periode
                    </span>
                  </span>
                  <span>
                    Lunas:{" "}
                    <span className="font-semibold text-emerald-600">
                      {pemakaian.length - jumlahBelumLunas}
                    </span>
                  </span>
                  <span>
                    Menunggak:{" "}
                    <span className="font-semibold text-red-600">{jumlahBelumLunas}</span>
                  </span>
                  <span>
                    Total kWh:{" "}
                    <span className="font-semibold text-slate-700">
                      {formatAngka(ringkasan.total_pemakaian_kwh)}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── TAB RIWAYAT PEMBAYARAN ── */}
        <TabsContent value="pembayaran">
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                Riwayat Pembayaran
              </CardTitle>
              <CardDescription>
                Semua transaksi pembayaran yang telah Anda lakukan di loket, terbaru dahulu.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {pembayaran.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-slate-400">
                  <CreditCard className="h-10 w-10 opacity-20" />
                  <p className="text-sm font-medium">Belum ada riwayat pembayaran</p>
                  <p className="text-xs text-slate-300">
                    Pembayaran dilakukan di loket oleh petugas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-xs">
                        {[
                          "No. Bukti",
                          "Periode Tagihan",
                          "Tanggal Bayar",
                          "Diterima Oleh",
                          "Total Tagihan",
                          "Jumlah Dibayar",
                          "Status",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pembayaran.map((b) => (
                        <tr
                          key={b.id_pembayaran}
                          className="border-b border-slate-50 transition-colors hover:bg-slate-50"
                        >
                          {/* No Bukti */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <Hash className="h-3.5 w-3.5 text-slate-400" />
                              <span className="font-mono text-xs font-bold text-slate-500">
                                {b.id_pembayaran}
                              </span>
                            </div>
                          </td>
                          {/* Periode */}
                          <td className="px-5 py-3">
                            {b.bulan && b.tahun ? (
                              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                {formatPeriode(b.bulan, b.tahun)}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          {/* Tanggal bayar */}
                          <td className="px-5 py-3 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {formatTanggal(
                                (b.tanggal_bayar || "").split("T")[0],
                              ) || "—"}
                            </div>
                          </td>
                          {/* Petugas */}
                          <td className="px-5 py-3 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {b.nama_petugas || "—"}
                            </div>
                          </td>
                          {/* Total tagihan */}
                          <td className="px-5 py-3 text-right text-slate-700">
                            {formatRupiah(b.biaya_total)}
                          </td>
                          {/* Jumlah dibayar */}
                          <td className="px-5 py-3 text-right font-semibold text-emerald-600">
                            {formatRupiah(b.jumlah_bayar)}
                          </td>
                          {/* Status */}
                          <td className="px-5 py-3">
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" fill="currentColor" />
                              Lunas
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            {pembayaran.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-3">
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>
                    Total transaksi:{" "}
                    <span className="font-semibold text-slate-700">
                      {pembayaran.length}
                    </span>
                  </span>
                  <span>
                    Total dibayar:{" "}
                    <span className="font-semibold text-emerald-600">
                      {formatRupiah(ringkasan.total_dibayar)}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
