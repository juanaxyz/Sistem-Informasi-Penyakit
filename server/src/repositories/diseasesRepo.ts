import { query } from '../config/dbClient';
import type {
  BodyPartRow,
  BodySystemRow,
  DiseaseDetailResult,
  DiseaseRow,
  DiseaseSummaryRow,
  KontenRow,
  ReferensiRow,
} from './types';

/** Ambil ringkasan penyakit terkait satu bagian tubuh (urut berdasarkan nama). */
export const listDiseasesByBodyPart = async (bodyPartId: number): Promise<DiseaseSummaryRow[]> => {
  const { rows } = await query<DiseaseSummaryRow>(
    `SELECT d.id, d.nama, d.ringkasan, d.tingkat_urgensi
     FROM penyakit d
     JOIN penyakit_bagian_tubuh pbt ON pbt.id_penyakit = d.id
     WHERE pbt.id_bagian_tubuh = $1
     ORDER BY d.nama`,
    [bodyPartId]
  );
  return rows;
};

/**
 * Detail satu penyakit lengkap: `{ ...penyakit, sistem_tubuh, konten,
 * bagian_tubuh, referensi }`. Mengembalikan null bila penyakit tidak ditemukan.
 * Query dijalankan paralel (Promise.all) seperti implementasi route sebelumnya.
 */
export const getDiseaseDetail = async (id: number): Promise<DiseaseDetailResult | null> => {
  const [diseaseRes, sistemRes, kontenRes, bagianRes, referensiRes] = await Promise.all([
    query<DiseaseRow>(
      `SELECT id, id_sistem_tubuh, nama, slug, ringkasan, tingkat_urgensi
       FROM penyakit
       WHERE id = $1`,
      [id]
    ),
    query<BodySystemRow>(
      `SELECT s.id, s.nama, s.slug, s.deskripsi
       FROM sistem_tubuh s
       JOIN penyakit p ON p.id_sistem_tubuh = s.id
       WHERE p.id = $1`,
      [id]
    ),
    query<KontenRow>(
      `SELECT id, judul, slug, isi, urutan
       FROM konten_penyakit
       WHERE id_penyakit = $1 AND tampilkan = true
       ORDER BY urutan`,
      [id]
    ),
    query<BodyPartRow>(
      `SELECT b.id, b.nama, b.slug, b.tampilan
       FROM bagian_tubuh b
       JOIN penyakit_bagian_tubuh pbt ON pbt.id_bagian_tubuh = b.id
       WHERE pbt.id_penyakit = $1
       ORDER BY b.id`,
      [id]
    ),
    query<ReferensiRow>(
      `SELECT id, judul, sumber, url, tahun
       FROM referensi
       WHERE id_penyakit = $1
       ORDER BY id`,
      [id]
    ),
  ]);

  const disease = diseaseRes.rows[0];
  if (!disease) {
    return null;
  }

  return {
    ...disease,
    sistem_tubuh: sistemRes.rows[0] ?? null,
    konten: kontenRes.rows,
    bagian_tubuh: bagianRes.rows,
    referensi: referensiRes.rows,
  };
};
