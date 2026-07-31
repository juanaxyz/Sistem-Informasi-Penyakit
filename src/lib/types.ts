/**
 * Tipe data respons API yang dipakai bersama oleh semua hooks.
 *
 * Nama field mengikuti kolom tabel di `context/DATABASE.md` dan SELECT yang
 * benar-benar dikirim server (`server/src/routes/*.ts`) — jangan diterjemahkan.
 */

/** Satu baris hasil daftar/pencarian penyakit (endpoint `/diseases`, `/search`). */
export type Disease = {
  id: number;
  nama: string;
  deskripsi?: string;
  tingkat_urgensi?: string;
};

/** Detail lengkap satu penyakit (hasil `GET /api/diseases/:id`). */
export type DiseaseDetail = {
  id: number;
  id_sistem_tubuh: number;
  nama: string;
  slug: string;
  deskripsi?: string | null;
  gejala?: string | null;
  penyebab?: string | null;
  pengobatan?: string | null;
  pencegahan?: string | null;
  komplikasi?: string | null;
  kapan_harus_ke_dokter?: string | null;
  tingkat_urgensi?: string;
};

/** Satu baris dari tabel `sistem_tubuh` (hasil `GET /api/body-systems`). */
export type BodySystem = {
  id: number;
  nama: string;
  slug: string;
  deskripsi?: string | null;
};

/** Satu baris dari tabel `bagian_tubuh` (hasil `GET /api/body-parts/filter`). */
export type BodyPartRecord = {
  id: number;
  nama: string;
  slug: string;
  tampilan: 'depan' | 'belakang';
};
