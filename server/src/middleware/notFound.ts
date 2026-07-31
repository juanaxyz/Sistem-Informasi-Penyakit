import type { RequestHandler } from 'express';

/** Fallback 404 untuk path `/api/*` yang tidak terdaftar. */
export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { message: 'Endpoint tidak ditemukan.' } });
};
