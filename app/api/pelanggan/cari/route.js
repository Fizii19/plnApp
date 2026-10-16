// app/api/pelanggan/cari/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');
const BillingUtil = require('../../../../utils/billing');

/**
 * GET /api/pelanggan/cari
 * -----------------------------------------------------------------------------
 * Mencari data pelanggan berdasarkan nomor kontrol, sekaligus mengambil
 * pemakaian terakhir beserta rincian biayanya secara otomatis. Dipakai oleh
 * petugas loket untuk mengisi form pembayaran tanpa input manual.
 *
 * Query string:
 *   - no_kontrol {number} wajib - Nomor kontrol pelanggan.
 *
 * Response (200):
 *   {
 *     success: true,
 *     message: string,
 *     data: {
 *       pelanggan, tarif,
 *       pemakaian_terakhir, rincian_terakhir,
 *       meter_awal_berikutnya
 *     }
 *   }
 *
 * @param {Request} req - Objek request Next.js (App Router).
 * @returns {Promise<Response>} Response JSON berisi data pelanggan & pemakaian.
 * @throws {Error} Diteruskan ke blok catch dan dikembalikan sebagai HTTP 500.
 */
export async function GET(req) {
  try {
    const auth = AuthUtil.authenticate(req);
    if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);

    const { searchParams } = new URL(req.url);
    const noKontrolRaw = searchParams.get('no_kontrol');

    if (!noKontrolRaw) return ResponseUtil.badRequest('Parameter no_kontrol wajib diisi');
    const noKontrol = Number(noKontrolRaw);
    if (!Number.isInteger(noKontrol) || noKontrol <= 0) {
      return ResponseUtil.badRequest('Parameter no_kontrol harus berupa angka positif');
    }

    const pelanggan = await db.queryOne(
      `SELECT no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan
         FROM pelanggan
        WHERE no_kontrol = ?`,
      [noKontrol]
    );
    if (!pelanggan) return ResponseUtil.notFound('Data pelanggan tidak ditemukan');

    const tarif = await db.queryOne(
      `SELECT id_tarif, jenis_pelanggan, biaya_beban, tarif_kwh
         FROM tarif
        WHERE jenis_pelanggan = ?
        ORDER BY id_tarif DESC
        LIMIT 1`,
      [pelanggan.jenis_pelanggan]
    );

    const pemakaianTerakhir = await db.queryOne(
      `SELECT id_pemakaian, no_kontrol, tahun, bulan, meter_awal, meter_akhir,
              jumlah_pakai, biaya_beban_pemakaian, biaya_pemakaian
         FROM pemakaian
        WHERE no_kontrol = ?
        ORDER BY tahun DESC, bulan DESC
        LIMIT 1`,
      [noKontrol]
    );

    let rincianTerakhir = null;
    if (pemakaianTerakhir) {
      const biayaBeban = BillingUtil.toNumber(pemakaianTerakhir.biaya_beban_pemakaian);
      const biayaPemakaian = BillingUtil.toNumber(pemakaianTerakhir.biaya_pemakaian);
      rincianTerakhir = {
        jumlah_pakai: pemakaianTerakhir.jumlah_pakai,
        biaya_beban: biayaBeban,
        biaya_pemakaian: biayaPemakaian,
        biaya_total: BillingUtil.hitungTotalTagihan(biayaBeban, biayaPemakaian),
      };
    }

    return ResponseUtil.success(
      {
        pelanggan,
        tarif: tarif
          ? {
              id_tarif: tarif.id_tarif,
              jenis_pelanggan: tarif.jenis_pelanggan,
              biaya_beban: BillingUtil.toNumber(tarif.biaya_beban),
              tarif_kwh: BillingUtil.toNumber(tarif.tarif_kwh),
            }
          : null,
        pemakaian_terakhir: pemakaianTerakhir,
        rincian_terakhir: rincianTerakhir,
        meter_awal_berikutnya: pemakaianTerakhir ? pemakaianTerakhir.meter_akhir : 0,
      },
      'Data pelanggan ditemukan'
    );
  } catch (e) {
    console.error(e);
    return ResponseUtil.error('Terjadi kesalahan saat mencari data pelanggan', 500);
  }
}
