/**
 * =============================================================================
 * components/print-area.tsx
 * -----------------------------------------------------------------------------
 * Area cetak `#area-cetak`: hanya tampil saat halaman dicetak (print), tidak
 * tampil di layar.
 *
 * Konten dipindahkan (portal) ke `<body>` karena bungkus dashboard memakai
 * kelas `print:hidden` — bila area cetak dirender di dalamnya, elemen anak
 * tidak akan pernah muncul saat print. Portal baru dibuat setelah komponen
 * terpasang di browser agar cocok dengan hasil prerender Next.js.
 * =============================================================================
 */
"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Properti area cetak. */
export interface PrintAreaProps {
  /** Dokumen yang hanya dicetak, biasanya <RekeningDoc />. */
  children: ReactNode;
}

/** Langganan kosong: status "terpasang" tidak berubah dari sumber eksternal mana pun. */
function langgananKosong(): () => void {
  return () => undefined;
}

/**
 * Mendeteksi apakah komponen sudah berada di browser (terpasang), bukan saat
 * prerender server. Pola `useSyncExternalStore` dipakai agar aman hidrasi dan
 * tanpa `setState` di dalam effect.
 *
 * @returns true di browser, false saat prerender server.
 */
function useTerpasang(): boolean {
  return useSyncExternalStore(langgananKosong, () => true, () => false);
}

/**
 * Merender anak komponen ke `<body>` dalam elemen `#area-cetak`
 * yang tersembunyi di layar dan tampil hanya pada saat print.
 *
 * @param props - Lihat `PrintAreaProps`.
 * @returns Elemen portal di browser, atau `null` saat prerender server.
 */
export default function PrintArea({ children }: PrintAreaProps) {
  // Portal hanya bisa dibuat di browser; null saat prerender agar hidrasi cocok.
  const terpasang = useTerpasang();
  if (!terpasang) return null;

  return createPortal(
    <div id="area-cetak" className="hidden print:block">
      {children}
    </div>,
    document.body,
  );
}
