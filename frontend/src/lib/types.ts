export type UrgencyLevel = "normal" | "waspada" | "darurat";

export type Tampilan = "depan" | "belakang";

export interface BodyPartRecord {
  id: number;
  nama: string;
  slug: string;
  tampilan: Tampilan;
}

export interface SystemRecord {
  id: number;
  nama: string;
  slug: string;
  deskripsi: string | null;
  /** Jumlah penyakit yang terkait di bagian tubuh ybs (dari byBody). */
  jumlah_penyakit?: number;
}

/** Ringkasan satu penyakit (hasil list/search). */
export interface Disease {
  id: number;
  nama: string;
  slug: string;
  ringkasan: string | null;
  tingkat_urgensi: UrgencyLevel;
}

export interface Referensi {
  id: number;
  judul: string;
  sumber: string | null;
  url: string | null;
  tahun: number | null;
}

export interface ContentImage {
  id: number;
  url_gambar: string;
  caption: string | null;
  urutan: number;
}

export interface DiseaseContent {
  id: number;
  judul: string;
  slug: string;
  isi: string;
  urutan: number;
  gambar_konten: ContentImage[];
}

/** Detail lengkap satu penyakit (halaman detail). */
export interface DiseaseDetail {
  id: number;
  id_sistem_tubuh: number;
  nama: string;
  slug: string;
  ringkasan: string | null;
  tingkat_urgensi: UrgencyLevel;
  sistem_tubuh: Pick<SystemRecord, "id" | "nama" | "slug" | "deskripsi"> | null;
  konten: DiseaseContent[];
  bagian_tubuh: Pick<BodyPartRecord, "id" | "nama" | "slug">[];
  referensi: Referensi[];
}
