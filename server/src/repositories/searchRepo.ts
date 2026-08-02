import { query } from '../config/dbClient';
import type { DiseaseSummaryRow } from './types';

/**
 * Escape karakter wildcard LIKE (`%`, `_`, `\`) agar input user
 * dicari sebagai teks literal, bukan sebagai pola.
 */
const escapeLike = (input: string): string => input.replace(/[\\%_]/g, '\\$&');

/**
 * Cari penyakit berdasarkan `nama`/`ringkasan` (ILIKE case-insensitive),
 * maksimal 50 hasil. Pola LIKE di awal string dipercepat oleh
 * GIN index pg_trgm (lihat migration 005).
 */
export const searchDiseases = async (q: string): Promise<DiseaseSummaryRow[]> => {
  const { rows } = await query<DiseaseSummaryRow>(
    `SELECT id, nama, ringkasan, tingkat_urgensi
     FROM penyakit
     WHERE nama ILIKE '%' || $1 || '%' ESCAPE '\\'
        OR ringkasan ILIKE '%' || $1 || '%' ESCAPE '\\'
     ORDER BY nama
     LIMIT 50`,
    [escapeLike(q)]
  );
  return rows;
};
