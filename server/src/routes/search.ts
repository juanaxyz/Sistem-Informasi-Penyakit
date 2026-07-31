import { Router } from 'express';
import { query } from '../config/dbClient';
import { asyncHandler } from '../utils/asyncHandler';

const SEARCH_COLUMNS = 'id, nama, deskripsi, tingkat_urgensi';

/**
 * Escape karakter wildcard LIKE (`%`, `_`, `\`) agar input user
 * dicari sebagai teks literal, bukan sebagai pola.
 */
const escapeLike = (input: string): string => input.replace(/[\\%_]/g, '\\$&');

/** Handler pencarian penyakit berdasarkan nama/deskripsi (LIKE case-insensitive). */
export const searchDiseasesHandler = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (!q) {
    res.json([]);
    return;
  }

  const { rows } = await query(
    `SELECT ${SEARCH_COLUMNS}
     FROM penyakit
     WHERE nama ILIKE '%' || $1 || '%' ESCAPE '\\'
        OR deskripsi ILIKE '%' || $1 || '%' ESCAPE '\\'
        OR gejala ILIKE '%' || $1 || '%' ESCAPE '\\'
     ORDER BY nama
     LIMIT 50`,
    [escapeLike(q)]
  );
  res.json(rows);
});

// GET /api/search?q=...
export const searchRouter = Router();
searchRouter.get('/', searchDiseasesHandler);
