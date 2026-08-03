/**
 * Tipe data bersama yang dipakai oleh semua hooks.
 *
 * Nama field mengikuti kolom tabel di `context/DATABASE.md` dan SELECT yang
 * benar-benar dikirim ke Supabase (`src/hooks/*.ts`) — jangan diterjemahkan.
 */

/** Satu baris hasil daftar/pencarian penyakit (tabel `penyakit`). */
export type Disease = {
  id: number;
  nama: string;
  ringkasan?: string | null; // kolom TEXT di DB bisa bernilai null
  tingkat_urgensi?: string;
};

/** Satu baris dari tabel `sistem_tubuh`. */
export type BodySystem = {
  id: number;
  nama: string;
  slug: string;
  deskripsi?: string | null;
};

/** Satu baris dari tabel `bagian_tubuh`. */
export type BodyPartRecord = {
  id: number;
  nama: string;
  slug: string;
  tampilan: 'depan' | 'belakang';
};

/** Satu referensi/sumber (`referensi`) di dalam detail penyakit. */
export type Reference = {
  id: number;
  judul: string;
  sumber?: string | null;
  url?: string | null;
  tahun?: number | null;
};

/** Satu blok konten edukasi (`konten_penyakit`) di dalam detail penyakit. */
export type DiseaseContent = {
  id: number;
  judul: string;
  slug: string;
  isi: string;
  urutan: number;
  gambar_konten?: {
    id: number;
    url_gambar: string;
    caption?: string | null;
    urutan: number;
  }[];
};

/** Detail lengkap satu penyakit (hasil `useDiseaseDetail`). */
export type DiseaseDetail = {
  id: number;
  id_sistem_tubuh: number;
  nama: string;
  slug: string;
  ringkasan?: string | null;
  tingkat_urgensi?: string;
  sistem_tubuh: BodySystem | null;
  konten: DiseaseContent[];
  bagian_tubuh: BodyPartRecord[];
  referensi: Reference[];
};
