import { Router } from 'express';
import { query } from '../config/dbClient';
import { asyncHandler } from '../utils/asyncHandler';
import { parseIdParam } from '../utils/params';
import { searchDiseasesHandler } from './search';

export const diseasesRouter = Router();

// GET /api/diseases/by-body-part/:bodyPartId — penyakit terkait satu bagian tubuh
diseasesRouter.get(
  '/by-body-part/:bodyPartId',
  asyncHandler(async (req, res) => {
    const bodyPartId = parseIdParam(req.params.bodyPartId, 'ID bagian tubuh');

    const { rows } = await query(
      `SELECT d.id, d.nama, d.deskripsi, d.tingkat_urgensi
       FROM penyakit d
       JOIN penyakit_bagian_tubuh pbt ON pbt.id_penyakit = d.id
       WHERE pbt.id_bagian_tubuh = $1
       ORDER BY d.nama`,
      [bodyPartId]
    );
    res.json(rows);
  })
);

// Alias lama agar `/api/diseases/search` tetap berfungsi.
// Canonical-nya ada di `/api/search` (lihat routes/search.ts).
diseasesRouter.get('/search', searchDiseasesHandler);

// GET /api/diseases/:id — detail satu penyakit (null bila tidak ditemukan)
diseasesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseIdParam(req.params.id, 'ID penyakit');

    const { rows } = await query(
      `SELECT id, id_sistem_tubuh, nama, slug, deskripsi, gejala, penyebab,
              pengobatan, pencegahan, komplikasi, kapan_harus_ke_dokter, tingkat_urgensi
       FROM penyakit
       WHERE id = $1`,
      [id]
    );
    res.json(rows[0] ?? null);
  })
);
