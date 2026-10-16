/**
 * =============================================================================
 * app/page.tsx
 * -----------------------------------------------------------------------------
 * Halaman root (`/`). Seluruh pengguna harus masuk melalui halaman login,
 * sehingga root langsung mengalihkan browser ke `/login`.
 * =============================================================================
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Merender layar pemuatan singkat lalu mengalihkan pengguna ke halaman login.
 * Pengalihan dilakukan di browser (useEffect) agar aman dengan mode Cache
 * Components Next.js 16 (tanpa API dinamis saat prerender).
 *
 * @returns Layar pengalihan ke `/login`.
 */
export default function HalamanUtama() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-amber-300 border-t-amber-500" />
      <p className="text-sm text-slate-500">Mengalihkan ke halaman login…</p>
    </div>
  );
}
