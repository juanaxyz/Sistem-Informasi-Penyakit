import type {
  BodyPartRecord,
  Disease,
  DiseaseDetail,
  SystemRecord,
} from "./types";

/** Base URL server BFF. Bisa dioverride lewat env `VITE_API_URL`. */
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? `Permintaan gagal (${res.status})`, res.status);
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
};
