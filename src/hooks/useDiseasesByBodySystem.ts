import { useFetch } from './useFetch';
import type { Disease } from '../lib/types';

/** Mengambil daftar penyakit untuk satu sistem tubuh dari `GET /api/body-systems/:id/diseases`. */
export const useDiseasesByBodySystem = (systemId: number | null) => {
  const path = systemId == null ? null : `/body-systems/${systemId}/diseases`;
  return useFetch<Disease[]>(path, []);
};
