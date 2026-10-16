# Catatan Wawancara — Struktur Data Array, Tipe Data, Loop, Debugging

> Semua contoh diambil langsung dari kode project **SIP Listrik** (project ini sendiri).
> Saat ditanya guru, tunjukkin file & barisnya.

---

## 1. TIPE DATA (Data Types)

Tipe data = jenis data yang disimpan sebuah variabel.
Didefinisikan di **`lib/types.ts`**.

### Tipe Data Primitif (dasar)

| Tipe | Fungsi | Contoh di project |
|---|---|---|
| `number` | Angka (integer/desimal) | `noKontrol: 1001`, `tarifKwh: 1445` |
| `string` | Teks | `nama: "Slamet Riyadi"` |
| `boolean` | Benar/Salah | `sudah_bayar: true` |
| `undefined` | Nilai kosong/ketidakadaan | fungsi bisa return `undefined` |

Contoh nyata di `lib/types.ts:31-42`:

```typescript
export interface Pelanggan {
  noKontrol: number;    // tipe number - angka saja
  nama: string;         // tipe string - teks
  alamat: string;
  noTlp: string;        // sengaja string, BUKAN number
  jenis: JenisPelanggan;
}
```

> **Q: Kenapa `noTlp` string bukan number?**
> **A:** Karena nomor `081234567890` kalau jadi number jadi `81234567890` —
> nol di depan hilang. Tipe data dipilih sesuai kebutuhan, bukan asal angka = number.

### Tipe Data Kompleks

**Array** = daftar kumpulan nilai dalam satu variabel.
**Interface/Object** = struktur data dengan banyak field berbeda.

```typescript
// Array of string
const DAFTAR_JENIS: string[] = ["Rumah Tangga", "Niaga", "Industri", "Sosial"];

// Array of object
const PELANGGAN_SEED: Pelanggan[] = [
  { noKontrol: 1001, nama: "Slamet Riyadi", ... },
  { noKontrol: 1002, nama: "Dewi Lestari", ... },
];
```

### Union Type (pilihan tipe)

`lib/types.ts:16`:

```typescript
export type Peran = "admin" | "petugas" | "pelanggan";
```

Variabel bertipe `Peran` **hanya boleh** diisi salah satu dari 3 string itu.
Kalau diisi `"siswa"` → error. Ini namanya **type safety** —
TypeScript mencegah kesalahan sebelum kode dijalankan.

---

## 2. STRUKTUR DATA ARRAY

Array = struktur data dasar: **kumpulan nilai yang diurutkan dan punya index (mulai dari 0)**.

### Deklarasi Array

`lib/format.ts:16-29`:

```typescript
export const NAMA_BULAN = [
  "Januari",    // index 0
  "Februari",   // index 1
  "Maret",      // index 2
  ...
  "Desember",   // index 11
];
```

Penggunaan `lib/format.ts:67-70`:

```typescript
export function namaBulan(bulan: number): string {
  if (bulan < 1 || bulan > 12) return "";
  return NAMA_BULAN[bulan - 1];  // bulan 7 → index 6 → "Juli"
}
```

> **Kenapa `-1`?** Bulan 1 = Januari, tapi index array mulai dari 0.

### Array of Object (paling sering dipakai)

`lib/mock-data.ts:26-31`:

```typescript
export const TARIF_SEED: Tarif[] = [
  { idTarif: 1, jenisPlg: "Rumah Tangga", biayaBeban: 5000,  tarifKwh: 1445 },
  { idTarif: 2, jenisPlg: "Niaga",        biayaBeban: 10000, tarifKwh: 1650 },
  { idTarif: 3, jenisPlg: "Industri",     biayaBeban: 25000, tarifKwh: 1750 },
  { idTarif: 4, jenisPlg: "Sosial",       biayaBeban: 3000,  tarifKwh: 1150 },
];
```

Akses elemen: `TARIF_SEED[0].tarifKwh` → `1445`.

### Operasi Dasar Array

#### a) Mencari satu elemen → `.find()`

`lib/billing.ts:28-33`:

```typescript
export function getTarifUntukJenis(
  daftarTarif: Tarif[],
  jenis: JenisPelanggan,
): Tarif | undefined {
  return daftarTarif.find((tarif) => tarif.jenisPlg === jenis);
}
```

`.find()` = telusuri array satu-satu, **return elemen pertama** yang kondisinya `true`.
Kalau tidak ada yang cocok → return `undefined`.

#### b) Menyaring elemen → `.filter()`

`lib/billing.ts:157-164`:

```typescript
export function riwayatPemakaian(
  daftarPemakaian: Pemakaian[],
  noKontrol: number,
): Pemakaian[] {
  return daftarPemakaian
    .filter((p) => p.noKontrol === noKontrol)
    .sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan);
}
```

`.filter()` = **return array baru** yang berisi semua elemen yang kondisinya `true`.

#### c) Mengecek boolean → `.some()`

`lib/billing.ts:180-189`:

```typescript
export function sudahDibayar(
  daftarPembayaran: Pembayaran[],
  noKontrol: number, bulan: number, tahun: number,
): boolean {
  return daftarPembayaran.some(
    (p) => p.noKontrol === noKontrol && p.bulan === bulan && p.tahun === tahun,
  );
}
```

`.some()` = **return `true` kalau ADA minimal satu elemen** yang cocok.
Mirip `.find()` tapi hasilnya boolean.

#### d) Menjumlahkan semua elemen → `.reduce()`

`app/pelanggan/page.tsx:174-178`:

```typescript
const totalTunggakan = riwayat.pemakaian
  .filter((p) => !cekLunas(p))                    // ambil yang belum bayar
  .reduce((sum, p) => sum + p.biaya_total, 0);    // jumlahkan
```

`.reduce()` = **mengubah array menjadi satu nilai tunggal** (total rupiah).
`0` di akhir = nilai awal penjumlahan.

#### e) Mengubah setiap elemen → `.map()`

`app/admin/page.tsx:243-259`:

```typescript
ringkasan.pembayaran_terbaru.map((b) => (
  <tr key={b.id_pembayaran}>
    <td>#{b.id_pembayaran}</td>
    <td>{b.nama_pelanggan}</td>
    <td>{formatRupiah(b.jumlah_bayar)}</td>
  </tr>
))
```

`.map()` = **return array baru** dengan setiap elemen diubah jadi bentuk lain
(objek data → baris tabel HTML).

### Ringkasan Operasi Array

| Method | Hasil | Contoh di project |
|---|---|---|
| `.find()` | 1 elemen atau `undefined` | cari tarif by jenis — `lib/billing.ts:32` |
| `.filter()` | array baru (menyaring) | riwayat pelanggan — `lib/billing.ts:162` |
| `.map()` | array baru (mengubah) | render tabel — `app/admin/page.tsx:243` |
| `.some()` | boolean | cek sudah bayar — `lib/billing.ts:186` |
| `.reduce()` | 1 nilai | total tunggakan — `app/pelanggan/page.tsx:177` |

---

## 3. IF (Percabangan / Kondisi)

`if` = jalankan kode hanya kalau kondisi bernilai `true`.

### If sederhana — validasi input

`lib/format.ts:67-70`:

```typescript
export function namaBulan(bulan: number): string {
  if (bulan < 1 || bulan > 12) return "";   // di luar 1-12 → return kosong
  return NAMA_BULAN[bulan - 1];
}
```

### If-else (ternary) — dua kemungkinan

`lib/billing.ts:63-66`:

```typescript
export function hitungJumlahPakai(meterAwal: number, meterAkhir: number): number {
  const selisih = meterAkhir - meterAwal;
  return selisih > 0 ? selisih : 0;   // positif → pakai selisih, selain itu → 0
}
```

> **Kenapa begini?** Kalau petugas salah input (meter akhir < meter awal),
> hasilnya negatif → tagihan bisa minus. Jadi dipaksa `0`.
> Ini namanya **defensive programming**.

### If dengan null-check (paling sering di React)

`app/pelanggan/page.tsx:156-161`:

```typescript
function cekLunas(p: PemakaianItem): boolean {
  if (!riwayat) return false;   // riwayat belum dimuat → langsung false
  return riwayat.pembayaran.some(
    (b) => b.bulan === p.bulan && b.tahun === p.tahun,
  );
}
```

### If bertingkat (nested if) — validasi bertahap

`app/api/pelanggan/riwayat/route.js:54-63`:

```javascript
if (!noKontrolRaw) return ResponseUtil.badRequest('Parameter no_kontrol wajib diisi');

const noKontrol = Number(noKontrolRaw);
if (!Number.isInteger(noKontrol) || noKontrol <= 0) {
  return ResponseUtil.badRequest('Parameter no_kontrol harus berupa angka positif');
}

// Pelanggan hanya boleh lihat data miliknya sendiri
if (auth.user.role === 'pelanggan' && auth.user.no_kontrol !== noKontrol) {
  return ResponseUtil.forbidden('Akses ditolak: bukan data Anda');
}
```

**Validasi 3 lapis:** (1) parameter ada? (2) angka positif? (3) user punya akses?

### Optional chaining (`?.` & `??`) — cara singkat untuk if

`lib/billing.ts:103-118`:

```typescript
const biayaBeban = tarif?.biayaBeban ?? 0;   // tarif undefined → pakai 0
const biayaPemakaian = tarif ? hitungBiayaPemakaian(jumlahPakai, tarif) : 0;
```

- `tarif?.biayaBeban` = "kalau `tarif` ada, ambil `biayaBeban`; kalau `undefined` → `undefined`"
- `?? 0` = "kalau hasilnya `undefined`/`null`, ganti dengan `0`"
- `tarif ? A : B` = ternary if

---

## 4. LOOP (Perulangan)

### For...of — iterasi array elemen demi elemen

`app/api/pelanggan/riwayat/route.js:14-32`:

```javascript
function hitungRingkasan(daftarPemakaian, daftarPembayaran) {
  let totalPemakaian = 0;
  let totalTagihan = 0;

  for (const item of daftarPemakaian) {          // ulangi untuk SETIAP pemakaian
    totalPemakaian += BillingUtil.toNumber(item.jumlah_pakai);
    totalTagihan += BillingUtil.toNumber(item.biaya_beban_pemakaian)
                  + BillingUtil.toNumber(item.biaya_pemakaian);
  }

  let totalDibayar = 0;
  for (const item of daftarPembayaran) {          // ulangi untuk SETIAP pembayaran
    totalDibayar += BillingUtil.toNumber(item.biaya_total);
  }

  return {
    total_periode: daftarPemakaian.length,
    total_pemakaian_kwh: totalPemakaian,
    total_tagihan: totalTagihan,
    total_dibayar: totalDibayar,
    jumlah_transaksi: daftarPembayaran.length,
  };
}
```

**Cara baca:** "Untuk setiap `item` di dalam `daftarPemakaian`, tambahkan
`jumlah_pakai` ke `totalPemakaian`."

### For klasik (counter-based) — kalau butuh index

```typescript
for (let i = 0; i < NAMA_BULAN.length; i++) {
  console.log(i, NAMA_BULAN[i]);
}
```

- `let i = 0` → mulai dari index 0
- `i < NAMA_BULAN.length` → selama i kurang dari panjang array
- `i++` → tambah 1 tiap iterasi

### While — selama kondisi true

Dipakai kalau **jumlah iterasi tidak diketahui di awal**:

```typescript
let saldo = 100000;
let bulan = 0;
while (saldo >= 1445) {      // selama saldo masih cukup bayar 1 kWh
  saldo -= 1445;
  bulan += 1;
}
console.log(`Bisa bertahan ${bulan} bulan`);
```

### Map vs For — kapan pakai mana?

| | `for...of` | `.map()` |
|---|---|---|
| **Hasil** | Tidak return apa-apa | Return array **baru** |
| **Pakai saat** | Menghitung/mengakumulasi | Mengubah bentuk data → tampilan |
| **Contoh project** | `hitungRingkasan()` | Tabel admin |

---

## 5. DEBUGGING

Debugging = proses **mencari dan memperbaiki bug** (kesalahan) di kode.

### Jenis-jenis error

| Jenis | Penjelasan | Contoh |
|---|---|---|
| **Runtime Error** | Crash saat dijalankan | `Cannot read property 'nama' of undefined` |
| **Logic Error** | Jalan tapi hasil salah | tagihan minus karena meter terbalik |
| **Type Error** | Ditangkap TypeScript **sebelum** jalan | isi `string` ke parameter `number` |

**Pencegahan di project ini:**
- Runtime error → null-check: `if (!riwayat) return false;`
- Logic error → `selisih > 0 ? selisih : 0` di `lib/billing.ts:65`
- Type error → TypeScript menangkap otomatis saat `npm run build` / save

### Teknik debugging yang dipakai di project

#### a) Try-Catch — menangkap error supaya app tidak crash

`app/api/admin/ringkasan/route.js:17-89`:

```javascript
export async function GET(req) {
  try {
    // ... semua logika query database
    return ResponseUtil.success({...}, 'Ringkasan berhasil diambil');
  } catch (e) {
    console.error('[GET /api/admin/ringkasan]', e);   // detail error → terminal
    return ResponseUtil.error('Terjadi kesalahan', 500); // pesan ramah → user
  }
}
```

Kalau ada error di `try`, execution **lompat** ke `catch`.

#### b) Console logging

`console.error(...)` / `console.log(...)` = cetak nilai ke terminal untuk cek isi variabel.

#### c) Null/undefined check — pertahanan bertingkat

`lib/store.tsx:98-109`:

```typescript
function bacaSesiLokal(): Sesi | null {
  if (typeof window === "undefined") return null;    // guard 1: server-side?
  try {
    const raw = window.localStorage.getItem(KUNCI_SESI);
    if (!raw) return null;                            // guard 2: localStorage kosong?
    const parsed: SesiTersimpan = JSON.parse(raw);
    if (!parsed.peran || !parsed.nama) return null;   // guard 3: data tidak lengkap?
    return parsed as Sesi;
  } catch {
    return null;                                      // JSON gagal → return null
  }
}
```

3 lapis pertahanan + try-catch = **debugging mindset**:
semua kemungkinan gagal dihadapi, error tidak akan crash aplikasi.

#### d) Input validation — cek SEBELUM diproses

`lib/format.ts:83-89`:

```typescript
export function formatTanggal(iso: string): string {
  const pola = /^(\d{4})-(\d{2})-(\d{2})$/;   // format YYYY-MM-DD
  const cocok = pola.exec(iso.trim());
  if (!cocok) return "";                        // format salah → tidak crash
  const [, tahun, bulan, tanggal] = cocok;
  return `${Number(tanggal)} ${namaBulan(Number(bulan))} ${tahun}`;
}
```

### Alur debugging (jawab begini kalau guru nanya "kalau ada bug ngapain?")

1. **Baca pesan error** — biasanya menyebut file dan baris
2. **Cetak nilai mencurigakan** — `console.log()` untuk cek isi variabel
3. **Cek tipe data** — `typeof nilai` — sering bug karena string vs number
4. **Cek null/undefined** — data sudah dimuat? API sudah return?
5. **Test fungsi kecil** — pecah masalah besar jadi fungsi kecil

---

## RINGKASAN — Hafalin ini buat wawancara

| Konsep | 1 kalimat | Lokasi di project |
|---|---|---|
| **Tipe data** | Jenis nilai: `number`, `string`, `boolean`, `interface` | `lib/types.ts` |
| **Array** | Kumpulan nilai berurutan, index mulai 0 | `lib/mock-data.ts`, `lib/format.ts` |
| **`.find()`** | Cari 1 elemen dari array | `lib/billing.ts:32` |
| **`.filter()`** | Saring array → array baru | `lib/billing.ts:162` |
| **`.map()`** | Ubah setiap elemen → array baru | `app/admin/page.tsx:243` |
| **`.reduce()`** | Array → 1 nilai (jumlah) | `app/pelanggan/page.tsx:177` |
| **`if`** | Jalankan kode kalau kondisi true | `lib/format.ts:68` |
| **`for...of`** | Ulangi untuk setiap elemen array | `app/api/pelanggan/riwayat/route.js:17` |
| **`while`** | Ulangi selama kondisi true | loop klasik |
| **Try-catch** | Tangkap error supaya app tidak crash | `app/api/admin/ringkasan/route.js:17` |
| **Debugging** | Cek error → print nilai → cek tipe → cek null → test kecil | seluruh project |

### Jawaban siap pakai

**Q: Kenapa pakai TypeScript?**
> "Type safety — error ketangkap sebelum program jalan, jadi lebih sedikit bug production."

**Q: Kenapa pakai try-catch?**
> "Supaya error di server tidak crash aplikasi dan user tetap dapat pesan yang jelas."

**Q: Kenapa `noTlp` string bukan number?**
> "Biar nol di depan nomor telepon tidak hilang."

**Q: Bedanya `.find()` dan `.filter()`?**
> "`.find()` return satu elemen pertama yang cocok, `.filter()` return semua elemen yang cocok sebagai array baru."
