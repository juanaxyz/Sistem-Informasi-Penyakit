import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { parseIdParam } from '../utils/params';
import { getDiseaseDetail, listDiseasesByBodyPart } from '../repositories/diseasesRepo';

export const diseasesRouter = Router();

// GET /api/diseases/by-body-part/:bodyPartId — penyakit terkait satu bagian tubuh
diseasesRouter.get(
  '/by-body-part/:bodyPartId',
  asyncHandler(async (req, res) => {
    const bodyPartId = parseIdParam(req.params.bodyPartId, 'ID bagian tubuh');

    res.json(await listDiseasesByBodyPart(bodyPartId));
  })
);

// GET /api/diseases/:id — detail satu penyakit (null bila tidak ditemukan)
diseasesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id, 'ID penyakit');

    res.json(await getDiseaseDetail(id));
  })
);
