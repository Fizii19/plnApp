/**
 * =============================================================================
 * app/petugas/page.tsx
 * -----------------------------------------------------------------------------
 * Dashboard Petugas Loket terhubung ke MySQL via API routes.
 *
 * Alur 3-langkah:
 *   1. Cari pelanggan by no_kontrol  → tampilkan kartu identitas.
 *      Bila tidak ditemukan → tombol "+ Tambah Pelanggan Baru" (UserPlus).
 *   2. Pilih periode tagihan dari riwayat pemakaian di DB.
 *   3. Proses pembayaran → /api/pembayaran/proses (transaksi atomik MySQL).
 *      Cetak rekening listrik.
 *
 * Semua query menggunakan Prepared Statements di API routes.
 * =============================================================================
 */
"use client";

import { useCallback, useState, type FormEvent } from "react";
import {
  Search,
  User,
  MapPin,
  Phone,
  Tag,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  CreditCard,
  Zap,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Receipt,
  Gauge,
  UserPlus,
  Loader2,
} from "lucide-react";
import Modal from "@/components/modal";
import PrintArea from "@/components/print-area";
import RekeningDoc from "@/components/rekening-doc";
import StatCard from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useSistem } from "@/lib/store";
import { formatAngka, formatNoTelepon, formatPeriode, formatRupiah, formatTanggal } from "@/lib/format";
import type { Pelanggan, Pemakaian, Tarif } from "@/lib/types";

const DAFTAR_JENIS = ["Rumah Tangga", "Niaga", "Industri", "Sosial"] as const;

/** Struktur data pelanggan + tarif + riwayat pemakaian dari API cari. */
interface DataCari {
  pelanggan: {
    no_kontrol: number;
    nama_pelanggan: string;
    alamat_pelanggan: string;
    no_tlp_pelanggan: string;
    jenis_pelanggan: string;
  };
  tarif: {
    id_tarif: number;
    jenis_pelanggan: string;
    biaya_beban: number;
    tarif_kwh: number;
  } | null;
  pemakaian_terakhir: {
    id_pemakaian: number;
    no_kontrol: number;
    tahun: number;
    bulan: number;
    meter_awal: number;
    meter_akhir: number;
    jumlah_pakai: number;
    biaya_beban_pemakaian: number;
    biaya_pemakaian: number;
  } | null;
}

/** Struktur riwayat pemakaian dari API riwayat — sudah include flag sudah_bayar. */
interface ItemPemakaian {
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
  /** true bila sudah ada pembayaran yang link ke id_pemakaian ini */
  sudah_bayar: boolean;
  /** id_pembayaran terkait bila sudah lunas */
  pembayaran_id: number | null;
  /** tanggal_bayar bila sudah lunas */
  tanggal_bayar: string | null;
  /** jumlah yang dibayar bila sudah lunas */
  jumlah_bayar: number | null;
  /** nama petugas penerima bila sudah lunas */
  nama_petugas_bayar: string | null;
}

interface RiwayatData {
  pelanggan: DataCari["pelanggan"];
  pemakaian: ItemPemakaian[];
  pembayaran: unknown[];
}

/** Hasil dari POST /api/pembayaran/bayar */
interface HasilProses {
  pembayaran: { id_pembayaran: number; tanggal_bayar: string; jumlah_bayar: number };
  pemakaian: ItemPemakaian;
  pelanggan: DataCari["pelanggan"];
  tarif: DataCari["tarif"];
  biaya_total: number;
  jumlah_bayar: number;
  kembalian: number;
}

/**
 * Membuat tanggal hari ini dalam format ISO YYYY-MM-DD.
 * Hanya dipanggil dari event handler di browser.
 *
 * @returns String tanggal format ISO.
 */
function tanggalHariIni(): string {
  const now = new Date();
  const d = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${d(now.getMonth() + 1)}-${d(now.getDate())}`;
}

/**
 * Merender dashboard petugas loket yang terhubung ke MySQL.
 * Mendukung tambah pelanggan baru bila no_kontrol belum terdaftar.
 *
 * @returns Elemen halaman loket petugas.
 */
export default function HalamanPetugas() {
  const { sesi, apiFetch } = useSistem();

  // ─────── STATE PENCARIAN ───────
  const [inputNoKontrol, setInputNoKontrol] = useState("");
  const [galatCari, setGalatCari] = useState("");
  const [loadingCari, setLoadingCari] = useState(false);
  const [tidakDitemukan, setTidakDitemukan] = useState(false);

  // ─────── STATE DATA PELANGGAN ───────
  const [dataCari, setDataCari] = useState<DataCari | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatData | null>(null);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);

  // ─────── STATE PERIODE TERPILIH ───────
  const [idPemakaianAktif, setIdPemakaianAktif] = useState<number | null>(null);
  const [tanggalCetak, setTanggalCetak] = useState("");

  // ─────── STATE PEMBAYARAN ───────
  const [prosesLoading, setProsesLoading] = useState(false);
  const [hasilProses, setHasilProses] = useState<HasilProses | null>(null);
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "galat"; teks: string } | null>(null);

  // ─────── STATE CETAK ───────
  const [pratinjauTerbuka, setPratinjauTerbuka] = useState(false);

  // ─────── STATE MODAL TAMBAH PELANGGAN ───────
  const [modalTambahTerbuka, setModalTambahTerbuka] = useState(false);
  const [formTambah, setFormTambah] = useState({
    no_kontrol: "",
    nama_pelanggan: "",
    alamat_pelanggan: "",
    no_tlp_pelanggan: "",
    jenis_pelanggan: "Rumah Tangga",
  });
  const [loadingTambah, setLoadingTambah] = useState(false);
  const [galatTambah, setGalatTambah] = useState("");

  // ─────── TURUNAN ───────
  const pelangganAktif = riwayat?.pelanggan ?? dataCari?.pelanggan;
  const tarifAktif = dataCari?.tarif;
  const daftarPemakaian = riwayat?.pemakaian ?? [];

  const itemTerpilih = daftarPemakaian.find((p) => p.id_pemakaian === idPemakaianAktif);

  // Gunakan flag sudah_bayar dari API — akurat karena link via id_pemakaian
  const periodeTerpilihSudahLunas = itemTerpilih?.sudah_bayar ?? false;

  /**
   * Bukti pembayaran milik periode terpilih.
   * Dibentuk dari flag riwayat API (`pembayaran_id` via JOIN id_pemakaian),
   * sehingga selaras dengan endpoint POST /api/pembayaran/bayar.
   * Null bila periode masih berstatus "Belum Dibayar".
   */
  const pembayaranTerpilih =
    periodeTerpilihSudahLunas && itemTerpilih?.pembayaran_id != null
      ? {
          id_pembayaran: itemTerpilih.pembayaran_id,
          tanggal_bayar: itemTerpilih.tanggal_bayar,
        }
      : null;

  const jumlahLunas = daftarPemakaian.filter((p) => p.sudah_bayar).length;
  const jumlahBelum = daftarPemakaian.length - jumlahLunas;

  // ─────── HANDLER FUNGSI ───────

  /**
   * Mengambil riwayat pemakaian + pembayaran dari MySQL.
   *
   * @param noKontrol - Nomor kontrol pelanggan.
   */
  const muatRiwayat = useCallback(async (noKontrol: number) => {
    setLoadingRiwayat(true);
    const res = await apiFetch<RiwayatData>(`/api/pelanggan/riwayat?no_kontrol=${noKontrol}`);
    if (res.success && res.data) setRiwayat(res.data);
    setLoadingRiwayat(false);
  }, [apiFetch]);

  /**
   * Mencari pelanggan di MySQL berdasarkan nomor kontrol.
   * Bila tidak ditemukan, tampilkan opsi tambah pelanggan baru.
   *
   * @param event - Event submit form pencarian.
   */
  const saatCari = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const noStr = inputNoKontrol.trim();
    if (!noStr) { setGalatCari("No kontrol wajib diisi"); return; }

    setLoadingCari(true);
    setGalatCari("");
    setTidakDitemukan(false);
    setDataCari(null);
    setRiwayat(null);
    setIdPemakaianAktif(null);
    setPesan(null);
    setHasilProses(null);

    const res = await apiFetch<DataCari>(`/api/pelanggan/cari?no_kontrol=${noStr}`);
    setLoadingCari(false);

    if (res.success && res.data) {
      setDataCari(res.data);
      await muatRiwayat(res.data.pelanggan.no_kontrol);
    } else if (res.message?.includes("tidak ditemukan") || (res as { success: boolean }).success === false) {
      // Pelanggan belum terdaftar
      setTidakDitemukan(true);
      setGalatCari(`No kontrol "${noStr}" tidak terdaftar di database.`);
      // Pre-fill no_kontrol di form tambah
      setFormTambah((f) => ({ ...f, no_kontrol: noStr }));
    } else {
      setGalatCari(res.message || "Terjadi kesalahan saat mencari data");
    }
  };

  /**
   * Mereset semua state dan kembali ke form pencarian.
   */
  const gantiPelanggan = () => {
    setInputNoKontrol("");
    setGalatCari("");
    setTidakDitemukan(false);
    setDataCari(null);
    setRiwayat(null);
    setIdPemakaianAktif(null);
    setTanggalCetak("");
    setPesan(null);
    setHasilProses(null);
  };

  /**
   * Memilih periode tagihan dari daftar pemakaian.
   *
   * @param item - Baris pemakaian yang dipilih.
   */
  const pilihPeriode = (item: ItemPemakaian) => {
    setIdPemakaianAktif(item.id_pemakaian);
    setTanggalCetak(tanggalHariIni());
    setPesan(null);
    setHasilProses(null);
  };

  /**
   * Mencatat pembayaran untuk pemakaian yang sudah ada di DB.
   * Memanggil /api/pembayaran/bayar dengan id_pemakaian terpilih.
   */
  const prosesPembayaran = async () => {
    if (!itemTerpilih) return;

    // Guard: cek flag dari API, bukan tebak sendiri
    if (itemTerpilih.sudah_bayar) {
      setPesan({
        tipe: "galat",
        teks: `Periode ${formatPeriode(itemTerpilih.bulan, itemTerpilih.tahun)} sudah lunas (No. Bukti #${itemTerpilih.pembayaran_id}). Tidak dapat dibayar dua kali.`,
      });
      return;
    }

    setProsesLoading(true);
    setPesan(null);

    const res = await apiFetch<HasilProses>("/api/pembayaran/bayar", {
      method: "POST",
      body: JSON.stringify({ id_pemakaian: itemTerpilih.id_pemakaian }),
    });

    if (res.success && res.data) {
      setHasilProses(res.data);
      setTanggalCetak(tanggalHariIni());
      setPesan({
        tipe: "sukses",
        teks: `✓ Pembayaran ${formatPeriode(itemTerpilih.bulan, itemTerpilih.tahun)} sebesar ${formatRupiah(res.data.biaya_total)} berhasil dicatat. No. Bukti #${res.data.pembayaran.id_pembayaran}.`,
      });
      // Reload riwayat supaya status Lunas/Belum di tabel ikut update
      if (pelangganAktif) await muatRiwayat(pelangganAktif.no_kontrol);
    } else {
      setPesan({ tipe: "galat", teks: res.message || "Gagal memproses pembayaran" });
    }

    setProsesLoading(false);
  };

  const bukaPratinjau = () => {
    setTanggalCetak(tanggalHariIni());
    setPratinjauTerbuka(true);
  };

  /**
   * Mendaftarkan pelanggan baru ke MySQL via /api/admin/pelanggan,
   * lalu otomatis muat data untuk langsung melayani pembayaran.
   */
  const simpanPelangganBaru = async () => {
    if (!formTambah.no_kontrol || !formTambah.nama_pelanggan || !formTambah.alamat_pelanggan) {
      setGalatTambah("No kontrol, nama, dan alamat wajib diisi");
      return;
    }

    setLoadingTambah(true);
    setGalatTambah("");

    const res = await apiFetch("/api/admin/pelanggan", {
      method: "POST",
      body: JSON.stringify({
        no_kontrol: Number(formTambah.no_kontrol),
        nama_pelanggan: formTambah.nama_pelanggan.trim(),
        alamat_pelanggan: formTambah.alamat_pelanggan.trim(),
        no_tlp_pelanggan: formTambah.no_tlp_pelanggan.trim(),
        jenis_pelanggan: formTambah.jenis_pelanggan,
      }),
    });

    if (res.success) {
      setModalTambahTerbuka(false);
      setGalatTambah("");
      // Reset form tambah
      setFormTambah({ no_kontrol: "", nama_pelanggan: "", alamat_pelanggan: "", no_tlp_pelanggan: "", jenis_pelanggan: "Rumah Tangga" });

      // Otomatis cari pelanggan yang baru didaftarkan
      setTidakDitemukan(false);
      setGalatCari("");
      const resCari = await apiFetch<DataCari>(`/api/pelanggan/cari?no_kontrol=${formTambah.no_kontrol}`);
      if (resCari.success && resCari.data) {
        setDataCari(resCari.data);
        await muatRiwayat(resCari.data.pelanggan.no_kontrol);
        setPesan({ tipe: "sukses", teks: `Pelanggan "${formTambah.nama_pelanggan}" berhasil didaftarkan dan siap dilayani.` });
      }
    } else {
      setGalatTambah(res.message || "Gagal mendaftarkan pelanggan");
    }

    setLoadingTambah(false);
  };

  // ─────── DATA UNTUK DOKUMEN REKENING ───────
  const dokRekening =
    pelangganAktif && itemTerpilih && tarifAktif
      ? {
          pelanggan: {
            noKontrol: pelangganAktif.no_kontrol,
            nama: pelangganAktif.nama_pelanggan,
            alamat: pelangganAktif.alamat_pelanggan,
            noTlp: pelangganAktif.no_tlp_pelanggan,
            jenis: pelangganAktif.jenis_pelanggan as Pelanggan["jenis"],
          },
          pemakaian: {
            idPemakaian: itemTerpilih.id_pemakaian,
            noKontrol: itemTerpilih.no_kontrol,
            tahun: itemTerpilih.tahun,
            bulan: itemTerpilih.bulan,
            meterAwal: itemTerpilih.meter_awal,
            meterAkhir: itemTerpilih.meter_akhir,
            jumlahPakai: itemTerpilih.jumlah_pakai,
            biayaBebanPemakaian: itemTerpilih.biaya_beban_pemakaian,
            biayaPemakaian: itemTerpilih.biaya_pemakaian,
          } as Pemakaian,
          tarif: {
            idTarif: tarifAktif.id_tarif,
            jenisPlg: tarifAktif.jenis_pelanggan as Tarif["jenisPlg"],
            biayaBeban: tarifAktif.biaya_beban,
            tarifKwh: tarifAktif.tarif_kwh,
          } as Tarif,
          namaPetugas: sesi?.nama,
          tanggalCetak,
        }
      : null;

  // ─────── RENDER ───────
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Loket Pembayaran</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Cari pelanggan di database, proses tagihan, lalu cetak rekening listrik.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-slate-500">Petugas:</span>
          <span className="font-semibold text-slate-700">{sesi?.nama ?? "—"}</span>
        </div>
      </header>

      {/* Notifikasi */}
      {pesan ? (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
            pesan.tipe === "sukses"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {pesan.teks}
        </div>
      ) : null}

      {/* ───── LANGKAH 1: CARI PELANGGAN ───── */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-sm font-bold">1</div>
              <div>
                <CardTitle>Cari Pelanggan</CardTitle>
                <CardDescription>Masukkan nomor kontrol dari kartu pelanggan</CardDescription>
              </div>
            </div>
            {pelangganAktif ? (
              <Button variant="outline" size="sm" onClick={gantiPelanggan}>
                <RefreshCw className="h-3.5 w-3.5" /> Ganti Pelanggan
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={saatCari} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="no-kontrol">No Kontrol</Label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="no-kontrol"
                  type="text"
                  inputMode="numeric"
                  value={inputNoKontrol}
                  onChange={(e) => { setInputNoKontrol(e.target.value); setGalatCari(""); setTidakDitemukan(false); }}
                  placeholder="cth. 123456"
                  className="pl-10 w-48"
                  disabled={!!pelangganAktif || loadingCari}
                />
              </div>
            </div>
            <Button type="submit" disabled={!!pelangganAktif || loadingCari}>
              {loadingCari ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Cari Pelanggan
            </Button>
          </form>

          {/* Error + Tombol Tambah Pelanggan Baru */}
          {galatCari ? (
            <div className="mt-4 space-y-3">
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {galatCari}
              </div>
              {tidakDitemukan ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormTambah((f) => ({ ...f, no_kontrol: inputNoKontrol.trim() }));
                    setModalTambahTerbuka(true);
                    setGalatTambah("");
                  }}
                  className="border-dashed border-amber-400 text-amber-700 hover:bg-amber-50"
                >
                  <UserPlus className="h-4 w-4" />
                  + Tambah Pelanggan Baru (No. {inputNoKontrol})
                </Button>
              ) : null}
            </div>
          ) : null}

          {/* Kartu identitas pelanggan yang ditemukan */}
          {pelangganAktif ? (
            <div className="mt-5 overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center gap-2 bg-amber-100/60 border-b border-amber-200 px-5 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-amber-600" fill="currentColor" />
                <p className="text-sm font-semibold text-amber-700">Pelanggan Ditemukan</p>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Identitas</p>
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="font-semibold text-slate-800">{pelangganAktif.nama_pelanggan}</p>
                      <p className="text-xs text-slate-400 font-mono">No. {pelangganAktif.no_kontrol}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <p className="text-sm text-slate-600">{pelangganAktif.alamat_pelanggan}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kontak & Jenis</p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                    <p className="text-sm text-slate-600">{formatNoTelepon(pelangganAktif.no_tlp_pelanggan) || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 shrink-0 text-slate-400" />
                    <Badge variant="success">{pelangganAktif.jenis_pelanggan}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tarif Berlaku</p>
                  {tarifAktif ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 shrink-0 text-amber-500" />
                        <p className="text-lg font-bold text-amber-600">
                          {formatRupiah(tarifAktif.tarif_kwh)}
                          <span className="text-xs font-normal text-slate-400"> /kWh</span>
                        </p>
                      </div>
                      <p className="text-sm text-slate-500">
                        Beban <span className="font-medium text-slate-700">{formatRupiah(tarifAktif.biaya_beban)}</span>/bulan
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-red-500">Tarif belum diatur untuk jenis ini</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ───── SETELAH PELANGGAN DITEMUKAN ───── */}
      {pelangganAktif ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Periode"
              nilai={String(daftarPemakaian.length)}
              keterangan="Riwayat pembacaan meter"
              warna="bg-sky-500"
              ikon={<Calendar className="h-5 w-5" />}
            />
            <StatCard
              label="Belum Dibayar"
              nilai={String(jumlahBelum)}
              keterangan="Tagihan tertunggak"
              warna="bg-red-500"
              ikon={<Clock className="h-5 w-5" />}
              tren={jumlahBelum > 0 ? "turun" : "netral"}
            />
            <StatCard
              label="Sudah Dibayar"
              nilai={String(jumlahLunas)}
              keterangan="Periode lunas"
              warna="bg-emerald-500"
              ikon={<CheckCircle2 className="h-5 w-5" />}
              tren="naik"
            />
          </div>

          {/* ───── LANGKAH 2: PILIH PERIODE ───── */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-sm font-bold">2</div>
                <div>
                  <CardTitle>Pilih Periode Tagihan</CardTitle>
                  <CardDescription>
                    Riwayat pemakaian {pelangganAktif.nama_pelanggan} (No. {pelangganAktif.no_kontrol}) dari database
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingRiwayat ? (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Memuat riwayat dari database…</span>
                </div>
              ) : daftarPemakaian.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                  <Calendar className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Belum ada data pemakaian untuk pelanggan ini.</p>
                  <p className="text-xs text-slate-300">Pembacaan meter dicatat melalui menu Pemakaian di dashboard admin.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-xs">
                        {["Periode", "Meter", "kWh", "Total Tagihan", "Status", "Aksi"].map((h) => (
                          <th key={h} className="px-5 py-3 text-left font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {daftarPemakaian.map((p) => {
                        const aktif = p.id_pemakaian === idPemakaianAktif;
                        return (
                          <tr
                            key={p.id_pemakaian}
                            className={`border-b border-slate-50 transition-colors ${aktif ? "bg-amber-50" : "hover:bg-slate-50"}`}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {formatPeriode(p.bulan, p.tahun)}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-slate-500">
                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <span className="text-slate-600">{formatAngka(p.meter_awal)}</span>
                                <ArrowRight className="h-3 w-3 text-slate-300" />
                                <span className="text-slate-600">{formatAngka(p.meter_akhir)}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3"><Badge variant="info">{formatAngka(p.jumlah_pakai)}</Badge></td>
                            <td className="px-5 py-3 font-semibold text-slate-800">{formatRupiah(p.biaya_total)}</td>
                            <td className="px-5 py-3">
                              {p.sudah_bayar ? (
                                <div className="space-y-0.5">
                                  <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />Lunas</Badge>
                                  {p.tanggal_bayar && (
                                    <p className="text-[10px] text-slate-400">
                                      {formatTanggal(p.tanggal_bayar.split("T")[0])}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" />Belum Bayar</Badge>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <Button
                                variant={aktif ? "default" : "outline"}
                                size="sm"
                                onClick={() => pilihPeriode(p)}
                                aria-pressed={aktif}
                              >
                                {aktif ? <><CheckCircle2 className="h-3.5 w-3.5" />Terpilih</> : <>Pilih<ChevronRight className="h-3.5 w-3.5" /></>}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ───── LANGKAH 3: RINCIAN & PROSES ───── */}
          {itemTerpilih ? (
            <Card>
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-sm font-bold">3</div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-amber-500" />
                      Rincian & Proses — {formatPeriode(itemTerpilih.bulan, itemTerpilih.tahun)}
                    </CardTitle>
                    <CardDescription>Periksa rincian biaya sebelum menerima pembayaran.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Rincian biaya */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Rincian Biaya</p>
                    <dl className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="flex items-center gap-2 text-slate-500"><Gauge className="h-4 w-4" />Meter Awal → Akhir</dt>
                        <dd className="font-medium font-mono text-slate-700">{formatAngka(itemTerpilih.meter_awal)} → {formatAngka(itemTerpilih.meter_akhir)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="flex items-center gap-2 text-slate-500"><Zap className="h-4 w-4 text-amber-400" />Jumlah Pakai</dt>
                        <dd className="font-semibold text-slate-700">{formatAngka(itemTerpilih.jumlah_pakai)} kWh</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-slate-500">Biaya Beban</dt>
                        <dd className="text-slate-700">{formatRupiah(itemTerpilih.biaya_beban_pemakaian)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-slate-500">
                          Biaya Pemakaian
                          {tarifAktif && (
                            <span className="ml-1 text-xs text-slate-400">
                              ({formatAngka(itemTerpilih.jumlah_pakai)} × {formatRupiah(tarifAktif.tarif_kwh)})
                            </span>
                          )}
                        </dt>
                        <dd className="text-slate-700">{formatRupiah(itemTerpilih.biaya_pemakaian)}</dd>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                        <dt className="font-bold text-amber-800 uppercase">Total Tagihan</dt>
                        <dd className="text-xl font-extrabold text-amber-600">{formatRupiah(itemTerpilih.biaya_total)}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Status & Aksi */}
                  <div className="space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Status & Aksi</p>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Status Tagihan</p>
                      {pembayaranTerpilih || hasilProses ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" fill="currentColor" />
                            <p className="font-semibold text-emerald-600">Lunas</p>
                          </div>
                          {(pembayaranTerpilih || hasilProses?.pembayaran) && (
                            <p className="text-sm text-slate-500">
                              No Bukti #
                              {hasilProses?.pembayaran.id_pembayaran ?? pembayaranTerpilih?.id_pembayaran}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-orange-400" />
                          <p className="font-semibold text-orange-600">Belum Dibayar</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <Button
                        onClick={prosesPembayaran}
                        disabled={!!(pembayaranTerpilih || hasilProses) || prosesLoading}
                        size="lg"
                        className="w-full"
                      >
                        {prosesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        {(pembayaranTerpilih || hasilProses) ? "Sudah Dibayar" : prosesLoading ? "Memproses…" : "Proses Pembayaran"}
                      </Button>
                      <Button variant="secondary" size="lg" onClick={bukaPratinjau} className="w-full">
                        <Printer className="h-4 w-4" />
                        Pratinjau & Cetak Rekening
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      Rekening dicetak pada kertas putih biasa tanpa menu dashboard.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {/* ─── Area Cetak ─── */}
      {dokRekening ? (
        <PrintArea>
          <RekeningDoc {...dokRekening} />
        </PrintArea>
      ) : null}

      {/* ─── Modal Pratinjau Rekening ─── */}
      {pratinjauTerbuka && dokRekening ? (
        <Modal
          judul={`Pratinjau Rekening — ${formatPeriode(dokRekening.pemakaian.bulan, dokRekening.pemakaian.tahun)}`}
          onClose={() => setPratinjauTerbuka(false)}
          kelasPanel="max-w-3xl"
          footer={
            <>
              <Button variant="outline" onClick={() => setPratinjauTerbuka(false)}>Tutup</Button>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Cetak Sekarang
              </Button>
            </>
          }
        >
          <div className="rounded-xl border border-slate-200 overflow-hidden print:border-0">
            <RekeningDoc {...dokRekening} />
          </div>
        </Modal>
      ) : null}

      {/* ─── Modal Tambah Pelanggan Baru ─── */}
      {modalTambahTerbuka ? (
        <Modal
          judul="Daftarkan Pelanggan Baru"
          onClose={() => { setModalTambahTerbuka(false); setGalatTambah(""); }}
          kelasPanel="max-w-xl"
          footer={
            <>
              <Button variant="outline" onClick={() => { setModalTambahTerbuka(false); setGalatTambah(""); }}>Batal</Button>
              <Button onClick={simpanPelangganBaru} disabled={loadingTambah}>
                {loadingTambah ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Daftarkan & Lanjutkan
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                No kontrol <span className="font-bold">{inputNoKontrol}</span> belum terdaftar.
                Isi form berikut untuk mendaftarkan pelanggan baru langsung ke database MySQL.
              </p>
            </div>
            {galatTambah ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {galatTambah}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nt-no">No Kontrol *</Label>
                <Input
                  id="nt-no"
                  type="number"
                  value={formTambah.no_kontrol}
                  onChange={(e) => setFormTambah((f) => ({ ...f, no_kontrol: e.target.value }))}
                  placeholder="Nomor unik pelanggan"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt-jenis">Jenis Pelanggan *</Label>
                <Select
                  id="nt-jenis"
                  value={formTambah.jenis_pelanggan}
                  onChange={(e) => setFormTambah((f) => ({ ...f, jenis_pelanggan: e.target.value }))}
                  options={DAFTAR_JENIS.map((j) => ({ value: j, label: j }))}
                />
              </div>
              <div className="col-span-full space-y-1.5">
                <Label htmlFor="nt-nama">Nama Pelanggan *</Label>
                <Input
                  id="nt-nama"
                  value={formTambah.nama_pelanggan}
                  onChange={(e) => setFormTambah((f) => ({ ...f, nama_pelanggan: e.target.value }))}
                  placeholder="Nama lengkap pelanggan"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nt-tlp">No Telepon</Label>
                <Input
                  id="nt-tlp"
                  value={formTambah.no_tlp_pelanggan}
                  onChange={(e) => setFormTambah((f) => ({ ...f, no_tlp_pelanggan: e.target.value }))}
                  placeholder="08xxx"
                />
              </div>
              <div className="col-span-full space-y-1.5">
                <Label htmlFor="nt-alamat">Alamat *</Label>
                <Textarea
                  id="nt-alamat"
                  value={formTambah.alamat_pelanggan}
                  onChange={(e) => setFormTambah((f) => ({ ...f, alamat_pelanggan: e.target.value }))}
                  rows={3}
                  placeholder="Alamat lengkap"
                />
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
