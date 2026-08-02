import { query } from '../config/dbClient';
import type { BodySystemRow, DiseaseSummaryRow } from './types';

/** Ambil semua sistem tubuh (urut berdasarkan id). */
export const listBodySystems = async (): Promise<BodySystemRow[]> => {
  const { rows } = await query<BodySystemRow>(
    'SELECT id, nama, slug, deskripsi FROM sistem_tubuh ORDER BY id'
  );
  return rows;
};

/** Ambil ringkasan penyakit milik satu sistem tubuh (urut berdasarkan nama). */
export const listDiseasesBySystem = async (systemId: number): Promise<DiseaseSummaryRow[]> => {
  const { rows } = await query<DiseaseSummaryRow>(
    `SELECT d.id, d.nama, d.ringkasan, d.tingkat_urgensi
     FROM penyakit d
     WHERE d.id_sistem_tubuh = $1
     ORDER BY d.nama`,
    [systemId]
  );
  return rows;
};
