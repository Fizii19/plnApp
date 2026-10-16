// app/api/pembayaran/proses/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');
const BillingUtil = require('../../../../utils/billing');

/**
 * Mengambil data pelanggan beserta tarif yang berlaku.
 *
 * @param {number} noKontrol - Nomor kontrol pelanggan.
 * @returns {Promise<{pelanggan: Object|null, tarif: Object|null}>}
 *          Data pelanggan dan tarif yang berlaku untuk jenis pelanggannya.
 */
async function ambilPelangganDanTarif(noKontrol) {
  const pelanggan = await db.queryOne(
    `SELECT no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan
       FROM pelanggan
      WHERE no_kontrol = ?`,
    [noKontrol]
  );
  if (!pelanggan) return { pelanggan: null, tarif: null };

  const tarif = await db.queryOne(
    `SELECT id_tarif, jenis_pelanggan, biaya_beban, tarif_kwh
       FROM tarif
      WHERE jenis_pelanggan = ?
      ORDER BY id_tarif DESC
      LIMIT 1`,
    [pelanggan.jenis_pelanggan]
  );

  return { pelanggan, tarif };
}

/**
 * Menentukan meter awal periode baru.
 * Bila `meterAwal` tidak diisi, gunakan meter akhir pada pemakaian terakhir
 * pelanggan; bila pelanggan belum punya riwayat, mulai dari 0.
 *
 * @param {number} noKontrol - Nomor kontrol pelanggan.
 * @param {number|null} meterAwal - Nilai meter awal dari body request (opsional).
 * @returns {Promise<number>} Nilai meter awal yang dipakai.
 */
async function tentukanMeterAwal(noKontrol, meterAwal) {
  if (meterAwal !== null) return meterAwal;
  const terakhir = await db.queryOne(
    `SELECT meter_akhir FROM pemakaian
      WHERE no_kontrol = ?
      ORDER BY tahun DESC, bulan DESC
      LIMIT 1`,
    [noKontrol]
  );
  return terakhir ? terakhir.meter_akhir : 0;
}

/**
 * POST /api/pembayaran/proses
 * -----------------------------------------------------------------------------
 * Memproses pembayaran listrik: menghitung biaya pemakaian dari selisih meter,
 * menyimpan baris `pemakaian`, lalu mencatat transaksi `pembayaran`. Kedua
 * operasi dijalankan dalam satu transaksi database (atomic) sehingga tidak ada
 * data setengah tersimpan bila terjadi kegagalan.
 *
 * Body JSON:
 *   - no_kontrol   {number}  wajib  - Nomor kontrol pelanggan.
 *   - meter_akhir  {number}  wajib  - Pembacaan meter akhir periode ini.
 *   - tahun        {number}  opsional (default: tahun berjalan).
 *   - bulan        {number}  opsional (default: bulan berjalan, 1-12).
 *   - meter_awal   {number}  opsional (default: meter_akhir pemakaian terakhir).
 *   - jumlah_bayar {number}  opsional (default: sebesar biaya_total).
 *
 * Response (201):
 *   { success: true, message, data: { pelanggan, tarif, pemakaian, pembayaran } }
 *
 * @param {Request} req - Objek request Next.js (App Router).
 * @returns {Promise<Response>} Response JSON hasil transaksi pembayaran.
 * @throws {Error} Diteruskan ke blok catch dan dikembalikan sebagai HTTP 500.
 */
export async function POST(req) {
  const auth = AuthUtil.authenticate(req);
  if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);

  let body;
  try {
    body = await req.json();
  } catch {
    return ResponseUtil.badRequest('Body request harus berupa JSON yang valid');
  }

  const sekarang = new Date();
  const noKontrol = Number(body.no_kontrol);
  const meterAkhir = Number(body.meter_akhir);
  const tahun = body.tahun !== undefined && body.tahun !== '' ? parseInt(body.tahun) : sekarang.getFullYear();
  const bulan = body.bulan !== undefined && body.bulan !== '' ? parseInt(body.bulan) : sekarang.getMonth() + 1;

  if (!Number.isInteger(noKontrol) || noKontrol <= 0) {
    return ResponseUtil.badRequest('no_kontrol wajib diisi berupa angka positif');
  }
  if (!Number.isInteger(meterAkhir) || meterAkhir < 0) {
    return ResponseUtil.badRequest('meter_akhir wajib diisi berupa angka >= 0');
  }
  const errorPeriode = BillingUtil.validasiPeriode(bulan, tahun);
  if (errorPeriode) return ResponseUtil.badRequest(errorPeriode);

  let meterAwal = null;
  if (body.meter_awal !== undefined && body.meter_awal !== null && body.meter_awal !== '') {
    meterAwal = Number(body.meter_awal);
    if (!Number.isInteger(meterAwal) || meterAwal < 0) {
      return ResponseUtil.badRequest('meter_awal harus berupa angka >= 0');
    }
  }

  try {
    const { pelanggan, tarif } = await ambilPelangganDanTarif(noKontrol);
    if (!pelanggan) return ResponseUtil.notFound('Data pelanggan tidak ditemukan');
    if (!tarif) {
      return ResponseUtil.badRequest(
        `Tarif untuk jenis pelanggan "${pelanggan.jenis_pelanggan}" belum diatur`
      );
    }

    const sudahTercatat = await db.queryOne(
      `SELECT id_pemakaian FROM pemakaian
        WHERE no_kontrol = ? AND tahun = ? AND bulan = ?`,
      [noKontrol, tahun, bulan]
    );
    if (sudahTercatat) {
      return ResponseUtil.error(
        `Pemakaian pelanggan untuk periode ${bulan}/${tahun} sudah pernah tercatat`,
        409
      );
    }

    meterAwal = await tentukanMeterAwal(noKontrol, meterAwal);
    if (meterAkhir < meterAwal) {
      return ResponseUtil.badRequest('meter_akhir tidak boleh lebih kecil dari meter_awal');
    }

    const rincian = BillingUtil.hitungRincianTagihan(
      tarif.biaya_beban,
      tarif.tarif_kwh,
      meterAwal,
      meterAkhir
    );

    const jumlahBayar =
      body.jumlah_bayar !== undefined && body.jumlah_bayar !== null && body.jumlah_bayar !== ''
        ? Number(body.jumlah_bayar)
        : rincian.biaya_total;

    if (!Number.isFinite(jumlahBayar) || jumlahBayar < 0) {
      return ResponseUtil.badRequest('jumlah_bayar harus berupa angka >= 0');
    }
    if (jumlahBayar < rincian.biaya_total) {
      return ResponseUtil.badRequest('jumlah_bayar kurang dari total tagihan');
    }

    const pool = await db.getPool();
    const conn = await pool.getConnection();
    let idPemakaian;
    let idPembayaran;
    try {
      await conn.beginTransaction();

      const [hasilPemakaian] = await conn.execute(
        `INSERT INTO pemakaian
           (no_kontrol, tahun, bulan, meter_awal, meter_akhir, jumlah_pakai,
            biaya_beban_pemakaian, biaya_pemakaian)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          noKontrol,
          tahun,
          bulan,
          meterAwal,
          meterAkhir,
          rincian.jumlah_pakai,
          rincian.biaya_beban,
          rincian.biaya_pemakaian,
        ]
      );
      idPemakaian = hasilPemakaian.insertId;

      const [hasilPembayaran] = await conn.execute(
        `INSERT INTO pembayaran
           (id_tarif, no_kontrol, id_pemakaian, id_petugas, jumlah_bayar, biaya_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tarif.id_tarif, noKontrol, idPemakaian, auth.user.id_petugas, jumlahBayar, rincian.biaya_total]
      );
      idPembayaran = hasilPembayaran.insertId;

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const pembayaran = await db.queryOne(
      `SELECT p.id_pembayaran, p.no_kontrol, p.id_tarif, p.id_petugas, p.jumlah_bayar,
              p.biaya_total, p.tanggal_bayar
         FROM pembayaran p
        WHERE p.id_pembayaran = ?`,
      [idPembayaran]
    );

    return ResponseUtil.success(
      {
        pelanggan,
        tarif,
        pemakaian: {
          id_pemakaian: idPemakaian,
          no_kontrol: noKontrol,
          tahun,
          bulan,
          meter_awal: meterAwal,
          meter_akhir: meterAkhir,
          jumlah_pakai: rincian.jumlah_pakai,
          biaya_beban_pemakaian: rincian.biaya_beban,
          biaya_pemakaian: rincian.biaya_pemakaian,
        },
        pembayaran,
        biaya_total: rincian.biaya_total,
        jumlah_bayar: jumlahBayar,
        kembalian: jumlahBayar - rincian.biaya_total,
      },
      'Pembayaran berhasil diproses',
      201
    );
  } catch (e) {
    console.error(e);
    return ResponseUtil.error('Terjadi kesalahan saat memproses pembayaran', 500);
  }
}
