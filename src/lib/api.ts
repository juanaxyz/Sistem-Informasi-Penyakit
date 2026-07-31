/**
 * Bantuan akses API backend.
 *
 * Seluruh router Express dipasang di bawah `/api` (lihat `server/src/app.ts`),
 * jadi setiap `path` di sini ditulis tanpa prefix `/api` — base-nya disediakan
 * oleh `API_BASE`. Base bisa diarahkan ke server lain lewat env `VITE_API_URL`.
 */

import type { Disease } from './types';

export const API_BASE = (() => {
  const customUrl = import.meta.env.VITE_API_URL as string | undefined;
  return customUrl ? `${customUrl}/api` : '/api';
})();

/** Fetch ke API; melempar `Error` bila respons tidak 2xx, lalu mengembalikan JSON. */
export const api = async <T = unknown>(path: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
};

/** Deteksi error yang muncul karena request dibatalkan (`AbortController.abort()`). */
export const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';

/**
 * Fetch daftar penyakit untuk satu bagian tubuh.
 * GET /api/diseases/by-body-part/:bodyPartId
 */
export const fetchDiseasesByBodyPart = (bodyPartId: number): Promise<Disease[]> =>
  api<Disease[]>(`/diseases/by-body-part/${bodyPartId}`);
