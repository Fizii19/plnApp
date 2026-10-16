/**
 * =============================================================================
 * components/crud-table.tsx
 * -----------------------------------------------------------------------------
 * Tabel data generik yang didesain ulang dengan Shadcn UI dan Lucide React.
 * Mendukung CRUD lengkap: tampil tabel, form tambah/ubah, dan konfirmasi hapus.
 * =============================================================================
 */
"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Search, AlertCircle } from "lucide-react";
import Modal from "./modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ModeSimpan, NilaiForm } from "@/lib/types";

/** Konfigurasi satu kolom tabel. */
export interface KolomTabel<T> {
  key: string;
  label: string;
  render?: (baris: T) => ReactNode;
  align?: "kiri" | "kanan" | "tengah";
}

/** Konfigurasi satu bidang pada form tambah/ubah. */
export interface BidangForm<T> {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  tipeData?: "angka" | "teks";
}

/** Properti tabel CRUD. */
export interface CrudTableProps<T> {
  judul: string;
  deskripsi?: string;
  data: T[];
  kolom: KolomTabel<T>[];
  bidang: BidangForm<T>[];
  kunci: keyof T & string;
  kosong: T;
  labelTambah?: string;
  simpan: (baris: T, mode: ModeSimpan) => void;
  hapus: (baris: T) => void;
  pesanKosong?: string;
  hitungOtomatis?: (nilai: NilaiForm) => NilaiForm;
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
 * Merender tabel CRUD lengkap dengan form modal tambah/ubah dan aksi hapus.
 *
 * @param props - Lihat `CrudTableProps`.
 * @returns Elemen tabel CRUD.
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
  const [cari, setCari] = useState("");

  /**
   * Membuka modal form untuk mode tambah atau ubah.
   */
  const bukaForm = (mode: ModeSimpan, baris?: T) => {
    const nilai = keNilaiForm(baris ?? kosong);
    setForm({ mode, nilai: hitungOtomatis ? { ...nilai, ...hitungOtomatis(nilai) } : nilai });
    setGalat("");
  };

  /**
   * Memperbarui satu bidang form, lalu menghitung ulang bidang turunan.
   */
  const ubahBidang = (nama: string, nilai: string) => {
    setForm((sebelumnya) => {
      if (!sebelumnya) return sebelumnya;
      const baru: NilaiForm = { ...sebelumnya.nilai, [nama]: nilai };
      return { ...sebelumnya, nilai: hitungOtomatis ? { ...baru, ...hitungOtomatis(baru) } : baru };
    });
  };

  /**
   * Menyimpan isi form ke store (validasi terlebih dahulu).
   */
  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    const belumTerisi = bidang
      .filter((b) => b.required && !form.nilai[b.name]?.trim())
      .map((b) => b.label);
    if (belumTerisi.length > 0) {
      setGalat(`Bidang wajib belum diisi: ${belumTerisi.join(", ")}.`);
      return;
    }

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
   */
  const mintaHapus = (baris: T) => {
    const pesan = konfirmasiHapus?.(baris) ?? "Yakin ingin menghapus data ini?";
    if (window.confirm(pesan)) hapus(baris);
  };

  /** Kelas perataan kolom. */
  const perataan = (align?: KolomTabel<T>["align"]) =>
    align === "kanan" ? "text-right" : align === "tengah" ? "text-center" : "text-left";

  /** Filter data berdasarkan pencarian */
  const dataFiltered = cari.trim()
    ? data.filter((baris) => {
        const str = JSON.stringify(baris).toLowerCase();
        return str.includes(cari.toLowerCase());
      })
    : data;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header tabel */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-800">{judul}</h2>
          {deskripsi ? <p className="mt-0.5 text-sm text-slate-500">{deskripsi}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {/* Pencarian */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari..."
              className="pl-8 h-8 text-xs w-40"
            />
          </div>
          <Button
            size="sm"
            onClick={() => bukaForm("tambah")}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {labelTambah}
          </Button>
        </div>
      </header>

      {/* Tabel data */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {kolom.map((k) => (
                <th
                  key={k.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
                    perataan(k.align),
                  )}
                >
                  {k.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {dataFiltered.length === 0 ? (
              <tr>
                <td colSpan={kolom.length + 1} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Search className="h-8 w-8 opacity-30" />
                    <p className="text-sm">{cari ? `Tidak ada hasil untuk "${cari}"` : pesanKosong}</p>
                  </div>
                </td>
              </tr>
            ) : (
              dataFiltered.map((baris) => (
                <tr
                  key={String(baris[kunci])}
                  className="group border-b border-slate-50 transition-colors hover:bg-slate-50"
                >
                  {kolom.map((k) => (
                    <td
                      key={k.key}
                      className={cn(
                        "px-4 py-3 text-slate-700",
                        perataan(k.align),
                      )}
                    >
                      {k.render
                        ? k.render(baris)
                        : String((baris as Record<string, unknown>)[k.key] ?? "-")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => bukaForm("ubah", baris)}
                        title="Ubah"
                        className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => mintaHapus(baris)}
                        title="Hapus"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info jumlah baris */}
      <div className="border-t border-slate-100 px-5 py-2.5">
        <p className="text-xs text-slate-400">
          Menampilkan {dataFiltered.length} dari {data.length} data
          {cari ? ` (filter: "${cari}")` : ""}
        </p>
      </div>

      {/* Modal form tambah/ubah */}
      {form ? (
        <Modal
          judul={form.mode === "tambah" ? `Tambah ${judul}` : `Ubah ${judul}`}
          onClose={() => setForm(null)}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(null)}
              >
                Batal
              </Button>
              <Button type="submit" form="form-crud">
                Simpan Perubahan
              </Button>
            </>
          }
        >
          <form id="form-crud" onSubmit={submitForm} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {galat ? (
              <div className="col-span-full flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {galat}
              </div>
            ) : null}

            {bidang.map((b) => (
              <div key={b.name} className="flex flex-col gap-1.5">
                <Label htmlFor={`field-${b.name}`}>
                  {b.label}
                  {b.required ? <span className="ml-1 text-red-500">*</span> : null}
                  {b.readOnly ? (
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400">otomatis</span>
                  ) : null}
                </Label>

                {b.type === "select" ? (
                  <Select
                    id={`field-${b.name}`}
                    value={form.nilai[b.name] ?? ""}
                    disabled={b.readOnly}
                    onChange={(e) => ubahBidang(b.name, e.target.value)}
                    options={[
                      { value: "", label: b.placeholder ?? "— pilih —" },
                      ...(b.options ?? []),
                    ]}
                  />
                ) : b.type === "textarea" ? (
                  <Textarea
                    id={`field-${b.name}`}
                    value={form.nilai[b.name] ?? ""}
                    placeholder={b.placeholder}
                    rows={3}
                    onChange={(e) => ubahBidang(b.name, e.target.value)}
                  />
                ) : (
                  <Input
                    id={`field-${b.name}`}
                    type={b.type}
                    value={form.nilai[b.name] ?? ""}
                    placeholder={b.placeholder}
                    readOnly={b.readOnly}
                    onChange={(e) => ubahBidang(b.name, e.target.value)}
                    className={b.readOnly ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}
                  />
                )}
              </div>
            ))}
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
