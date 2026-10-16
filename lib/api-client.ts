/**
 * =============================================================================
 * lib/api-client.ts
 * -----------------------------------------------------------------------------
 * Helper fetch terpusat untuk seluruh panggilan API dari sisi klien.
 * Secara otomatis menyisipkan header Authorization: Bearer <token> jika
 * token tersimpan di localStorage, dan menangani normalisasi respons JSON.
 *
 * Semua fungsi menggunakan prepared-query via API routes (SQL Injection aman
 * di sisi backend). Di sini hanya manajemen token & marshaling data.
 * =============================================================================
 */

/** Kunci penyimpanan JWT di localStorage. */
export const KUNCI_TOKEN = "sip-listrik-token";

/**
 * Membaca JWT yang tersimpan di localStorage.
 * @returns String token atau null bila belum login / server-side.
 */
export function bacaToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KUNCI_TOKEN);
}

/**
 * Menyimpan JWT ke localStorage.
 * @param token - String JWT dari respons `/api/auth/login`.
 */
export function simpanToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KUNCI_TOKEN, token);
}

/**
 * Menghapus JWT dari localStorage (dipakai saat logout).
 */
export function hapusToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KUNCI_TOKEN);
}

/** Struktur respons standar dari semua API route. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

/**
 * Wrapper `fetch` yang menyisipkan token secara otomatis dan
 * mengembalikan data yang sudah di-parse.
 *
 * @param path - Path URL API, cth: `/api/auth/login`.
 * @param init - Opsi fetch standar (method, body, dll).
 * @returns Promise dengan `ApiResponse<T>`.
 *
 * @example
 * const res = await apiFetch<{ token: string }>("/api/auth/login", {
 *   method: "POST",
 *   body: JSON.stringify({ username, password }),
 * });
 */
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = bacaToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...init, headers });
  const json: ApiResponse<T> = await res.json();
  return json;
}
