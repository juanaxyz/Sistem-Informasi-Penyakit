import type {
  AuthResponse,
  BodyPartRecord,
  ChatResult,
  ChatTurn,
  Disease,
  DiseaseDetail,
  LoginPayload,
  RegisterPayload,
  SystemRecord,
  User,
  Riwayat,
  RiwayatDetail,
  AnalysisResult,
  Model,
} from "./types";

/** Base URL server BFF. Bisa dioverride lewat env `VITE_API_URL`. */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

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

export const api = {
   getBodyParts: () => get<{ bagian_tubuh: BodyPartRecord[] }>("/api/bagian-tubuh"),
   getSystemsByBodyPart: (idBody: number) =>
     get<{ sistem_tubuh: SystemRecord[] }>(`/api/sistem-tubuh/byBody/${idBody}`),
   getDiseasesBySystemAndBody: (idBody: number, idSystem: number) =>
     get<{ penyakit: Disease[] }>(`/api/penyakit/bySystemAndBody/${idBody}/${idSystem}`),
   searchDiseases: (q: string) =>
     get<{ penyakit: Disease[] }>(`/api/penyakit/cari?q=${encodeURIComponent(q)}`),
   getDiseaseDetail: (id: number) =>
     get<{ penyakit: DiseaseDetail }>(`/api/penyakit/${id}`),
   getArtikelList: () => get<{ artikel: any[] }>("/api/artikel"),
   put: <T>(path: string, body: unknown) => post<T>(path, body),
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
   },
   riwayat: {
     create: (payload: { gambar: string }) =>
       post<{ id: number; status: string }>("/api/riwayat", payload),
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