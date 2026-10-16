/**
 * =============================================================================
 * components/crud-table.tsx
 * -----------------------------------------------------------------------------
 * Tabel data generik lengkap dengan form tambah/ubah (modal) dan aksi hapus.
 * Satu komponen ini dipakai seluruh menu CRUD admin (pelanggan, tarif,
 * petugas, pemakaian, pembayaran) sehingga perilaku & tampilannya konsisten.
 * =============================================================================
 */
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Modal from "./modal";
import type { ModeSimpan, NilaiForm } from "@/lib/types";

/** Konfigurasi satu kolom tabel. */
export interface KolomTabel<T> {
  /** Nama field yang ditampilkan (fallback bila `render` tidak diberikan). */
  key: string;
  /** Judul kepala kolom. */
  label: string;
  /** Fungsi render kustom, contoh: format Rupiah atau badge status. */
  render?: (baris: T) => ReactNode;
  /** Perataan teks kolom, default "kiri". */
  align?: "kiri" | "kanan" | "tengah";
}

/** Konfigurasi satu bidang pada form tambah/ubah. */
export interface BidangForm<T> {
  /** Nama field data yang terikat bidang ini. */
  name: string;
  /** Label input pada form. */
  label: string;
  /** Jenis input; "number" otomatis dikonversi ke angka saat disimpan. */
  type: "text" | "number" | "select" | "textarea";
  /** Opsi dropdown, wajib diisi bila type = "select". */
  options?: { value: string; label: string }[];
  /** Menandai bidang wajib diisi. */
  required?: boolean;
  /** Teks petunjuk saat input kosong. */
  placeholder?: string;
  /** Membuat bidang tidak dapat diubah (mis. hasil hitungan otomatis). */
  readOnly?: boolean;
  /** Tipe data asli field pada model (untuk konversi number). */
  tipeData?: "angka" | "teks";
}

/** Properti tabel CRUD. */
export interface CrudTableProps<T> {
  /** Judul tabel. */
  judul: string;
  /** Penjelasan singkat di bawah judul. */
  deskripsi?: string;
  /** Data yang akan ditampilkan. */
  data: T[];
  /** Konfigurasi kolom tabel. */
  kolom: KolomTabel<T>[];
  /** Konfigurasi bidang form tambah/ubah. */
  bidang: BidangForm<T>[];
  /** Nama field primary key data. */
  kunci: keyof T & string;
  /** Template baris kosong untuk mode tambah (berisi id usulan). */
  kosong: T;
  /** Label tombol tambah, default "Tambah". */
  labelTambah?: string;
  /** Callback simpan (tambah/ubah) dari halaman induk. */
  simpan: (baris: T, mode: ModeSimpan) => void;
  /** Callback hapus dari halaman induk. */
  hapus: (baris: T) => void;
  /** Pesan saat tidak ada data. */
  pesanKosong?: string;
  /** Menghitung ulang bidang turunan setiap nilai form berubah. */
  hitungOtomatis?: (nilai: NilaiForm) => NilaiForm;
  /** Menghasilkan pesan konfirmasi hapus yang lebih informatif. */
  konfirmasiHapus?: (baris: T) => string;
}

/** Mengubah sebuah baris data menjadi pasangan string untuk state form. */
function keNilaiForm<T>(baris: T): NilaiForm {
  const hasil: NilaiForm = {};
  for (const [kunci, nilai] of Object.entries(baris as Record<string, unknown>)) {
    hasil[kunci] = String(nilai ?? "");
  }
  return hasil;
}

/**
 * Merender tabel data + tombol aksi dan modal form tambah/ubah.
 *
 * @param props - Lihat `CrudTableProps`.
 * @returns Elemen tabel CRUD lengkap.
 */
export default function CrudTable<T>({
  judul,
  deskripsi,
  data,
  kolom,
  bidang,
  kunci,
  kosong,
  labelTambah = "Tambah",
  simpan,
  hapus,
  pesanKosong = "Belum ada data.",
  hitungOtomatis,
  konfirmasiHapus,
}: CrudTableProps<T>) {
  const [form, setForm] = useState<{ mode: ModeSimpan; nilai: NilaiForm } | null>(null);
  const [galat, setGalat] = useState<string>("");

  /**
   * Membuka modal form untuk mode tambah atau ubah.
   *
   * @param mode - "tambah" memakai template kosong, "ubah" memakai baris terpilih.
   * @param baris - Baris yang diubah (diabaikan pada mode tambah).
   */
  const bukaForm = (mode: ModeSimpan, baris?: T) => {
    const nilai = keNilaiForm(baris ?? kosong);
    setForm({ mode, nilai: hitungOtomatis ? { ...nilai, ...hitungOtomatis(nilai) } : nilai });
    setGalat("");
  };

  /**
   * Memperbarui satu bidang form, lalu menghitung ulang bidang turunan.
   *
   * @param nama - Nama field yang diubah.
   * @param nilai - Nilai input terbaru.
   */
  const ubahBidang = (nama: string, nilai: string) => {
    setForm((sebelumnya) => {
      if (!sebelumnya) return sebelumnya;
      const baru: NilaiForm = { ...sebelumnya.nilai, [nama]: nilai };
      return { ...sebelumnya, nilai: hitungOtomatis ? { ...baru, ...hitungOtomatis(baru) } : baru };
    });
  };

  /**
   * Menyimpan isi form ke store (validasi dilakukan terlebih dahulu).
   *
   * @param event - Event submit form.
   */
  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    // Validasi bidang wajib isi.
    const belumTerisi = bidang
      .filter((b) => b.required && !form.nilai[b.name]?.trim())
      .map((b) => b.label);
    if (belumTerisi.length > 0) {
      setGalat(`Bidang wajib belum diisi: ${belumTerisi.join(", ")}.`);
      return;
    }

    // Konversi string form menjadi tipe data asli sebelum disimpan.
    const rekaman: Record<string, unknown> = {};
    for (const b of bidang) {
      const mentah = form.nilai[b.name] ?? "";
      rekaman[b.name] = b.tipeData === "angka" ? Number(mentah) || 0 : mentah;
    }

    simpan(rekaman as unknown as T, form.mode);
    setForm(null);
    setGalat("");
  };

  /**
   * Menghapus baris setelah dikonfirmasi pengguna.
   *
   * @param baris - Baris yang akan dihapus.
   */
  const mintaHapus = (baris: T) => {
    const pesan = konfirmasiHapus?.(baris) ?? "Yakin ingin menghapus data ini?";
    if (window.confirm(pesan)) hapus(baris);
  };

  /** Kelas perataan kolom sesuai konfigurasi. */
  const perataan = (align?: KolomTabel<T>["align"]) =>
    align === "kanan" ? "text-right" : align === "tengah" ? "text-center" : "text-left";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-800">{judul}</h2>
          {deskripsi ? <p className="mt-0.5 text-sm text-slate-500">{deskripsi}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => bukaForm("tambah")}
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
        >
          + {labelTambah}
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
              {kolom.map((kolom_) => (
                <th key={kolom_.key} className={`px-5 py-3 font-medium ${perataan(kolom_.align)}`}>
                  {kolom_.label}
                </th>
              ))}
              <th className="px-5 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={kolom.length + 1} className="px-5 py-10 text-center text-slate-400">
                  {pesanKosong}
                </td>
              </tr>
            ) : (
              data.map((baris) => (
                <tr key={String(baris[kunci])} className="border-b border-slate-50 hover:bg-slate-50/60">
                  {kolom.map((kolom_) => (
                    <td key={kolom_.key} className={`px-5 py-3 ${perataan(kolom_.align)}`}>
                      {kolom_.render
                        ? kolom_.render(baris)
                        : String((baris as Record<string, unknown>)[kolom_.key] ?? "-")}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => bukaForm("ubah", baris)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => mintaHapus(baris)}
                      className="ml-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form ? (
        <Modal
          judul={form.mode === "tambah" ? `Tambah ${judul}` : `Ubah ${judul}`}
          onClose={() => setForm(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                form="form-crud"
                className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
              >
                Simpan
              </button>
            </>
          }
        >
          <form id="form-crud" onSubmit={submitForm} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {galat ? (
              <p className="col-span-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {galat}
              </p>
            ) : null}

            {bidang.map((b) => (
              <label key={b.name} className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-slate-600">
                  {b.label}
                  {b.required ? <span className="ml-1 text-red-500">*</span> : null}
                </span>

                {b.type === "select" ? (
                  <select
                    name={b.name}
                    value={form.nilai[b.name] ?? ""}
                    disabled={b.readOnly}
                    onChange={(e) => ubahBidang(b.name, e.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100"
                  >
                    <option value="" disabled>
                      {b.placeholder ?? "— pilih —"}
                    </option>
                    {b.options?.map((opsi) => (
                      <option key={opsi.value} value={opsi.value}>
                        {opsi.label}
                      </option>
                    ))}
                  </select>
                ) : b.type === "textarea" ? (
                  <textarea
                    name={b.name}
                    value={form.nilai[b.name] ?? ""}
                    placeholder={b.placeholder}
                    rows={3}
                    onChange={(e) => ubahBidang(b.name, e.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                ) : (
                  <input
                    name={b.name}
                    type={b.type}
                    value={form.nilai[b.name] ?? ""}
                    placeholder={b.placeholder}
                    readOnly={b.readOnly}
                    onChange={(e) => ubahBidang(b.name, e.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 read-only:bg-slate-100 read-only:text-slate-500"
                  />
                )}
              </label>
            ))}
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
