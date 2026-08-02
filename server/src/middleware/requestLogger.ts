import type { RequestHandler } from 'express';

/**
 * Log satu baris per request (method, path, status, durasi) ke console.
 * Memakai event `finish` agar status code yang tercatat adalah status akhir
 * (setelah handler/errorHandler selesai mengirim respons).
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`;

    if (res.statusCode >= 400) {
      console.warn(line);
    } else {
      console.log(line);
    }
  });

  next();
};
