/**
 * =============================================================================
 * components/rekening-doc.tsx
 * -----------------------------------------------------------------------------
 * Dokumen "Rekening Listrik" yang dicetak petugas loket. Komponen yang sama
 * dipakai dua kali: sebagai pratinjau di layar (modal) dan sebagai area cetak
 * (`#area-cetak`, hanya tampil saat print).
 * =============================================================================
 */

import { formatAngka, formatRupiah, formatTanggal, formatPeriode } from "@/lib/format";
import { hitungRincianTagihan } from "@/lib/billing";
import type { Pelanggan, Pemakaian, Tarif } from "@/lib/types";

/** Properti dokumen rekening. */
export interface RekeningDocProps {
  /** Data pelanggan pemilik rekening. */
  pelanggan: Pelanggan;
  /** Catatan pemakaian periode yang dicetak. */
  pemakaian: Pemakaian;
  /** Tarif yang berlaku untuk pelanggan tersebut. */
  tarif?: Tarif;
  /** Nama petugas loket yang menerbitkan (ditandatangani). */
  namaPetugas?: string;
  /** Tanggal cetak dalam format ISO (YYYY-MM-DD). */
  tanggalCetak: string;
}

/**
 * Merender dokumen rekening listrik satu periode.
 *
 * @param props - Lihat `RekeningDocProps`.
 * @returns Elemen dokumen rekening berkop surat.
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
    <div className="bg-white p-8 text-slate-800">
      {/* Kop surat dokumen */}
      <header className="flex items-start gap-4 border-b-2 border-slate-800 pb-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-400 text-2xl">
          ⚡
        </span>
        <div className="flex-1">
          <h1 className="text-lg font-bold uppercase tracking-wide">SIP Listrik</h1>
          <p className="text-sm text-slate-600">Sistem Pembayaran Listrik — Rayon Demo</p>
          <p className="text-xs text-slate-500">Jl. Listrik Raya No. 1, Kel. Sukamaju</p>
        </div>
        <div className="text-right text-xs text-slate-600">
          <p className="font-semibold">No. Rekening</p>
          <p className="font-mono text-sm font-bold">
            {String(pelanggan.noKontrol).padStart(6, "0")}
          </p>
          <p className="mt-1">Tanggal: {formatTanggal(tanggalCetak) || "-"}</p>
        </div>
      </header>

      {/* Identitas pelanggan & periode */}
      <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Pelanggan</p>
          <p className="font-semibold">{pelanggan.nama}</p>
          <p className="text-slate-600">{pelanggan.alamat}</p>
          <p className="text-slate-600">
            No. Telp: {pelanggan.noTlp} • Jenis: {pelanggan.jenis}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">Periode</p>
          <p className="font-semibold">{formatPeriode(pemakaian.bulan, pemakaian.tahun)}</p>
          <p className="text-slate-600">
            Tarif: {tarif ? `${formatRupiah(tarif.tarifKwh)}/kWh` : "-"}
          </p>
          <p className="text-slate-600">
            Biaya beban: {tarif ? formatRupiah(tarif.biayaBeban) : "-"}
          </p>
        </div>
      </section>

      {/* Rincian pembacaan meter */}
      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="border border-slate-300 px-3 py-2">Uraian</th>
            <th className="border border-slate-300 px-3 py-2 text-right">Nilai</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-300 px-3 py-2">Meter Awal</td>
            <td className="border border-slate-300 px-3 py-2 text-right">
              {formatAngka(pemakaian.meterAwal)}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-3 py-2">Meter Akhir</td>
            <td className="border border-slate-300 px-3 py-2 text-right">
              {formatAngka(pemakaian.meterAkhir)}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-3 py-2 font-semibold">Jumlah Pakai (kWh)</td>
            <td className="border border-slate-300 px-3 py-2 text-right font-semibold">
              {rincian.jumlahPakai}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-3 py-2">Biaya Beban</td>
            <td className="border border-slate-300 px-3 py-2 text-right">
              {formatRupiah(rincian.biayaBeban)}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 px-3 py-2">
              Biaya Pemakaian ({rincian.jumlahPakai} kWh x{" "}
              {tarif ? formatRupiah(tarif.tarifKwh) : "-"})
            </td>
            <td className="border border-slate-300 px-3 py-2 text-right">
              {formatRupiah(rincian.biayaPemakaian)}
            </td>
          </tr>
          <tr className="bg-amber-50">
            <td className="border border-slate-300 px-3 py-2 font-bold uppercase">Total Tagihan</td>
            <td className="border border-slate-300 px-3 py-2 text-right text-base font-bold">
              {formatRupiah(rincian.total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Tanda tangan */}
      <footer className="mt-8 flex items-end justify-between text-sm">
        <div>
          <p className="text-xs text-slate-500">Diterima oleh,</p>
          <div className="mt-10 w-48 border-t border-slate-400 text-center">
            <p className="pt-1 font-semibold">{namaPetugas}</p>
            <p className="text-xs text-slate-500">Petugas Loket</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Pelanggan,</p>
          <div className="mt-10 w-48 border-t border-slate-400 text-center">
            <p className="pt-1 font-semibold">{pelanggan.nama}</p>
            <p className="text-xs text-slate-500">No. {pelanggan.noKontrol}</p>
          </div>
        </div>
      </footer>

      <p className="mt-6 text-center text-[10px] text-slate-400">
        Dokumen ini dibuat otomatis oleh sistem pembayaran listrik. Simpan sebagai bukti pembayaran.
      </p>
    </div>
  );
}
