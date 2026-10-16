/**
 * =============================================================================
 * components/modal.tsx
 * -----------------------------------------------------------------------------
 * Dialog modal yang didesain ulang menggunakan Radix UI Dialog.
 * Mendukung animasi buka/tutup, aksesibilitas, dan kustomisasi ukuran.
 * =============================================================================
 */
"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Properti modal. */
export interface ModalProps {
  /** Judul yang tampil pada header modal. */
  judul: string;
  /** Dipanggil ketika pengguna menutup modal. */
  onClose: () => void;
  /** Isi utama modal. */
  children: ReactNode;
  /** Tombol aksi di footer. */
  footer?: ReactNode;
  /** Kelas tambahan untuk panel modal (ukuran lebar kustom). */
  kelasPanel?: string;
}

/**
 * Merender dialog modal aksesibel berbasis Radix UI.
 *
 * @param props - Lihat `ModalProps`.
 * @returns Elemen modal.
 */
export default function Modal({ judul, onClose, children, footer, kelasPanel = "max-w-lg" }: ModalProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] flex-col overflow-hidden p-0 print:hidden",
          kelasPanel,
        )}
      >
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle>{judul}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 gap-2">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
