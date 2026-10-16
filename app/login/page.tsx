/**
 * =============================================================================
 * app/login/page.tsx
 * -----------------------------------------------------------------------------
 * Halaman login untuk seluruh peran (admin, petugas loket, pelanggan).
 *
 * Mengikuti flowchart pada `blueprints/system-blueprint.json`:
 *   LOGIN -> username & password salah = pesan error,
 *            benar = diarahkan ke dashboard sesuai peran.
 * =============================================================================
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PETA_HALAMAN, PASSWORD_PELANGGAN } from "@/lib/auth";
import { useSistem } from "@/lib/store";
import type { Peran } from "@/lib/types";

/** Daftar akun demo yang ditampilkan sebagai bantuan di halaman login. */
const AKUN_DEMO: Array<{ peran: Peran; kredensial: string; deskripsi: string }> = [
  { peran: "admin", kredensial: "admin / admin123", deskripsi: "Kelola data & laporan" },
  { peran: "petugas", kredensial: "budi / petugas123", deskripsi: "Loket pembayaran & cetak rekening" },
  { peran: "pelanggan", kredensial: "1001 / " + PASSWORD_PELANGGAN, deskripsi: "Lihat riwayat pemakaian" },
];

/**
 * Merender formulir login dan kartu bantuan akun demo.
 *
 * @returns Elemen halaman login.
 */
export default function HalamanLogin() {
  const { login } = useSistem();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [galat, setGalat] = useState("");

  /**
   * Memproses login: verifikasi kredensial lalu arahkan ke dashboard peran.
   *
   * @param event - Event submit formulir.
   */
  const saatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validasi sederhana sebelum memanggil verifikasi.
    if (!username.trim() || !password.trim()) {
      setGalat("Username dan password wajib diisi.");
      return;
    }

    const sesi = login(username, password);
    if (!sesi) {
      // Sesuai flowchart: kredensial salah -> tampilkan error login.
      setGalat("Username atau password salah. Periksa kembali akun Anda.");
      return;
    }

    // Login berhasil -> buka dashboard sesuai peran pengguna.
    router.replace(PETA_HALAMAN[sesi.peran]);
  };

  return (
    <div className="flex min-h-screen">
      {/* Panel branding (kiri) */}
      <aside className="relative hidden flex-1 items-end overflow-hidden bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-12 lg:flex">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-amber-900/20 blur-2xl" />
        <div className="relative max-w-md text-slate-900">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-lg">
            ⚡
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight">
            Sistem Pembayaran
            <br />
            Listrik
          </h1>
          <p className="mt-4 text-slate-800/80">
            Pantau pemakaian, hitung tagihan otomatis, dan cetak rekening listrik
            langsung dari loket pembayaran.
          </p>
          <ul className="mt-8 space-y-2 text-sm font-medium">
            <li>✔ Data pelanggan, tarif, dan petugas terpusat</li>
            <li>✔ Perhitungan biaya beban &amp; pemakaian otomatis</li>
            <li>✔ Cetak rekening listrik resmi satu klik</li>
            <li>✔ Riwayat pemakaian untuk pelanggan</li>
          </ul>
        </div>
      </aside>

      {/* Formulir login (kanan) */}
      <main className="flex flex-1 items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-xl">
              ⚡
            </span>
            <p className="font-bold text-slate-800">SIP Listrik</p>
          </div>

          <h2 className="text-2xl font-bold text-slate-800">Masuk ke Akun</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan akun admin, petugas loket, atau nomor kontrol pelanggan.
          </p>

          <form onSubmit={saatSubmit} className="mt-6 space-y-4">
            {galat ? (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
              >
                {galat}
              </p>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-slate-600">Username / No Kontrol</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setGalat("");
                }}
                placeholder="admin"
                autoComplete="username"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-600">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setGalat("");
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-slate-900 transition hover:bg-amber-300"
            >
              Masuk
            </button>
          </form>

          {/* Bantuan akun demo */}
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Akun demo
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              {AKUN_DEMO.map((akun) => (
                <li key={akun.peran} className="flex items-center justify-between gap-2">
                  <span>
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
                      {akun.kredensial}
                    </code>
                    <span className="ml-1 text-xs text-slate-400">{akun.deskripsi}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const [user, pass] = akun.kredensial.split(" / ");
                      setUsername(user);
                      setPassword(pass);
                      setGalat("");
                    }}
                    className="text-xs font-semibold text-amber-600 hover:underline"
                  >
                    pakai
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
