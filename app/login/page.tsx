/**
 * =============================================================================
 * app/login/page.tsx
 * -----------------------------------------------------------------------------
 * Halaman login yang terhubung ke API MySQL (POST /api/auth/login).
 * Mendukung autentikasi untuk tiga peran: admin, petugas loket, dan pelanggan.
 *
 * KEAMANAN: Tidak ada tombol otomatis / quick-login.
 * Pengguna wajib memasukkan kredensial secara manual.
 * =============================================================================
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Zap,
  LogIn,
  AlertCircle,
  User,
  Lock,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { PETA_HALAMAN } from "@/lib/auth";
import { useSistem } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Halaman login terpusat untuk semua peran.
 * Menghubungi `/api/auth/login` dengan prepared statement di sisi backend.
 *
 * @returns Elemen halaman login.
 */
export default function HalamanLogin() {
  const { login } = useSistem();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lihatPassword, setLihatPassword] = useState(false);
  const [galat, setGalat] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Menangani submit form login.
   * Memanggil API MySQL, menyimpan JWT, lalu mengarahkan ke dashboard.
   *
   * @param event - Event submit dari elemen form.
   */
  const saatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const userTrim = username.trim();
    const passTrim = password.trim();

    if (!userTrim || !passTrim) {
      setGalat("Username/No Kontrol dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setGalat("");

    try {
      const sesi = await login(userTrim, passTrim);

      if (!sesi) {
        setGalat("Username atau password salah. Periksa kembali dan coba lagi.");
        return;
      }

      // Arahkan ke dashboard sesuai peran
      router.replace(PETA_HALAMAN[sesi.peran]);
    } catch {
      setGalat("Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ─────────────────── PANEL KIRI: Branding ─────────────────── */}
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-12 lg:flex">
        {/* Dekorasi lingkaran blur */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-orange-900/20 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
            <Zap className="h-6 w-6 text-white" fill="currentColor" />
          </div>
          <div>
            <p className="font-bold text-white">SIP Listrik</p>
            <p className="text-xs text-amber-100">Sistem Informasi Pembayaran</p>
          </div>
        </div>

        {/* Konten utama branding */}
        <div className="relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm ring-1 ring-white/30">
            <Sparkles className="h-4 w-4" />
            Platform Manajemen Listrik Terpadu
          </div>
          <h1 className="text-5xl font-extrabold leading-tight text-white">
            Kelola Tagihan
            <br />
            <span className="text-amber-100">Listrik</span> dengan
            <br />
            Mudah
          </h1>
          <p className="mt-5 max-w-xs text-base text-amber-100/90 leading-relaxed">
            Platform terpadu untuk admin, petugas loket, dan pelanggan dalam satu
            sistem yang terintegrasi dengan database MySQL.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Perhitungan biaya pemakaian otomatis",
              "Cetak rekening listrik satu klik",
              "Riwayat tagihan pelanggan real-time",
              "Data tersimpan aman di database MySQL",
            ].map((fitur) => (
              <li key={fitur} className="flex items-center gap-3 text-sm text-white">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-200" fill="currentColor" />
                {fitur}
              </li>
            ))}
          </ul>
        </div>

        {/* Indikator keamanan */}
        <div className="relative flex items-center gap-2 text-xs text-amber-200">
          <ShieldCheck className="h-4 w-4" />
          Autentikasi aman dengan enkripsi bcrypt + JWT
        </div>
      </aside>

      {/* ─────────────────── PANEL KANAN: Form Login ─────────────────── */}
      <main className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400">
              <Zap className="h-5 w-5 text-slate-900" fill="currentColor" />
            </div>
            <div>
              <p className="font-bold text-slate-900">SIP Listrik</p>
              <p className="text-xs text-slate-500">Sistem Pembayaran Listrik</p>
            </div>
          </div>

          <Card className="border-0 shadow-xl ring-1 ring-slate-200">
            <CardContent className="p-8">
              <div className="mb-7">
                <h2 className="text-2xl font-bold text-slate-900">Selamat Datang</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Masukkan username dan password Anda untuk masuk.
                </p>
              </div>

              <form onSubmit={saatSubmit} className="space-y-5" noValidate>
                {/* Alert error */}
                {galat ? (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                    <p className="text-sm font-medium text-red-700">{galat}</p>
                  </div>
                ) : null}

                {/* Field username */}
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username / No Kontrol</Label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <Input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setGalat("");
                      }}
                      placeholder="Masukkan username atau no kontrol"
                      autoComplete="username"
                      autoFocus
                      required
                      className="pl-10 h-11"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Field password */}
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <Input
                      id="login-password"
                      type={lihatPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setGalat("");
                      }}
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                      required
                      className="pl-10 pr-11 h-11"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setLihatPassword((p) => !p)}
                      aria-label={lihatPassword ? "Sembunyikan password" : "Tampilkan password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      tabIndex={-1}
                    >
                      {lihatPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Tombol submit */}
                <Button
                  type="submit"
                  size="xl"
                  className="w-full"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900"
                        aria-hidden="true"
                      />
                      Memverifikasi…
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      Masuk ke Dashboard
                    </>
                  )}
                </Button>
              </form>

              {/* Keterangan role */}
              <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  Panduan Login
                </p>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li>
                    <span className="font-medium text-slate-700">Admin / Petugas:</span>{" "}
                    gunakan username yang terdaftar di sistem.
                  </li>
                  <li>
                    <span className="font-medium text-slate-700">Pelanggan:</span>{" "}
                    masukkan nomor kontrol listrik sebagai username.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
