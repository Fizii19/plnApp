// utils/response.js
class ResponseUtil {
  /**
   * Response sukses
   * @param {any} [data=null]
   * @param {string} [message='Berhasil']
   * @param {number} [status=200]
   */
  static success(data = null, message = 'Berhasil', status = 200) {
    return Response.json({ success: true, message, data }, { status });
  }

  /**
   * Response gagal
   * @param {string} [message='Terjadi kesalahan']
   * @param {number} [status=400]
   * @param {any} [errors=null]
   */
  static error(message = 'Terjadi kesalahan', status = 400, errors = null) {
    const body = { success: false, message };
    if (errors) body.errors = errors;
    return Response.json(body, { status });
  }

  static unauthorized(message = 'Unauthorized') {
    return this.error(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return this.error(message, 403);
  }

  static notFound(message = 'Data tidak ditemukan') {
    return this.error(message, 404);
  }

  static badRequest(message = 'Data tidak valid', errors = null) {
    return this.error(message, 400, errors);
  }
}

module.exports = ResponseUtil;
