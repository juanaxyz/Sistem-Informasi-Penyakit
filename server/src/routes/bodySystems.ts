import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { parseIdParam } from '../utils/params';
import { listBodySystems, listDiseasesBySystem } from '../repositories/bodySystemsRepo';

export const bodySystemsRouter = Router();

// GET /api/body-systems — semua sistem tubuh
bodySystemsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listBodySystems());
  })
);

// GET /api/body-systems/:systemId/diseases — penyakit dalam satu sistem tubuh
bodySystemsRouter.get(
  '/:systemId/diseases',
  asyncHandler(async (req, res) => {
    const systemId = parseIdParam(req.params.systemId, 'ID sistem tubuh');

    res.json(await listDiseasesBySystem(systemId));
  })
);
