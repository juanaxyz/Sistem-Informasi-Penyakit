/**
 * Tipe baris hasil query PostgreSQL (row interface) yang dipakai
 * bersama oleh semua repository. Kolom mengikuti skema Indonesia aktual
 * (lihat context/DATABASE.md) — JANGAN mengubah kontrak respons API.
 */

/** Baris tabel `bagian_tubuh` (ringkas, tanpa kolom timestamp). */
export interface BodyPartRow {
  id: number;
  nama: string;
  slug: string;
  tampilan: string;
}

/** Baris tabel `sistem_tubuh` (ringkas). */
export interface BodySystemRow {
  id: number;
  nama: string;
  slug: string;
  deskripsi: string | null;
}

/** Ringkasan penyakit untuk daftar (search / by body part / by system). */
export interface DiseaseSummaryRow {
  id: number;
  nama: string;
  ringkasan: string | null;
  tingkat_urgensi: string;
}

/** Baris tabel `penyakit` (detail). */
export interface DiseaseRow {
  id: number;
  id_sistem_tubuh: number;
  nama: string;
  slug: string;
  ringkasan: string | null;
  tingkat_urgensi: string;
}

/** Baris tabel `konten_penyakit` (hanya konten yang tampil). */
export interface KontenRow {
  id: number;
  judul: string;
  slug: string;
  isi: string;
  urutan: number;
}

/** Baris tabel `referensi`. */
export interface ReferensiRow {
  id: number;
  judul: string;
  sumber: string | null;
  url: string | null;
  tahun: number | null;
}

/** Baris tabel `gambar_konten`. */
export interface GambarKontenRow {
  id: number;
  id_konten: number;
  url_gambar: string;
  caption: string | null;
  urutan: number;
}

/** Blok konten edukasi beserta gambarnya. */
export interface KontenRowWithImages extends KontenRow {
  gambar_konten: GambarKontenRow[];
}

/**
 * Shape detail penyakit seperti yang dikembalikan endpoint
 * GET /api/diseases/:id saat ini — persis, tidak diubah.
 */
export interface DiseaseDetailResult extends DiseaseRow {
  sistem_tubuh: BodySystemRow | null;
  konten: KontenRowWithImages[];
  bagian_tubuh: BodyPartRow[];
  referensi: ReferensiRow[];
}
