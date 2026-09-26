import type {
  AnalysisTypeRecord,
  ArtikelBagian,
  ArtikelSummary,
  AuthResponse,
  BodyPartRecord,
  ChatResult,
  ChatTurn,
  Disease,
  DiseaseDetail,
  LoginPayload,
  Model,
  Patogen,
  PenyakitFormPayload,
  RegisterPayload,
  Riwayat,
  RiwayatDetail,
  SystemRecord,
  User,
} from "./types";

/** Base URL server BFF. Bisa dioverride lewat env `VITE_API_URL`. */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/** Resolve path asset dari BFF (mis. `/uploads/gambar.png`) ke URL lengkap. */
export function resolveAssetUrl(value: string): string {
  if (!value || /^(data:|https?:\/\/)/.test(value)) return value;
  return `${API_URL}${value}`;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getAuthHeader(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...getAuthHeader(),
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? `Permintaan gagal (${res.status})`, res.status);
  }

  return (await res.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; detail?: string }
      | null;
    throw new ApiError(
      body?.error ?? body?.detail ?? `Permintaan gagal (${res.status})`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

async function postForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: getAuthHeader(),
    body: form,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; detail?: string }
      | null;
    throw new ApiError(
      body?.error ?? body?.detail ?? `Permintaan gagal (${res.status})`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; detail?: string }
      | null;
    throw new ApiError(
      body?.error ?? body?.detail ?? `Permintaan gagal (${res.status})`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? `Permintaan gagal (${res.status})`, res.status);
  }

  return (await res.json()) as T;
}

export const api = {
    getDashboard: () =>
      get<{
        dashboard: {
          counts: {
            penyakit: number;
            sistem_tubuh: number;
            bagian_tubuh: number;
            artikel: number;
            artikel_bagian: number;
            users: number;
            riwayat: number;
            prediksi: number;
          };
          urgensi: { tingkat_urgensi: string; jumlah: number }[];
          per_sistem: { id: number; nama: string; jumlah_penyakit: number }[];
          artikel_coverage: { total: number; punya_artikel: number };
          users_role: { role: string; jumlah: number }[];
          riwayat_status: { status: string; jumlah: number }[];
          prediksi_penyakit: { nama: string; jumlah: number }[];
        };
      }>("/api/dashboard"),
    getBodyParts: () => get<{ bagian_tubuh: BodyPartRecord[] }>("/api/bagian-tubuh"),
    getSistemTubuh: () => get<{ sistem_tubuh: SystemRecord[] }>("/api/sistem-tubuh"),
    getSystemsByBodyPart: (idBody: number) =>
      get<{ sistem_tubuh: SystemRecord[] }>(`/api/sistem-tubuh/byBody/${idBody}`),
    getAnalysesByBodyPart: (idBody: number) =>
      get<{ jenis_analisis: AnalysisTypeRecord[] }>(`/api/jenis-analisis/byBody/${idBody}`),
    getDiseasesBySystemAndBody: (idBody: number, idSystem: number) =>
      get<{ penyakit: Disease[] }>(`/api/penyakit/bySystemAndBody/${idBody}/${idSystem}`),
    searchDiseases: (q: string) =>
      get<{ penyakit: Disease[] }>(`/api/penyakit/cari?q=${encodeURIComponent(q)}`),
    getAllPenyakit: () => get<{ penyakit: (Disease & { id_sistem_tubuh: number; sistem_tubuh_nama?: string; code?: string })[] }>("/api/penyakit"),
    getDiseaseDetail: (id: number) =>
      get<{ penyakit: DiseaseDetail }>(`/api/penyakit/${id}`),
    createPenyakit: (payload: PenyakitFormPayload) =>
      post<{ penyakit: DiseaseDetail }>("/api/penyakit", payload),
    updatePenyakit: (id: number, payload: PenyakitFormPayload) =>
      put<{ penyakit: DiseaseDetail }>(`/api/penyakit/${id}`, payload),
    getArtikelList: () => get<{ artikel: ArtikelSummary[] }>("/api/artikel"),
    createArtikel: (idPenyakit: number) =>
      post<{ artikel: ArtikelSummary }>("/api/artikel", { id_penyakit: idPenyakit }),
    getArtikelBagian: (idArtikel: number) =>
      get<{ bagian: ArtikelBagian[] }>(`/api/artikel/${idArtikel}/bagian`),
    saveArtikelBagian: (idArtikel: number, bagian: ArtikelBagian[]) =>
      put<{ bagian: ArtikelBagian[] }>(`/api/artikel/${idArtikel}/bagian`, { bagian }),
    getDiseaseDetailById: (id: number) =>
      get<{ penyakit: DiseaseDetail }>(`/api/penyakit/${id}`),
    getDiseaseDetailBySlug: (slug: string) =>
      get<{ penyakit: DiseaseDetail }>(`/api/penyakit/slug/${slug}`),
    patogen: {
      list: () => get<{ patogen: Patogen[] }>("/api/patogen"),
      detail: (id: number) =>
        get<{ patogen: Patogen }>(`/api/patogen/${id}`),
      create: (payload: {
        nama: string;
        jenis: string;
        deskripsi?: string;
        penyakitIds?: number[];
      }) => post<{ patogen: Patogen }>("/api/patogen", payload),
      update: (
        id: number,
        payload: {
          nama: string;
          jenis: string;
          deskripsi?: string;
          penyakitIds?: number[];
        },
      ) => put<{ patogen: Patogen }>(`/api/patogen/${id}`, payload),
      remove: (id: number) => del<{ message: string }>(`/api/patogen/${id}`),
    },
    chat: (payload: { question: string; session_id?: string; history?: ChatTurn[] }) =>
      post<ChatResult>("/api/rag/chat", payload),
    auth: {
     register: (payload: RegisterPayload) =>
       post<AuthResponse>("/api/auth/register", payload),
     login: (payload: LoginPayload) =>
       post<AuthResponse>("/api/auth/login", payload),
     logout: () =>
       post<{ message: string }>("/api/auth/logout", {}),
     me: () =>
       get<{ user: User }>("/api/auth/me"),
     updateProfile: (payload: {
       nama: string;
       email: string;
       username: string;
       password?: string;
     }) => put<{ user: User }>("/api/auth/me", payload),
   },
   riwayat: {
     create: (file: File) => {
       const form = new FormData();
       form.append("gambar", file);
       return postForm<{ id: number; status: string }>("/api/riwayat", form);
     },
     list: (limit?: number, offset?: number) =>
       get<{ riwayat: Riwayat[] }>(`/api/riwayat?limit=${limit ?? 20}&offset=${offset ?? 0}`),
     detail: (id: number) =>
       get<{ riwayat: RiwayatDetail }>(`/api/riwayat/${id}`),
   },
   analysis: {
     run: (id: number) =>
       post<{ riwayat: RiwayatDetail }>(`/api/riwayat/${id}/analisis`, {}),
   },
   model: {
     list: () => get<{ models: Model[] }>("/api/model"),
   },
};