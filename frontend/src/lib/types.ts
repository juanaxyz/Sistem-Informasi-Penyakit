export type UrgencyLevel = "normal" | "waspada" | "darurat";

export type Tampilan = "depan" | "belakang";

export interface BodyPartRecord {
  id: number;
  nama: string;
  tampilan: Tampilan;
}

export interface SystemRecord {
  id: number;
  nama: string;
  /** Jumlah penyakit yang terkait di bagian tubuh ybs (dari byBody). */
  jumlah_penyakit?: number;
}

/** Ringkasan satu penyakit (hasil list/search). */
export interface Disease {
  id: number;
  nama: string;
  slug: string;
  ringkasan: string | null;
  thumbnail: string | null;
  tingkat_urgensi: UrgencyLevel;
}

export interface Referensi {
  id: number;
  url: string | null;
}

export interface Artikel {
  id: number;
  konten: string;
}

/** Detail lengkap satu penyakit (halaman detail). */
export interface DiseaseDetail {
  id: number;
  id_sistem_tubuh: number;
  nama: string;
  slug: string;
  ringkasan: string | null;
  thumbnail: string | null;
  tingkat_urgensi: UrgencyLevel;
  sistem_tubuh: Pick<SystemRecord, "id" | "nama"> | null;
  artikel: Artikel[];
  bagian_tubuh: Pick<BodyPartRecord, "id" | "nama">[];
  referensi: Referensi[];
}

/** Satu turn percakapan yang dikirim ke API RAG. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Satu chunk hasil retrieval RAG (dari knowledge_embeddings). */
export interface ChatSource {
  source_type: "disease" | "faq";
  id_artikel: number | null;
  id_faq: number | null;
  content: string;
  similarity: number;
}

/** Respons endpoint /api/rag/chat. */
export interface ChatResult {
  question: string;
  answer: string;
  sources: ChatSource[];
  session_id?: string | null;
}
