<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI Agents Configuration (agents.md)

## 1. Role: Architect & Backend Agent (Tool: OpenCode)
- **Responsibility**: Bertanggung jawab penuh terhadap desain database MySQL, pembuatan Stored Procedure, Function, Trigger, serta struktur backend Next.js API Routes.
- **Guidelines**: 
  - Menerapkan prinsip *clean code*, modular, dan menyertakan komentar di setiap fungsi.
  - Memastikan keamanan dari celah SQL Injection pada modul autentikasi dan pencarian data.

## 2. Role: Frontend & UI/UX Agent (Tool: Freebuf)
- **Responsibility**: Membangun antarmuka (UI/UX) berbasis Next.js (React) yang ramah pengguna (*user-friendly*), estetik, dan sesuai dengan pembagian hak akses (Administrator, Petugas Loket, Pelanggan).
- **Guidelines**:
  - Membuat dashboard interaktif untuk masing-masing role.
  - Menyediakan halaman khusus bagi pelanggan untuk mengecek biaya pemakaian berdasarkan `no_kontrol`.
  - Mendesain cetakan rekening listrik yang komunikatif dan rapi.

## Best Practice Menjalankan 2 AI Agent Sekaligus:
1. **Divide and Conquer (Pembagian Tugas Jelas):** Gunakan OpenCode untuk fokus mengurus skema database, migrasi, dan logika backend/API, sementara Freebuf difokuskan untuk menyusun komponen UI, halaman dashboard, dan styling (Tailwind CSS di Next.js).
2. **Sinkronisasi Kontrak API (API Contract First):** Tetapkan bentuk format JSON response / endpoint terlebih dahulu sebelum kedua agen bekerja secara paralel agar integrasi Frontend dan Backend berjalan mulus tanpa konflik.
3. **Review Berkala:** Lakukan pengujian unit secara berkala pada setiap fungsi yang telah digabungkan untuk menghindari inkonsistensi tipe data.