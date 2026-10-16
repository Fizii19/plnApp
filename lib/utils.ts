/**
 * lib/utils.ts
 * Utilitas umum untuk penggabungan kelas Tailwind dengan type-safe merge.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Menggabungkan class names dengan tailwind-merge dan clsx.
 * @param inputs - Daftar kelas yang akan digabungkan.
 * @returns String kelas Tailwind yang telah di-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
