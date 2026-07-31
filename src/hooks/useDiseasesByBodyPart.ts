import { useFetch } from './useFetch';
import type { Disease } from '../lib/types';

/** Mengambil daftar penyakit untuk satu bagian tubuh dari `GET /api/diseases/by-body-part/:id`. */
export const useDiseasesByBodyPart = (bodyPartId: number | null) => {
  const path = bodyPartId == null ? null : `/diseases/by-body-part/${bodyPartId}`;
  return useFetch<Disease[]>(path, []);
};
