import { Router } from 'express';
import { query } from '../config/dbClient';
import { asyncHandler } from '../utils/asyncHandler';

export const bodyPartsRouter = Router();

const COLUMNS = 'id, nama, slug, tampilan';

// GET /api/body-parts — semua bagian tubuh
bodyPartsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await query(`SELECT ${COLUMNS} FROM bagian_tubuh ORDER BY id`);
    res.json(rows);
  })
);

// GET /api/body-parts/filter?tampilan=depan — filter opsional (depan/belakang)
bodyPartsRouter.get(
  '/filter',
  asyncHandler(async (req, res) => {
    const tampilan =
      typeof req.query.tampilan === 'string' && req.query.tampilan !== '' ? req.query.tampilan : null;

    const { rows } = await query(
      `SELECT ${COLUMNS}
       FROM bagian_tubuh
       WHERE ($1::text IS NULL OR tampilan = $1)
       ORDER BY id`,
      [tampilan]
    );
    res.json(rows);
  })
);
