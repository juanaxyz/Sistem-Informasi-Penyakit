import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/httpError';

/**
 * Middleware error terakhir (harus 4 argumen agar Express mengenalinya).
 * Menyeragamkan semua error menjadi JSON `{ error: { message } }`.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }

  console.error('[api] unexpected error:', err);

  const message =
    process.env.NODE_ENV === 'production'
      ? 'Terjadi kesalahan internal pada server.'
      : err instanceof Error
        ? err.message
        : 'Terjadi kesalahan internal pada server.';

  res.status(500).json({ error: { message } });
};
