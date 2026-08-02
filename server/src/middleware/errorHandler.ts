import type { ErrorRequestHandler } from 'express';
import { DatabaseError } from 'pg';
import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

/**
 * Pemetaan kode error PostgreSQL (SQLSTATE) ke respons yang aman untuk klien.
 * Dipetakan di sini (bukan di repository) agar semua route konsisten.
 */
const PG_ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  '22P02': { status: 400, message: 'ID tidak valid.' }, // invalid text representation
  '23503': { status: 400, message: 'Data terkait tidak ditemukan.' }, // foreign key violation
  '23505': { status: 400, message: 'Data sudah ada.' }, // unique violation
};

/**
 * Middleware error terakhir (harus 4 argumen agar Express mengenalinya).
 * Menyeragamkan semua error menjadi JSON `{ error: { message } }`.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }

  // Error dari driver `pg` (mis. parsing string menjadi integer → 22P02).
  if (
    err instanceof DatabaseError &&
    err.code &&
    Object.prototype.hasOwnProperty.call(PG_ERROR_RESPONSES, err.code)
  ) {
    const mapped = PG_ERROR_RESPONSES[err.code];
    res.status(mapped.status).json({ error: { message: mapped.message } });
    return;
  }

  console.error('[api] unexpected error:', err);

  const message = env.isProduction
    ? 'Terjadi kesalahan internal pada server.'
    : err instanceof Error
      ? err.message
      : 'Terjadi kesalahan internal pada server.';

  res.status(500).json({ error: { message } });
};
