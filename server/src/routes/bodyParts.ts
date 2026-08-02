import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { listBodyParts } from '../repositories/bodyPartsRepo';

export const bodyPartsRouter = Router();

// GET /api/body-parts — semua bagian tubuh
bodyPartsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listBodyParts());
  })
);

// GET /api/body-parts/filter?tampilan=depan — filter opsional (depan/belakang)
bodyPartsRouter.get(
  '/filter',
  asyncHandler(async (req, res) => {
    const tampilan =
      typeof req.query.tampilan === 'string' && req.query.tampilan !== '' ? req.query.tampilan : null;

    res.json(await listBodyParts(tampilan));
  })
);
