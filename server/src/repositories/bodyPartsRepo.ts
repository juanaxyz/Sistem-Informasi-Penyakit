import { query } from '../config/dbClient';
import type { BodyPartRow } from './types';

/**
 * Ambil daftar bagian tubuh, opsional difilter berdasarkan `tampilan`
 * ('depan' / 'belakang'). Bila `tampilan` kosong/null, semua bagian dikembalikan.
 */
export const listBodyParts = async (tampilan?: string | null): Promise<BodyPartRow[]> => {
  const { rows } = await query<BodyPartRow>(
    `SELECT id, nama, slug, tampilan
     FROM bagian_tubuh
     WHERE ($1::text IS NULL OR tampilan = $1)
     ORDER BY id`,
    [tampilan ?? null]
  );
  return rows;
};
