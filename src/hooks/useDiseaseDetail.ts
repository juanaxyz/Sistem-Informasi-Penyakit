import { useFetch } from './useFetch';
import type { DiseaseDetail } from '../lib/types';

/** Mengambil detail lengkap satu penyakit dari `GET /api/diseases/:id`. */
export const useDiseaseDetail = (diseaseId: number | null) => {
  const path = diseaseId == null ? null : `/diseases/${diseaseId}`;
  return useFetch<DiseaseDetail | null>(path, null);
};
