/**
 * =============================================================================
 * components/admin-tables.tsx
 * -----------------------------------------------------------------------------
 * Komponen tabel CRUD admin yang terhubung ke MySQL via API routes.
 * Setiap komponen mengelola state loading, error, dan data sendiri.
 * Semua operasi database menggunakan prepared statements (SQL Injection aman).
 * =============================================================================
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  Loader2,
  RefreshCw,
  ServerCrash,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Modal from "@/components/modal";
import { useSistem } from "@/lib/store";
import { formatRupiah, formatPeriode, formatTanggal, namaBulan } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAFTAR_JENIS = ["Rumah Tangga", "Niaga", "Industri", "Sosial"] as const;
const DAFTAR_BULAN = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: namaBulan(i + 1) }));

// ─────────────────────────────────────────────────────────────
// KOMPONEN HELPERS
// ─────────────────────────────────────────────────────────────

/** Baris pesan saat loading */
function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat data dari database…</span>
        </div>
      </td>
    </tr>
  );
}

/** Baris pesan error */
function ErrorRow({ colSpan, pesan, onRetry }: { colSpan: number; pesan: string; onRetry: () => void }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <ServerCrash className="h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">{pesan}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" />
            Coba Lagi
          </Button>
        </div>
      </td>
    </tr>
  );
}

/** Header tabel standar */
function HeaderTabel({
  judul,
  deskripsi,
  labelTambah,
  cari,
  setCari,
  onTambah,
}: {
  judul: string;
  deskripsi?: string;
  labelTambah: string;
  cari: string;
  setCari: (v: string) => void;
  onTambah: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="font-semibold text-slate-800">{judul}</h2>
        {deskripsi ? <p className="mt-0.5 text-sm text-slate-500">{deskripsi}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari…"
            className="pl-8 h-8 text-xs w-40"
          />
        </div>
        <Button size="sm" onClick={onTambah}>
          <Plus className="h-3.5 w-3.5" />
          {labelTambah}
        </Button>
      </div>
    </header>
  );
}

/** Footer info jumlah baris */
function FooterTabel({ total, filtered, cari }: { total: number; filtered: number; cari: string }) {
  return (
    <div className="border-t border-slate-100 px-5 py-2.5">
      <p className="text-xs text-slate-400">
        Menampilkan {filtered} dari {total} data
        {cari ? ` (filter: "${cari}")` : ""}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TABEL PELANGGAN
// ─────────────────────────────────────────────────────────────

interface RowPelanggan {
  no_kontrol: number;
  nama_pelanggan: string;
  alamat_pelanggan: string;
  no_tlp_pelanggan: string;
  jenis_pelanggan: string;
}

/**
 * Tabel CRUD Pelanggan yang terhubung ke `/api/admin/pelanggan`.
 */
export function AdminTabelPelanggan() {
  const { apiFetch } = useSistem();
  const [data, setData] = useState<RowPelanggan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cari, setCari] = useState("");
  const [form, setForm] = useState<Partial<RowPelanggan> | null>(null);
  const [modeForm, setModeForm] = useState<"tambah" | "ubah">("tambah");
  const [simpanLoading, setSimpanLoading] = useState(false);
  const [formGalat, setFormGalat] = useState("");
  const [pesan, setPesan] = useState("");

  const muat = useCallback(async () => {
    setLoading(true); setError("");
    const res = await apiFetch<RowPelanggan[]>("/api/admin/pelanggan");
    if (res.success && res.data) setData(res.data);
    else setError(res.message || "Gagal memuat data");
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { muat(); }, [muat]);

  const filtered = cari ? data.filter((r) => JSON.stringify(r).toLowerCase().includes(cari.toLowerCase())) : data;

  const bukaForm = (mode: "tambah" | "ubah", baris?: RowPelanggan) => {
    setModeForm(mode);
    setForm(baris ?? { jenis_pelanggan: "Rumah Tangga" });
    setFormGalat(""); setPesan("");
  };

  const simpan = async () => {
    if (!form) return;
    if (!form.no_kontrol || !form.nama_pelanggan || !form.alamat_pelanggan || !form.jenis_pelanggan) {
      setFormGalat("no_kontrol, nama, alamat, dan jenis wajib diisi"); return;
    }
    setSimpanLoading(true); setFormGalat("");
    const method = modeForm === "tambah" ? "POST" : "PUT";
    const body = {
      no_kontrol: form.no_kontrol,
      nama_pelanggan: form.nama_pelanggan,
      alamat_pelanggan: form.alamat_pelanggan,
      no_tlp_pelanggan: form.no_tlp_pelanggan || "",
      jenis_pelanggan: form.jenis_pelanggan,
    };
    const res = await apiFetch("/api/admin/pelanggan", { method, body: JSON.stringify(body) });
    if (res.success) { setForm(null); setPesan(res.message || "Berhasil"); muat(); }
    else setFormGalat(res.message || "Gagal menyimpan");
    setSimpanLoading(false);
  };

  const hapus = async (noKontrol: number, nama: string) => {
    if (!confirm(`Hapus pelanggan "${nama}" (${noKontrol})? Data pemakaian & pembayaran juga akan dihapus.`)) return;
    const res = await apiFetch(`/api/admin/pelanggan?no_kontrol=${noKontrol}`, { method: "DELETE" });
    if (res.success) { setPesan("Pelanggan berhasil dihapus"); muat(); }
    else alert(res.message || "Gagal menghapus");
  };

  const warnaJenis: Record<string, "success" | "info" | "warning" | "secondary"> = {
    "Rumah Tangga": "success", "Niaga": "info", "Industri": "warning", "Sosial": "secondary",
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <HeaderTabel judul="Data Kartu Pelanggan" deskripsi="CRUD pelanggan terhubung ke MySQL" labelTambah="Tambah Pelanggan" cari={cari} setCari={setCari} onTambah={() => bukaForm("tambah")} />
      {pesan && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {pesan}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {["No Kontrol", "Nama Pelanggan", "Alamat", "No Telp", "Jenis", "Aksi"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={6} /> :
              error ? <ErrorRow colSpan={6} pesan={error} onRetry={muat} /> :
              filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">Tidak ada data pelanggan.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.no_kontrol} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600">{r.no_kontrol}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{r.nama_pelanggan}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{r.alamat_pelanggan}</td>
                  <td className="px-4 py-3 text-slate-600">{r.no_tlp_pelanggan || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={warnaJenis[r.jenis_pelanggan] || "default"}>{r.jenis_pelanggan}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => bukaForm("ubah", r)} title="Ubah"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => hapus(r.no_kontrol, r.nama_pelanggan)} title="Hapus" className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <FooterTabel total={data.length} filtered={filtered.length} cari={cari} />

      {form !== null && (
        <Modal judul={modeForm === "tambah" ? "Tambah Pelanggan" : "Ubah Pelanggan"} onClose={() => setForm(null)}
          footer={<><Button variant="outline" onClick={() => setForm(null)}>Batal</Button><Button onClick={simpan} disabled={simpanLoading}>{simpanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}</Button></>}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {formGalat && <div className="col-span-full flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{formGalat}</div>}
            <div className="space-y-1.5"><Label>No Kontrol *</Label><Input type="number" value={form.no_kontrol ?? ""} onChange={(e) => setForm({ ...form, no_kontrol: Number(e.target.value) })} disabled={modeForm === "ubah"} /></div>
            <div className="space-y-1.5"><Label>Nama Pelanggan *</Label><Input value={form.nama_pelanggan ?? ""} onChange={(e) => setForm({ ...form, nama_pelanggan: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>No Telp</Label><Input value={form.no_tlp_pelanggan ?? ""} onChange={(e) => setForm({ ...form, no_tlp_pelanggan: e.target.value })} placeholder="08xxx" /></div>
            <div className="space-y-1.5"><Label>Jenis Pelanggan *</Label><Select value={form.jenis_pelanggan ?? ""} onChange={(e) => setForm({ ...form, jenis_pelanggan: e.target.value })} options={DAFTAR_JENIS.map((j) => ({ value: j, label: j }))} /></div>
            <div className="col-span-full space-y-1.5"><Label>Alamat *</Label><Textarea value={form.alamat_pelanggan ?? ""} onChange={(e) => setForm({ ...form, alamat_pelanggan: e.target.value })} rows={3} /></div>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// TABEL TARIF
// ─────────────────────────────────────────────────────────────

interface RowTarif { id_tarif: number; jenis_pelanggan: string; biaya_beban: number; tarif_kwh: number; }

/**
 * Tabel CRUD Tarif yang terhubung ke `/api/admin/tarif`.
 */
export function AdminTabelTarif() {
  const { apiFetch } = useSistem();
  const [data, setData] = useState<RowTarif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cari, setCari] = useState("");
  const [form, setForm] = useState<Partial<RowTarif> | null>(null);
  const [modeForm, setModeForm] = useState<"tambah" | "ubah">("tambah");
  const [simpanLoading, setSimpanLoading] = useState(false);
  const [formGalat, setFormGalat] = useState("");

  const muat = useCallback(async () => {
    setLoading(true); setError("");
    const res = await apiFetch<RowTarif[]>("/api/admin/tarif");
    if (res.success && res.data) setData(res.data);
    else setError(res.message || "Gagal memuat");
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { muat(); }, [muat]);

  const filtered = cari ? data.filter((r) => JSON.stringify(r).toLowerCase().includes(cari.toLowerCase())) : data;

  const simpan = async () => {
    if (!form || !form.jenis_pelanggan || form.biaya_beban === undefined || form.tarif_kwh === undefined) {
      setFormGalat("Semua field wajib diisi"); return;
    }
    setSimpanLoading(true);
    const method = modeForm === "tambah" ? "POST" : "PUT";
    const body = { id_tarif: form.id_tarif, jenis_pelanggan: form.jenis_pelanggan, biaya_beban: form.biaya_beban, tarif_kwh: form.tarif_kwh };
    const res = await apiFetch("/api/admin/tarif", { method, body: JSON.stringify(body) });
    if (res.success) { setForm(null); muat(); }
    else setFormGalat(res.message || "Gagal");
    setSimpanLoading(false);
  };

  const hapus = async (id: number, jenis: string) => {
    if (!confirm(`Hapus tarif "${jenis}"?`)) return;
    const res = await apiFetch(`/api/admin/tarif?id_tarif=${id}`, { method: "DELETE" });
    if (res.success) muat(); else alert(res.message || "Gagal");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <HeaderTabel judul="Data Tarif Listrik" deskripsi="CRUD tarif per jenis pelanggan dari MySQL" labelTambah="Tambah Tarif" cari={cari} setCari={setCari} onTambah={() => { setModeForm("tambah"); setForm({ jenis_pelanggan: "Rumah Tangga" }); setFormGalat(""); }} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">{["ID", "Jenis Pelanggan", "Biaya Beban/Bln", "Tarif/kWh", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <LoadingRow colSpan={5} /> :
              error ? <ErrorRow colSpan={5} pesan={error} onRetry={muat} /> :
              filtered.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">Tidak ada data tarif.</td></tr> :
              filtered.map((r) => (
                <tr key={r.id_tarif} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">{r.id_tarif}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{r.jenis_pelanggan}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatRupiah(r.biaya_beban)}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-600">{formatRupiah(r.tarif_kwh)}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon-sm" onClick={() => { setModeForm("ubah"); setForm(r); setFormGalat(""); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => hapus(r.id_tarif, r.jenis_pelanggan)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <FooterTabel total={data.length} filtered={filtered.length} cari={cari} />
      {form !== null && (
        <Modal judul={modeForm === "tambah" ? "Tambah Tarif" : "Ubah Tarif"} onClose={() => setForm(null)}
          footer={<><Button variant="outline" onClick={() => setForm(null)}>Batal</Button><Button onClick={simpan} disabled={simpanLoading}>{simpanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}</Button></>}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {formGalat && <div className="col-span-full flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{formGalat}</div>}
            <div className="space-y-1.5"><Label>Jenis Pelanggan *</Label><Select value={form.jenis_pelanggan ?? ""} onChange={(e) => setForm({ ...form, jenis_pelanggan: e.target.value })} options={DAFTAR_JENIS.map((j) => ({ value: j, label: j }))} /></div>
            <div className="space-y-1.5"><Label>Biaya Beban (Rp) *</Label><Input type="number" value={form.biaya_beban ?? ""} onChange={(e) => setForm({ ...form, biaya_beban: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Tarif per kWh (Rp) *</Label><Input type="number" value={form.tarif_kwh ?? ""} onChange={(e) => setForm({ ...form, tarif_kwh: Number(e.target.value) })} /></div>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// TABEL PETUGAS
// ─────────────────────────────────────────────────────────────

interface RowPetugas { id_petugas: number; nama_petugas: string; jenis_kelamin: string; no_hp: string; username: string; role: string; }

/**
 * Tabel CRUD Petugas yang terhubung ke `/api/admin/petugas`.
 */
export function AdminTabelPetugas() {
  const { apiFetch } = useSistem();
  const [data, setData] = useState<RowPetugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cari, setCari] = useState("");
  const [form, setForm] = useState<Partial<RowPetugas & { password: string }> | null>(null);
  const [modeForm, setModeForm] = useState<"tambah" | "ubah">("tambah");
  const [simpanLoading, setSimpanLoading] = useState(false);
  const [formGalat, setFormGalat] = useState("");

  const muat = useCallback(async () => {
    setLoading(true); setError("");
    const res = await apiFetch<RowPetugas[]>("/api/admin/petugas");
    if (res.success && res.data) setData(res.data);
    else setError(res.message || "Gagal");
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { muat(); }, [muat]);

  const filtered = cari ? data.filter((r) => JSON.stringify(r).toLowerCase().includes(cari.toLowerCase())) : data;

  const simpan = async () => {
    if (!form) return;
    if (!form.nama_petugas || !form.jenis_kelamin || !form.username) { setFormGalat("nama, jenis_kelamin, username wajib"); return; }
    if (modeForm === "tambah" && !form.password) { setFormGalat("Password wajib untuk petugas baru"); return; }
    setSimpanLoading(true);
    const method = modeForm === "tambah" ? "POST" : "PUT";
    const res = await apiFetch("/api/admin/petugas", { method, body: JSON.stringify(form) });
    if (res.success) { setForm(null); muat(); }
    else setFormGalat(res.message || "Gagal");
    setSimpanLoading(false);
  };

  const hapus = async (id: number, nama: string) => {
    if (!confirm(`Hapus petugas "${nama}"?`)) return;
    const res = await apiFetch(`/api/admin/petugas?id_petugas=${id}`, { method: "DELETE" });
    if (res.success) muat(); else alert(res.message || "Gagal");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <HeaderTabel judul="Data Petugas Loket" deskripsi="CRUD petugas dengan hash password bcrypt" labelTambah="Tambah Petugas" cari={cari} setCari={setCari} onTambah={() => { setModeForm("tambah"); setForm({ jenis_kelamin: "laki-laki", role: "petugas" }); setFormGalat(""); }} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">{["ID", "Nama Petugas", "L/P", "No HP", "Username", "Role", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <LoadingRow colSpan={7} /> :
              error ? <ErrorRow colSpan={7} pesan={error} onRetry={muat} /> :
              filtered.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">Tidak ada data petugas.</td></tr> :
              filtered.map((r) => (
                <tr key={r.id_petugas} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">{r.id_petugas}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{r.nama_petugas}</td>
                  <td className="px-4 py-3"><Badge variant={r.jenis_kelamin === "laki-laki" ? "info" : "default"}>{r.jenis_kelamin === "laki-laki" ? "L" : "P"}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{r.no_hp || "—"}</td>
                  <td className="px-4 py-3"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{r.username}</code></td>
                  <td className="px-4 py-3"><Badge variant={r.role === "admin" ? "warning" : "secondary"}>{r.role}</Badge></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon-sm" onClick={() => { setModeForm("ubah"); setForm({ ...r, password: "" }); setFormGalat(""); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => hapus(r.id_petugas, r.nama_petugas)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <FooterTabel total={data.length} filtered={filtered.length} cari={cari} />
      {form !== null && (
        <Modal judul={modeForm === "tambah" ? "Tambah Petugas" : "Ubah Petugas"} onClose={() => setForm(null)}
          footer={<><Button variant="outline" onClick={() => setForm(null)}>Batal</Button><Button onClick={simpan} disabled={simpanLoading}>{simpanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}</Button></>}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {formGalat && <div className="col-span-full flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{formGalat}</div>}
            <div className="space-y-1.5"><Label>Nama Petugas *</Label><Input value={form.nama_petugas ?? ""} onChange={(e) => setForm({ ...form, nama_petugas: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Jenis Kelamin *</Label><Select value={form.jenis_kelamin ?? ""} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })} options={[{ value: "laki-laki", label: "Laki-laki" }, { value: "perempuan", label: "Perempuan" }]} /></div>
            <div className="space-y-1.5"><Label>No HP</Label><Input value={form.no_hp ?? ""} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Username *</Label><Input value={form.username ?? ""} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{modeForm === "tambah" ? "Password *" : "Password Baru (kosongkan jika tidak diubah)"}</Label><Input type="password" value={(form as { password?: string }).password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Role</Label><Select value={form.role ?? "petugas"} onChange={(e) => setForm({ ...form, role: e.target.value })} options={[{ value: "petugas", label: "Petugas" }, { value: "admin", label: "Admin" }]} /></div>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// TABEL PEMAKAIAN
// ─────────────────────────────────────────────────────────────

interface RowPemakaian { id_pemakaian: number; no_kontrol: number; nama_pelanggan: string; tahun: number; bulan: number; meter_awal: number; meter_akhir: number; jumlah_pakai: number; biaya_beban_pemakaian: number; biaya_pemakaian: number; }

/**
 * Tabel CRUD Pemakaian yang terhubung ke `/api/admin/pemakaian`.
 */
export function AdminTabelPemakaian() {
  const { apiFetch } = useSistem();
  const [data, setData] = useState<RowPemakaian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cari, setCari] = useState("");
  const [form, setForm] = useState<Partial<RowPemakaian> | null>(null);
  const [modeForm, setModeForm] = useState<"tambah" | "ubah">("tambah");
  const [simpanLoading, setSimpanLoading] = useState(false);
  const [formGalat, setFormGalat] = useState("");
  const [pelangganList, setPelangganList] = useState<Array<{ no_kontrol: number; nama_pelanggan: string }>>([]);

  const muat = useCallback(async () => {
    setLoading(true); setError("");
    const [resPm, resPl] = await Promise.all([
      apiFetch<RowPemakaian[]>("/api/admin/pemakaian"),
      apiFetch<Array<{ no_kontrol: number; nama_pelanggan: string }>>("/api/admin/pelanggan"),
    ]);
    if (resPm.success && resPm.data) setData(resPm.data);
    else setError(resPm.message || "Gagal");
    if (resPl.success && resPl.data) setPelangganList(resPl.data);
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { muat(); }, [muat]);

  const filtered = cari ? data.filter((r) => JSON.stringify(r).toLowerCase().includes(cari.toLowerCase())) : data;

  const simpan = async () => {
    if (!form || !form.no_kontrol || !form.tahun || !form.bulan || form.meter_awal === undefined || form.meter_akhir === undefined) {
      setFormGalat("Semua field wajib diisi"); return;
    }
    setSimpanLoading(true);
    const method = modeForm === "tambah" ? "POST" : "PUT";
    const res = await apiFetch("/api/admin/pemakaian", { method, body: JSON.stringify(form) });
    if (res.success) { setForm(null); muat(); }
    else setFormGalat(res.message || "Gagal");
    setSimpanLoading(false);
  };

  const hapus = async (id: number) => {
    if (!confirm("Hapus catatan pemakaian ini?")) return;
    const res = await apiFetch(`/api/admin/pemakaian?id_pemakaian=${id}`, { method: "DELETE" });
    if (res.success) muat(); else alert(res.message || "Gagal");
  };

  const opsiPelanggan = pelangganList.map((p) => ({ value: String(p.no_kontrol), label: `${p.no_kontrol} — ${p.nama_pelanggan}` }));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <HeaderTabel judul="Data Pemakaian Listrik" deskripsi="CRUD pemakaian; biaya dihitung otomatis dari tarif" labelTambah="Tambah Pemakaian" cari={cari} setCari={setCari} onTambah={() => { setModeForm("tambah"); setForm({ tahun: new Date().getFullYear(), bulan: new Date().getMonth() + 1 }); setFormGalat(""); }} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">{["Pelanggan", "Periode", "Meter Awal", "Meter Akhir", "kWh", "Total Tagihan", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <LoadingRow colSpan={7} /> :
              error ? <ErrorRow colSpan={7} pesan={error} onRetry={muat} /> :
              filtered.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">Tidak ada data pemakaian.</td></tr> :
              filtered.map((r) => (
                <tr key={r.id_pemakaian} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3"><p className="font-medium text-slate-700">{r.nama_pelanggan}</p><p className="text-xs text-slate-400 font-mono">{r.no_kontrol}</p></td>
                  <td className="px-4 py-3 font-medium">{formatPeriode(r.bulan, r.tahun)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{r.meter_awal}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{r.meter_akhir}</td>
                  <td className="px-4 py-3"><Badge variant="info">{r.jumlah_pakai} kWh</Badge></td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{formatRupiah(r.biaya_beban_pemakaian + r.biaya_pemakaian)}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon-sm" onClick={() => { setModeForm("ubah"); setForm(r); setFormGalat(""); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => hapus(r.id_pemakaian)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <FooterTabel total={data.length} filtered={filtered.length} cari={cari} />
      {form !== null && (
        <Modal judul={modeForm === "tambah" ? "Tambah Pemakaian" : "Ubah Pemakaian"} onClose={() => setForm(null)}
          footer={<><Button variant="outline" onClick={() => setForm(null)}>Batal</Button><Button onClick={simpan} disabled={simpanLoading}>{simpanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}</Button></>}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {formGalat && <div className="col-span-full flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{formGalat}</div>}
            <div className="space-y-1.5"><Label>Pelanggan *</Label><Select value={String(form.no_kontrol ?? "")} onChange={(e) => setForm({ ...form, no_kontrol: Number(e.target.value) })} options={opsiPelanggan} /></div>
            <div className="space-y-1.5"><Label>Tahun *</Label><Input type="number" value={form.tahun ?? ""} onChange={(e) => setForm({ ...form, tahun: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Bulan *</Label><Select value={String(form.bulan ?? "")} onChange={(e) => setForm({ ...form, bulan: Number(e.target.value) })} options={DAFTAR_BULAN} /></div>
            <div className="space-y-1.5"><Label>Meter Awal *</Label><Input type="number" value={form.meter_awal ?? ""} onChange={(e) => setForm({ ...form, meter_awal: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Meter Akhir *</Label><Input type="number" value={form.meter_akhir ?? ""} onChange={(e) => setForm({ ...form, meter_akhir: Number(e.target.value) })} /></div>
            <p className="col-span-full text-xs text-slate-400">Jumlah kWh dan biaya akan dihitung otomatis dari tarif pelanggan.</p>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// TABEL PEMBAYARAN
// ─────────────────────────────────────────────────────────────

interface RowPembayaran { id_pembayaran: number; no_kontrol: number; nama_pelanggan: string; nama_petugas: string; jumlah_bayar: number; biaya_total: number; tanggal_bayar: string; bulan?: number; tahun?: number; }

/**
 * Tabel Pembayaran (read-only + delete) dari `/api/admin/pembayaran`.
 */
export function AdminTabelPembayaran() {
  const { apiFetch } = useSistem();
  const [data, setData] = useState<RowPembayaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cari, setCari] = useState("");

  const muat = useCallback(async () => {
    setLoading(true); setError("");
    const res = await apiFetch<RowPembayaran[]>("/api/admin/pembayaran");
    if (res.success && res.data) setData(res.data);
    else setError(res.message || "Gagal");
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { muat(); }, [muat]);

  const filtered = cari ? data.filter((r) => JSON.stringify(r).toLowerCase().includes(cari.toLowerCase())) : data;

  const hapus = async (id: number) => {
    if (!confirm(`Hapus pembayaran #${id}?`)) return;
    const res = await apiFetch(`/api/admin/pembayaran?id_pembayaran=${id}`, { method: "DELETE" });
    if (res.success) muat(); else alert(res.message || "Gagal");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <HeaderTabel judul="Transaksi Pembayaran" deskripsi="Data pembayaran dari MySQL (tambah via Loket Petugas)" labelTambah="" cari={cari} setCari={setCari} onTambah={() => {}} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50/80">{["No Bukti", "Pelanggan", "Periode", "Tanggal", "Petugas", "Total Tagihan", "Dibayar", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <LoadingRow colSpan={8} /> :
              error ? <ErrorRow colSpan={8} pesan={error} onRetry={muat} /> :
              filtered.length === 0 ? <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">Belum ada transaksi pembayaran.</td></tr> :
              filtered.map((r) => (
                <tr key={r.id_pembayaran} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-400">#{r.id_pembayaran}</td>
                  <td className="px-4 py-3"><p className="font-medium text-slate-700">{r.nama_pelanggan}</p><p className="text-xs text-slate-400 font-mono">{r.no_kontrol}</p></td>
                  <td className="px-4 py-3 text-slate-500">{r.bulan && r.tahun ? formatPeriode(r.bulan, r.tahun) : "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatTanggal((r.tanggal_bayar || "").split("T")[0])}</td>
                  <td className="px-4 py-3 text-slate-600">{r.nama_petugas}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatRupiah(r.biaya_total)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatRupiah(r.jumlah_bayar)}</td>
                  <td className="px-4 py-3"><Button variant="ghost" size="icon-sm" onClick={() => hapus(r.id_pembayaran)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <FooterTabel total={data.length} filtered={filtered.length} cari={cari} />
    </section>
  );
}
