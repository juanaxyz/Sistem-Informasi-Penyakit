import { Router } from 'express';
import { query } from '../config/dbClient';
import { asyncHandler } from '../utils/asyncHandler';
import { parseIdParam } from '../utils/params';

export const bodySystemsRouter = Router();

// GET /api/body-systems — semua sistem tubuh
bodySystemsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      'SELECT id, nama, slug, deskripsi FROM sistem_tubuh ORDER BY id'
    );
    res.json(rows);
  })
);

// GET /api/body-systems/:systemId/diseases — penyakit dalam satu sistem tubuh
bodySystemsRouter.get(
  '/:systemId/diseases',
  asyncHandler(async (req, res) => {
    const systemId = parseIdParam(req.params.systemId, 'ID sistem tubuh');

    const { rows } = await query(
      `SELECT d.id, d.nama, d.deskripsi, d.tingkat_urgensi
       FROM penyakit d
       WHERE d.id_sistem_tubuh = $1
       ORDER BY d.nama`,
      [systemId]
    );
    res.json(rows);
  })
);
