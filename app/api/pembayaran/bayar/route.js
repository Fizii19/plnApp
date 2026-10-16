// app/api/pembayaran/bayar/route.js
const db = require('../../../../config/db');
const AuthUtil = require('../../../../utils/auth');
const ResponseUtil = require('../../../../utils/response');
const BillingUtil = require('../../../../utils/billing');

/**
 * POST /api/pembayaran/bayar
 * ──────────────────────────────────────────────────────────────────────────
 * Mencatat pembayaran untuk pemakaian yang SUDAH ADA di database.
 * Digunakan oleh petugas loket saat pelanggan membayar tagihan periode
 * yang pemakaiannya sudah dicatat sebelumnya oleh admin.
 *
 * Berbeda dengan /api/pembayaran/proses yang membuat pemakaian baru,
 * endpoint ini hanya INSERT ke tabel pembayaran.
 *
 * Body JSON:
 *   { id_pemakaian: number }
 *
 * Response (201):
 *   { success: true, data: { pembayaran, pemakaian, pelanggan, tarif, biaya_total, kembalian } }
 *
 * Error:
 *   400 — id_pemakaian tidak valid
 *   401 — token tidak ada / kadaluarsa
 *   403 — bukan staf
 *   404 — pemakaian tidak ditemukan
 *   409 — periode ini sudah dibayar
 *   500 — kesalahan server
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function POST(req) {
  // ── Auth: hanya staf (petugas/admin) yang boleh proses pembayaran ──────
  const auth = AuthUtil.authenticateStaff(req);
  if (!auth.isValid) return ResponseUtil.unauthorized(auth.error);

  let body;
  try {
    body = await req.json();
  } catch {
    return ResponseUtil.badRequest('Body request harus berupa JSON yang valid');
  }

  const idPemakaian = Number(body.id_pemakaian);
  if (!Number.isInteger(idPemakaian) || idPemakaian <= 0) {
    return ResponseUtil.badRequest('id_pemakaian wajib diisi berupa angka positif');
  }

  try {
    // ── 1. Ambil data pemakaian yang akan dibayar ────────────────────────
    const pemakaian = await db.queryOne(
      `SELECT pm.id_pemakaian, pm.no_kontrol, pm.tahun, pm.bulan,
              pm.meter_awal, pm.meter_akhir, pm.jumlah_pakai,
              pm.biaya_beban_pemakaian, pm.biaya_pemakaian
         FROM pemakaian pm
        WHERE pm.id_pemakaian = ?`,
      [idPemakaian],
    );

    if (!pemakaian) {
      return ResponseUtil.notFound('Data pemakaian tidak ditemukan');
    }

    // ── 2. Cek apakah periode ini SUDAH dibayar ──────────────────────────
    // Link langsung via id_pemakaian (paling akurat)
    const sudahBayarById = await db.queryOne(
      `SELECT id_pembayaran FROM pembayaran WHERE id_pemakaian = ?`,
      [idPemakaian],
    );

    if (sudahBayarById) {
      return ResponseUtil.error(
        `Pemakaian ini sudah dibayar (No. Bukti #${sudahBayarById.id_pembayaran})`,
        409,
      );
    }

    // ── 3. Ambil data pelanggan dan tarif ────────────────────────────────
    const pelanggan = await db.queryOne(
      `SELECT no_kontrol, nama_pelanggan, alamat_pelanggan, no_tlp_pelanggan, jenis_pelanggan
         FROM pelanggan
        WHERE no_kontrol = ?`,
      [pemakaian.no_kontrol],
    );

    if (!pelanggan) {
      return ResponseUtil.notFound('Data pelanggan tidak ditemukan');
    }

    const tarif = await db.queryOne(
      `SELECT id_tarif, jenis_pelanggan, biaya_beban, tarif_kwh
         FROM tarif
        WHERE jenis_pelanggan = ?
        ORDER BY id_tarif DESC
        LIMIT 1`,
      [pelanggan.jenis_pelanggan],
    );

    if (!tarif) {
      return ResponseUtil.badRequest(
        `Tarif untuk jenis "${pelanggan.jenis_pelanggan}" belum diatur`,
      );
    }

    // ── 4. Hitung total tagihan dari data pemakaian ──────────────────────
    const biayaBeban = BillingUtil.toNumber(pemakaian.biaya_beban_pemakaian);
    const biayaPemakaian = BillingUtil.toNumber(pemakaian.biaya_pemakaian);
    const biayaTotal = BillingUtil.hitungTotalTagihan(biayaBeban, biayaPemakaian);

    // ── 5. Jumlah bayar (default = biaya_total, bisa di-override) ────────
    const jumlahBayar = body.jumlah_bayar !== undefined && body.jumlah_bayar !== null
      ? Number(body.jumlah_bayar)
      : biayaTotal;

    if (!Number.isFinite(jumlahBayar) || jumlahBayar < 0) {
      return ResponseUtil.badRequest('jumlah_bayar harus berupa angka >= 0');
    }
    if (jumlahBayar < biayaTotal) {
      return ResponseUtil.badRequest(
        `Jumlah bayar (${jumlahBayar}) kurang dari total tagihan (${biayaTotal})`,
      );
    }

    // ── 6. INSERT pembayaran (atomic, sudah terhubung ke id_pemakaian) ────
    const pool = await db.getPool();
    const [hasil] = await pool.execute(
      `INSERT INTO pembayaran
         (id_tarif, no_kontrol, id_pemakaian, id_petugas, jumlah_bayar, biaya_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tarif.id_tarif,
        pemakaian.no_kontrol,
        idPemakaian,
        auth.user.id_petugas ?? 0,
        jumlahBayar,
        biayaTotal,
      ],
    );

    const idPembayaran = hasil.insertId;

    // ── 7. Ambil baris pembayaran yang baru dibuat untuk respons ─────────
    const pembayaranBaru = await db.queryOne(
      `SELECT id_pembayaran, id_pemakaian, no_kontrol, id_tarif, id_petugas,
              jumlah_bayar, biaya_total, tanggal_bayar
         FROM pembayaran
        WHERE id_pembayaran = ?`,
      [idPembayaran],
    );

    return ResponseUtil.success(
      {
        pembayaran: {
          ...pembayaranBaru,
          jumlah_bayar: BillingUtil.toNumber(pembayaranBaru.jumlah_bayar),
          biaya_total: BillingUtil.toNumber(pembayaranBaru.biaya_total),
        },
        pemakaian: {
          ...pemakaian,
          biaya_beban_pemakaian: biayaBeban,
          biaya_pemakaian: biayaPemakaian,
          biaya_total: biayaTotal,
        },
        pelanggan,
        tarif: {
          ...tarif,
          biaya_beban: BillingUtil.toNumber(tarif.biaya_beban),
          tarif_kwh: BillingUtil.toNumber(tarif.tarif_kwh),
        },
        biaya_total: biayaTotal,
        jumlah_bayar: jumlahBayar,
        kembalian: jumlahBayar - biayaTotal,
      },
      'Pembayaran berhasil dicatat',
      201,
    );
  } catch (e) {
    console.error('[POST /api/pembayaran/bayar]', e);
    return ResponseUtil.error('Terjadi kesalahan saat mencatat pembayaran', 500);
  }
}
