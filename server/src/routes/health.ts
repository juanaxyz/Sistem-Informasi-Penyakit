import { Router } from 'express';
import { pool } from '../config/database';

export const healthRouter = Router();

/**
 * GET /api/health — cek ketersediaan API dan koneksi database.
 *
 * Sengaja memakai try/catch manual (bukan asyncHandler) agar kegagalan
 * database TIDAK jatuh ke error handler, melainkan respons 503 yang jelas.
 */
healthRouter.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'error', database: 'down' });
  }
});
