/**
 * =============================================================================
 * components/rekening-doc.tsx
 * -----------------------------------------------------------------------------
 * Dokumen Rekening Listrik yang didesain ulang. Tampilan profesional dengan
 * Lucide icons untuk elemen visual dan badge status. Dipakai dua kali:
 * pratinjau layar (modal) dan area cetak (#area-cetak).
 * =============================================================================
 */

import {
  Zap,
  User,
  MapPin,
  Phone,
  Tag,
  Calendar,
  Gauge,
  ArrowRight,
  Receipt,
  CheckCircle2,
  Banknote,
  Building2,
} from "lucide-react";
import { formatAngka, formatRupiah, formatTanggal, formatPeriode } from "@/lib/format";
import { hitungRincianTagihan } from "@/lib/billing";
import type { Pelanggan, Pemakaian, Tarif } from "@/lib/types";

/** Properti dokumen rekening. */
export interface RekeningDocProps {
  pelanggan: Pelanggan;
  pemakaian: Pemakaian;
  tarif?: Tarif;
  namaPetugas?: string;
  tanggalCetak: string;
}

/**
 * Merender dokumen rekening listrik satu periode yang komunikatif.
 * Menggunakan Lucide icons untuk ikon identitas, meter, dan biaya.
 *
 * @param props - Lihat `RekeningDocProps`.
 * @returns Elemen dokumen rekening listrik.
 */
export default function RekeningDoc({
  pelanggan,
  pemakaian,
  tarif,
  namaPetugas = "-",
  tanggalCetak,
}: RekeningDocProps) {
  const rincian = hitungRincianTagihan(tarif, pemakaian.meterAwal, pemakaian.meterAkhir);

  return (
    <div className="bg-white text-slate-800 font-sans" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* ───── KOP SURAT ───── */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-2 ring-white/40">
              <Zap className="h-8 w-8 text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-wide">SIP LISTRIK</h1>
              <p className="text-sm text-amber-100">Sistem Informasi Pembayaran Listrik</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3 w-3 text-amber-200" />
                <p className="text-xs text-amber-200">Rayon Demo — Kel. Sukamaju</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 ring-1 ring-white/30">
              <Receipt className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">Rekening Listrik</span>
            </div>
            <p className="mt-2 text-right font-mono text-2xl font-extrabold text-white">
              {String(pelanggan.noKontrol).padStart(8, "0")}
            </p>
            <p className="text-xs text-amber-200">Nomor Rekening</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* ───── IDENTITAS PELANGGAN & PERIODE ───── */}
        <div className="grid grid-cols-2 gap-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          {/* Identitas */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Data Pelanggan
            </p>
            <div className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-bold text-slate-800">{pelanggan.nama}</p>
                <p className="text-xs text-slate-500">
                  Jenis:{" "}
                  <span className="font-semibold text-amber-600">{pelanggan.jenis}</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-sm text-slate-600">{pelanggan.alamat}</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-sm text-slate-600">{pelanggan.noTlp || "-"}</p>
            </div>
          </div>

          {/* Periode & tarif */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Detail Tagihan
            </p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-bold text-slate-800">
                  {formatPeriode(pemakaian.bulan, pemakaian.tahun)}
                </p>
                <p className="text-xs text-slate-500">Periode tagihan</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm text-slate-600">
                  {tarif ? formatRupiah(tarif.tarifKwh) : "-"}{" "}
                  <span className="text-slate-400">/ kWh</span>
                </p>
                <p className="text-xs text-slate-500">
                  Biaya beban {tarif ? formatRupiah(tarif.biayaBeban) : "-"}/bln
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-sm text-slate-600">
                Diterbitkan: {formatTanggal(tanggalCetak) || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* ───── PEMBACAAN METER ───── */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 bg-slate-800 px-5 py-3">
            <Gauge className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-white">Pembacaan Meter</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            <div className="px-5 py-4 text-center">
              <p className="text-xs font-medium text-slate-400 uppercase">Meter Awal</p>
              <p className="mt-1 text-2xl font-bold font-mono text-slate-700">
                {formatAngka(pemakaian.meterAwal)}
              </p>
              <p className="text-xs text-slate-400">kWh</p>
            </div>
            <div className="px-5 py-4 flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-slate-300" />
            </div>
            <div className="px-5 py-4 text-center">
              <p className="text-xs font-medium text-slate-400 uppercase">Meter Akhir</p>
              <p className="mt-1 text-2xl font-bold font-mono text-slate-700">
                {formatAngka(pemakaian.meterAkhir)}
              </p>
              <p className="text-xs text-slate-400">kWh</p>
            </div>
          </div>
          <div className="border-t border-slate-100 bg-amber-50 px-5 py-3 text-center">
            <p className="text-xs text-amber-700 font-medium">
              Jumlah Pemakaian
            </p>
            <p className="text-3xl font-extrabold text-amber-600">
              {rincian.jumlahPakai}{" "}
              <span className="text-lg font-medium">kWh</span>
            </p>
          </div>
        </div>

        {/* ───── RINCIAN BIAYA ───── */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 bg-slate-800 px-5 py-3">
            <Banknote className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-white">Rincian Biaya</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-5 py-3 text-slate-600">Biaya Beban / Abonemen</td>
                <td className="px-5 py-3 text-right font-medium text-slate-800">
                  {formatRupiah(rincian.biayaBeban)}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-slate-600">
                  Biaya Pemakaian{" "}
                  <span className="text-xs text-slate-400">
                    ({rincian.jumlahPakai} kWh ×{" "}
                    {tarif ? formatRupiah(tarif.tarifKwh) : "-"}/kWh)
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium text-slate-800">
                  {formatRupiah(rincian.biayaPemakaian)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-amber-50">
                <td className="px-5 py-4 font-bold text-amber-800 uppercase text-base">
                  Total Tagihan
                </td>
                <td className="px-5 py-4 text-right text-2xl font-extrabold text-amber-600">
                  {formatRupiah(rincian.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ───── STATUS LUNAS ───── */}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" fill="currentColor" />
          <p className="text-sm font-semibold text-emerald-700">
            Tagihan ini telah diproses dan dicatat oleh sistem.
          </p>
        </div>

        {/* ───── TANDA TANGAN ───── */}
        <div className="flex items-end justify-between pt-2">
          <div className="text-center">
            <p className="text-xs text-slate-500">Diterima oleh,</p>
            <div className="mt-12 w-44 border-t border-slate-400">
              <p className="pt-1 text-sm font-semibold text-slate-700">{namaPetugas}</p>
              <p className="text-xs text-slate-400">Petugas Loket</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Pelanggan,</p>
            <div className="mt-12 w-44 border-t border-slate-400">
              <p className="pt-1 text-sm font-semibold text-slate-700">{pelanggan.nama}</p>
              <p className="text-xs text-slate-400">No. {pelanggan.noKontrol}</p>
            </div>
          </div>
        </div>

        <p className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-300">
          Dokumen diterbitkan secara otomatis oleh SIP Listrik • Simpan sebagai bukti pembayaran •
          Tanggal cetak: {formatTanggal(tanggalCetak) || "-"}
        </p>
      </div>
    </div>
  );
}
