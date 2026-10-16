/**
 * =============================================================================
 * app/admin/page.tsx
 * -----------------------------------------------------------------------------
 * Dashboard Administrator.
 *
 * Mengikuti DFD Level 0 pada `blueprints/system-blueprint.json`, admin dapat:
 *   - melihat ringkasan sistem (pendapatan, tagihan, pelanggan, petugas)
 *   - CRUD data kartu pelanggan
 *   - CRUD data tarif
 *   - CRUD data petugas loket
 *   - CRUD data pemakaian
 *   - CRUD entri transaksi pembayaran
 * Semua data bersifat in-memory (mock) lewat context store `lib/store.tsx`.
 * =============================================================================
 */
"use client";

import { useState } from "react";
import CrudTable, { type BidangForm, type KolomTabel } from "@/components/crud-table";
import StatCard from "@/components/stat-card";
import { hitungRincianTagihan, getTarifUntukJenis, totalDariPemakaian } from "@/lib/billing";
import { formatPeriode, formatRupiah, formatTanggal, namaBulan } from "@/lib/format";
import { DAFTAR_JENIS } from "@/lib/mock-data";
import { idBerikutnya, useSistem } from "@/lib/store";
import type { Pembayaran, Pelanggan, Pemakaian, Petugas, Tarif } from "@/lib/types";

/** Daftar tab navigasi dashboard admin. */
const TAB = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "pelanggan", label: "Pelanggan" },
  { id: "tarif", label: "Tarif" },
  { id: "petugas", label: "Petugas" },
  { id: "pemakaian", label: "Pemakaian" },
  { id: "pembayaran", label: "Pembayaran" },
] as const;

/** Tipe id tab yang valid. */
type IdTab = (typeof TAB)[number]["id"];

/**
 * Mengecek apakah satu periode tagihan sudah dibayar.
 *
 * @param pembayaran - Daftar transaksi pembayaran.
 * @param noKontrol - Nomor kontrol pelanggan.
 * @param bulan - Bulan tagihan (1-12).
 * @param tahun - Tahun tagihan.
 * @returns true bila sudah ada pembayaran untuk periode tersebut.
 */
function sudahDibayar(
  pembayaran: Pembayaran[],
  noKontrol: number,
  bulan: number,
  tahun: number,
): boolean {
  return pembayaran.some((p) => p.noKontrol === noKontrol && p.bulan === bulan && p.tahun === tahun);
}

/**
 * Menghitung total pendapatan dari seluruh transaksi pembayaran.
 *
 * @param pembayaran - Daftar transaksi pembayaran.
 * @returns Total jumlah bayar seluruh transaksi.
 */
function totalPendapatan(pembayaran: Pembayaran[]): number {
  return pembayaran.reduce((akumulasi, p) => akumulasi + p.jumlahBayar, 0);
}

/**
 * Menghitung jumlah tagihan yang belum dibayar (pemakaian tanpa pembayaran).
 *
 * @param pemakaian - Daftar catatan pemakaian.
 * @param pembayaran - Daftar transaksi pembayaran.
 * @returns Jumlah baris pemakaian yang belum dibayar.
 */
function jumlahBelumDibayar(pemakaian: Pemakaian[], pembayaran: Pembayaran[]): number {
  return pemakaian.filter((p) => !sudahDibayar(pembayaran, p.noKontrol, p.bulan, p.tahun)).length;
}

/**
 * Merender dashboard administrator (ringkasan + menu CRUD).
 *
 * @returns Elemen dashboard admin.
 */
export default function HalamanAdmin() {
  const {
    pelanggan,
    tarif,
    petugas,
    pemakaian,
    pembayaran,
    simpanPelanggan,
    hapusPelanggan,
    simpanTarif,
    hapusTarif,
    simpanPetugas,
    hapusPetugas,
    simpanPemakaian,
    hapusPemakaian,
    simpanPembayaran,
    hapusPembayaran,
  } = useSistem();

  const [tab, setTab] = useState<IdTab>("ringkasan");

  /**
   * Mencari nama pelanggan berdasarkan nomor kontrol.
   *
   * @param noKontrol - Nomor kontrol yang dicari.
   * @returns Nama pelanggan atau "-" bila tidak ditemukan.
   */
  const namaPelanggan = (noKontrol: number): string =>
    pelanggan.find((p) => p.noKontrol === noKontrol)?.nama ?? "-";

  /**
   * Mencari nama petugas berdasarkan id.
   *
   * @param idPetugas - Id petugas yang dicari.
   * @returns Nama petugas atau "-" bila tidak ditemukan.
   */
  const namaPetugas = (id: number): string =>
    petugas.find((p) => p.idPetugas === id)?.nama ?? "-";

  /**
   * Menghitung rincian biaya otomatis saat form pemakaian diubah admin.
   *
   * @param nilai - Nilai mentah form (string) dari CrudTable.
   * @returns Nilai bidang turunan (jumlah pakai & dua komponen biaya).
   */
  const hitungFormPemakaian = (nilai: Record<string, string>) => {
    const plg = pelanggan.find((p) => p.noKontrol === Number(nilai.noKontrol));
    const trf = plg ? getTarifUntukJenis(tarif, plg.jenis) : undefined;
    const rincian = hitungRincianTagihan(
      trf,
      Number(nilai.meterAwal) || 0,
      Number(nilai.meterAkhir) || 0,
    );
    return {
      jumlahPakai: String(rincian.jumlahPakai),
      biayaBebanPemakaian: String(rincian.biayaBeban),
      biayaPemakaian: String(rincian.biayaPemakaian),
    };
  };

  /**
   * Mengisi total tagihan otomatis saat form pembayaran diubah admin.
   *
   * @param nilai - Nilai mentah form (string) dari CrudTable.
   * @returns Nilai bidang biaya_total mengikuti pemakaian terkait.
   */
  const hitungFormPembayaran = (nilai: Record<string, string>) => {
    const target = pemakaian.find(
      (p) =>
        p.noKontrol === Number(nilai.noKontrol) &&
        p.bulan === Number(nilai.bulan) &&
        p.tahun === Number(nilai.tahun),
    );
    const total = target ? totalDariPemakaian(target) : 0;
    return { biayaTotal: String(total), jumlahBayar: String(total) };
  };

  /** Opsi dropdown nomor kontrol pelanggan untuk form. */
  const opsiPelanggan = pelanggan.map((p) => ({
    value: String(p.noKontrol),
    label: `${p.noKontrol} — ${p.nama}`,
  }));

  /** Opsi dropdown tarif untuk form pembayaran. */
  const opsiTarif = tarif.map((t) => ({
    value: String(t.idTarif),
    label: `${t.jenisPlg} (${formatRupiah(t.tarifKwh)}/kWh)`,
  }));

  /** Opsi dropdown petugas untuk form pembayaran. */
  const opsiPetugas = petugas.map((p) => ({
    value: String(p.idPetugas),
    label: p.nama,
  }));

  /** Opsi dropdown bulan (1-12) untuk form periode. */
  const opsiBulan = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: namaBulan(i + 1),
  }));

  // ---------------------------------------------------------------- KONFIG --
  // Kolom & bidang form tiap entitas (dipakai CrudTable).

  const kolomPelanggan: KolomTabel<Pelanggan>[] = [
    { key: "noKontrol", label: "No Kontrol" },
    { key: "nama", label: "Nama Pelanggan" },
    { key: "alamat", label: "Alamat" },
    { key: "noTlp", label: "No Telp" },
    {
      key: "jenis",
      label: "Jenis",
      render: (b) => (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
          {b.jenis}
        </span>
      ),
    },
  ];

  const bidangPelanggan: BidangForm<Pelanggan>[] = [
    { name: "noKontrol", label: "No Kontrol", type: "number", required: true, tipeData: "angka" },
    { name: "nama", label: "Nama Pelanggan", type: "text", required: true, placeholder: "cth. Slamet Riyadi" },
    { name: "noTlp", label: "No Telp", type: "text", placeholder: "081234567890" },
    {
      name: "jenis",
      label: "Jenis Pelanggan",
      type: "select",
      required: true,
      options: DAFTAR_JENIS.map((j) => ({ value: j, label: j })),
    },
    { name: "alamat", label: "Alamat", type: "textarea", required: true, placeholder: "Jl. ..." },
  ];

  const kolomTarif: KolomTabel<Tarif>[] = [
    { key: "idTarif", label: "ID", align: "tengah" },
    { key: "jenisPlg", label: "Jenis Pelanggan" },
    {
      key: "biayaBeban",
      label: "Biaya Beban / Bulan",
      align: "kanan",
      render: (b) => formatRupiah(b.biayaBeban),
    },
    {
      key: "tarifKwh",
      label: "Tarif / kWh",
      align: "kanan",
      render: (b) => formatRupiah(b.tarifKwh),
    },
  ];

  const bidangTarif: BidangForm<Tarif>[] = [
    { name: "idTarif", label: "ID Tarif", type: "number", required: true, tipeData: "angka" },
    {
      name: "jenisPlg",
      label: "Jenis Pelanggan",
      type: "select",
      required: true,
      options: DAFTAR_JENIS.map((j) => ({ value: j, label: j })),
    },
    { name: "biayaBeban", label: "Biaya Beban (Rp)", type: "number", required: true, tipeData: "angka" },
    { name: "tarifKwh", label: "Tarif per kWh (Rp)", type: "number", required: true, tipeData: "angka" },
  ];

  const kolomPetugas: KolomTabel<Petugas>[] = [
    { key: "idPetugas", label: "ID", align: "tengah" },
    { key: "nama", label: "Nama Petugas" },
    { key: "jenisKelamin", label: "L/P" },
    { key: "noHp", label: "No HP" },
    { key: "username", label: "Username" },
  ];

  const bidangPetugas: BidangForm<Petugas>[] = [
    { name: "idPetugas", label: "ID Petugas", type: "number", required: true, tipeData: "angka" },
    { name: "nama", label: "Nama Petugas", type: "text", required: true },
    {
      name: "jenisKelamin",
      label: "Jenis Kelamin",
      type: "select",
      required: true,
      options: [
        { value: "Laki-laki", label: "Laki-laki" },
        { value: "Perempuan", label: "Perempuan" },
      ],
    },
    { name: "noHp", label: "No HP", type: "text", required: true },
    { name: "username", label: "Username Login", type: "text", required: true },
    { name: "password", label: "Password Login", type: "text", required: true },
  ];

  const kolomPemakaian: KolomTabel<Pemakaian>[] = [
    { key: "noKontrol", label: "No Kontrol", render: (b) => `${b.noKontrol} — ${namaPelanggan(b.noKontrol)}` },
    { key: "periode", label: "Periode", render: (b) => formatPeriode(b.bulan, b.tahun) },
    { key: "meterAwal", label: "Meter Awal", align: "kanan" },
    { key: "meterAkhir", label: "Meter Akhir", align: "kanan" },
    { key: "jumlahPakai", label: "kWh", align: "kanan" },
    {
      key: "total",
      label: "Total Tagihan",
      align: "kanan",
      render: (b) => formatRupiah(totalDariPemakaian(b)),
    },
  ];

  const bidangPemakaian: BidangForm<Pemakaian>[] = [
    {
      name: "noKontrol",
      label: "No Kontrol",
      type: "select",
      required: true,
      tipeData: "angka",
      options: opsiPelanggan,
    },
    { name: "tahun", label: "Tahun", type: "number", required: true, tipeData: "angka" },
    {
      name: "bulan",
      label: "Bulan",
      type: "select",
      required: true,
      tipeData: "angka",
      options: opsiBulan,
    },
    { name: "meterAwal", label: "Meter Awal", type: "number", required: true, tipeData: "angka" },
    { name: "meterAkhir", label: "Meter Akhir", type: "number", required: true, tipeData: "angka" },
    { name: "jumlahPakai", label: "Jumlah Pakai (kWh) — otomatis", type: "number", readOnly: true, tipeData: "angka" },
    { name: "biayaBebanPemakaian", label: "Biaya Beban — otomatis", type: "number", readOnly: true, tipeData: "angka" },
    { name: "biayaPemakaian", label: "Biaya Pemakaian — otomatis", type: "number", readOnly: true, tipeData: "angka" },
  ];

  const kolomPembayaran: KolomTabel<Pembayaran>[] = [
    { key: "idPembayaran", label: "No Bukti", align: "tengah" },
    { key: "noKontrol", label: "Pelanggan", render: (b) => `${b.noKontrol} — ${namaPelanggan(b.noKontrol)}` },
    { key: "periode", label: "Periode", render: (b) => formatPeriode(b.bulan, b.tahun) },
    { key: "tanggalBayar", label: "Tgl Bayar", render: (b) => formatTanggal(b.tanggalBayar) },
    { key: "idPetugas", label: "Petugas", render: (b) => namaPetugas(b.idPetugas) },
    { key: "biayaTotal", label: "Total Tagihan", align: "kanan", render: (b) => formatRupiah(b.biayaTotal) },
    { key: "jumlahBayar", label: "Dibayar", align: "kanan", render: (b) => formatRupiah(b.jumlahBayar) },
  ];

  const bidangPembayaran: BidangForm<Pembayaran>[] = [
    { name: "idPembayaran", label: "No Bukti", type: "number", required: true, tipeData: "angka" },
    {
      name: "noKontrol",
      label: "Pelanggan",
      type: "select",
      required: true,
      tipeData: "angka",
      options: opsiPelanggan,
    },
    { name: "tahun", label: "Tahun", type: "number", required: true, tipeData: "angka" },
    { name: "bulan", label: "Bulan", type: "select", required: true, tipeData: "angka", options: opsiBulan },
    { name: "tanggalBayar", label: "Tanggal Bayar (YYYY-MM-DD)", type: "text", required: true, placeholder: "2026-10-16" },
    {
      name: "idTarif",
      label: "Tarif Dipakai",
      type: "select",
      required: true,
      tipeData: "angka",
      options: opsiTarif,
    },
    {
      name: "idPetugas",
      label: "Petugas Penerima",
      type: "select",
      required: true,
      tipeData: "angka",
      options: opsiPetugas,
    },
    { name: "biayaTotal", label: "Total Tagihan — otomatis", type: "number", readOnly: true, tipeData: "angka" },
    { name: "jumlahBayar", label: "Jumlah Dibayar (Rp)", type: "number", required: true, tipeData: "angka" },
  ];

  // Pembayaran terbaru untuk ringkasan (urut tanggal terbaru dahulu).
  const pembayaranTerbaru = [...pembayaran]
    .sort((a, b) => b.tanggalBayar.localeCompare(a.tanggalBayar))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Judul halaman */}
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Admin</h1>
        <p className="text-sm text-slate-500">
          Kelola data pelanggan, tarif, petugas, pemakaian, dan pembayaran.
        </p>
      </header>

      {/* Navigasi tab */}
      <div className="flex flex-wrap gap-2">
        {TAB.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* -------------------------------------------------------- RINGKASAN */}
      {tab === "ringkasan" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Pelanggan"
              nilai={String(pelanggan.length)}
              keterangan="Terdaftar pada kartu pelanggan"
              warna="bg-amber-400"
              ikon="🏠"
            />
            <StatCard
              label="Total Pendapatan"
              nilai={formatRupiah(totalPendapatan(pembayaran))}
              keterangan={`${pembayaran.length} transaksi pembayaran`}
              warna="bg-emerald-500"
              ikon="💰"
            />
            <StatCard
              label="Tagihan Belum Dibayar"
              nilai={String(jumlahBelumDibayar(pemakaian, pembayaran))}
              keterangan="Periode pemakaian tanpa pembayaran"
              warna="bg-red-400"
              ikon="⏳"
            />
            <StatCard
              label="Petugas Loket"
              nilai={String(petugas.length)}
              keterangan="Siap melayani di loket"
              warna="bg-sky-500"
              ikon="🧾"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Pembayaran terbaru */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <header className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-800">Pembayaran Terbaru</h2>
                <p className="text-sm text-slate-500">5 transaksi terakhir yang tercatat.</p>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">No Bukti</th>
                      <th className="px-5 py-3">Pelanggan</th>
                      <th className="px-5 py-3">Periode</th>
                      <th className="px-5 py-3">Tanggal</th>
                      <th className="px-5 py-3 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pembayaranTerbaru.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                          Belum ada transaksi pembayaran.
                        </td>
                      </tr>
                    ) : (
                      pembayaranTerbaru.map((bayar) => (
                        <tr key={bayar.idPembayaran} className="border-b border-slate-50">
                          <td className="px-5 py-3 font-mono">#{bayar.idPembayaran}</td>
                          <td className="px-5 py-3">{namaPelanggan(bayar.noKontrol)}</td>
                          <td className="px-5 py-3">{formatPeriode(bayar.bulan, bayar.tahun)}</td>
                          <td className="px-5 py-3">{formatTanggal(bayar.tanggalBayar)}</td>
                          <td className="px-5 py-3 text-right font-semibold">
                            {formatRupiah(bayar.jumlahBayar)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Daftar tarif berlaku */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-800">Tarif Berlaku</h2>
                <p className="text-sm text-slate-500">Digunakan hitung tagihan otomatis.</p>
              </header>
              <ul className="divide-y divide-slate-50">
                {tarif.map((t) => (
                  <li key={t.idTarif} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-700">{t.jenisPlg}</p>
                      <p className="text-xs text-slate-400">Beban {formatRupiah(t.biayaBeban)}/bln</p>
                    </div>
                    <p className="font-semibold text-amber-600">{formatRupiah(t.tarifKwh)}/kWh</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}

      {/* --------------------------------------------------------- PELANGGAN */}
      {tab === "pelanggan" ? (
        <CrudTable<Pelanggan>
          judul="Data Kartu Pelanggan"
          deskripsi="CRUD data pelanggan: nomor kontrol, identitas, alamat, dan jenis."
          data={pelanggan}
          kolom={kolomPelanggan}
          bidang={bidangPelanggan}
          kunci="noKontrol"
          labelTambah="Tambah Pelanggan"
          kosong={{
            noKontrol: idBerikutnya(pelanggan, "noKontrol"),
            nama: "",
            alamat: "",
            noTlp: "",
            jenis: "Rumah Tangga",
          }}
          simpan={simpanPelanggan}
          hapus={hapusPelanggan}
          konfirmasiHapus={(b) =>
            `Hapus pelanggan "${b.nama}" (no ${b.noKontrol}) beserta riwayat pemakaian & pembayarannya?`
          }
          pesanKosong="Belum ada data pelanggan."
        />
      ) : null}

      {/* -------------------------------------------------------------- TARIF */}
      {tab === "tarif" ? (
        <CrudTable<Tarif>
          judul="Data Tarif"
          deskripsi="CRUD tarif per jenis pelanggan: biaya beban dan tarif per kWh."
          data={tarif}
          kolom={kolomTarif}
          bidang={bidangTarif}
          kunci="idTarif"
          labelTambah="Tambah Tarif"
          kosong={{
            idTarif: idBerikutnya(tarif, "idTarif"),
            jenisPlg: "Rumah Tangga",
            biayaBeban: 0,
            tarifKwh: 0,
          }}
          simpan={simpanTarif}
          hapus={hapusTarif}
          konfirmasiHapus={(b) => `Hapus tarif ${b.jenisPlg}?`}
          pesanKosong="Belum ada data tarif."
        />
      ) : null}

      {/* ------------------------------------------------------------ PETUGAS */}
      {tab === "petugas" ? (
        <CrudTable<Petugas>
          judul="Data Petugas Loket"
          deskripsi="CRUD petugas loket beserta akun login untuk akses dashboard."
          data={petugas}
          kolom={kolomPetugas}
          bidang={bidangPetugas}
          kunci="idPetugas"
          labelTambah="Tambah Petugas"
          kosong={{
            idPetugas: idBerikutnya(petugas, "idPetugas"),
            nama: "",
            jenisKelamin: "Laki-laki",
            noHp: "",
            username: "",
            password: "",
          }}
          simpan={simpanPetugas}
          hapus={hapusPetugas}
          konfirmasiHapus={(b) => `Hapus petugas "${b.nama}"?`}
          pesanKosong="Belum ada data petugas."
        />
      ) : null}

      {/* ---------------------------------------------------------- PEMAKAIAN */}
      {tab === "pemakaian" ? (
        <CrudTable<Pemakaian>
          judul="Data Pemakaian Listrik"
          deskripsi="CRUD pembacaan meter bulanan; jumlah kWh & biaya dihitung otomatis."
          data={pemakaian}
          kolom={kolomPemakaian}
          bidang={bidangPemakaian}
          kunci="idPemakaian"
          labelTambah="Tambah Pemakaian"
          kosong={{
            idPemakaian: idBerikutnya(pemakaian, "idPemakaian"),
            noKontrol: pelanggan[0]?.noKontrol ?? 0,
            tahun: 2026,
            bulan: 10,
            meterAwal: 0,
            meterAkhir: 0,
            jumlahPakai: 0,
            biayaBebanPemakaian: 0,
            biayaPemakaian: 0,
          }}
          simpan={simpanPemakaian}
          hapus={hapusPemakaian}
          hitungOtomatis={hitungFormPemakaian}
          konfirmasiHapus={(b) => `Hapus catatan pemakaian periode ${formatPeriode(b.bulan, b.tahun)}?`}
          pesanKosong="Belum ada data pemakaian."
        />
      ) : null}

      {/* --------------------------------------------------------- PEMBAYARAN */}
      {tab === "pembayaran" ? (
        <CrudTable<Pembayaran>
          judul="Entri Transaksi Pembayaran"
          deskripsi="CRUD pembayaran; total tagihan terisi otomatis dari data pemakaian."
          data={pembayaran}
          kolom={kolomPembayaran}
          bidang={bidangPembayaran}
          kunci="idPembayaran"
          labelTambah="Tambah Pembayaran"
          kosong={{
            idPembayaran: idBerikutnya(pembayaran, "idPembayaran"),
            noKontrol: pelanggan[0]?.noKontrol ?? 0,
            idTarif: tarif[0]?.idTarif ?? 1,
            idPetugas: petugas[0]?.idPetugas ?? 1,
            bulan: 10,
            tahun: 2026,
            tanggalBayar: "2026-10-16",
            biayaTotal: 0,
            jumlahBayar: 0,
          }}
          simpan={simpanPembayaran}
          hapus={hapusPembayaran}
          hitungOtomatis={hitungFormPembayaran}
          konfirmasiHapus={(b) => `Hapus pembayaran no bukti #${b.idPembayaran}?`}
          pesanKosong="Belum ada transaksi pembayaran."
        />
      ) : null}
    </div>
  );
}
