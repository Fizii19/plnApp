/**
 * =============================================================================
 * components/modal.tsx
 * -----------------------------------------------------------------------------
 * Dialog modal dasar (overlay + panel) dipakai form CRUD dan pratinjau cetak.
 * Ditutup dengan tombol, klik overlay, atau tombol Escape.
 * =============================================================================
 */
"use client";

import { useEffect, type ReactNode } from "react";

/** Properti modal. */
export interface ModalProps {
  /** Judul yang tampil pada header modal. */
  judul: string;
  /** Dipanggil ketika pengguna meminta menutup modal. */
  onClose: () => void;
  /** Isi utama modal (biasanya form atau dokumen pratinjau). */
  children: ReactNode;
  /** Tombol aksi di footer (opsional), contoh: "Batal" & "Simpan". */
  footer?: ReactNode;
  /** Kelas tambahan untuk panel modal (untuk lebar khusus dokumen cetak). */
  kelasPanel?: string;
}

/**
 * Merender dialog modal yang tertumpuk di atas halaman.
 *
 * @param props - Lihat `ModalProps`.
 * @returns Elemen modal; otomatis disembunyikan saat dicetak (print:hidden).
 */
export default function Modal({ judul, onClose, children, footer, kelasPanel = "max-w-lg" }: ModalProps) {
  // Tutup modal dengan tombol Escape untuk kenyamanan aksesibilitas.
  useEffect(() => {
    /** Menangani penekanan tombol Escape pada window. */
    const saatTekanEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", saatTekanEscape);
    return () => window.removeEventListener("keydown", saatTekanEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      {/* Latar gelap; klik untuk menutup modal. */}
      <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${kelasPanel}`}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">{judul}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
