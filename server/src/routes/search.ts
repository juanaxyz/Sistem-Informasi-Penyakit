import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { searchDiseases } from '../repositories/searchRepo';

/**
 * Handler pencarian penyakit berdasarkan nama/ringkasan (LIKE case-insensitive).
 * Dipakai oleh `searchRouter` di bawah untuk GET /api/search?q=.
 */
export const searchDiseasesHandler = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (!q) {
    res.json([]);
    return;
  }

  res.json(await searchDiseases(q));
});

// GET /api/search?q=...
export const searchRouter = Router();
searchRouter.get('/', searchDiseasesHandler);
