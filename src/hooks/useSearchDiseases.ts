import { useFetch } from './useFetch';
import type { Disease } from '../lib/types';

/** Jeda sebelum request pencarian dikirim (menunggu user berhenti mengetik). */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Pencarian penyakit real-time ke `GET /api/search?q=...`.
 *
 * `activeQuery` adalah query yang sedang aktif (sudah di-trim); nilainya selalu
 * sama dengan `query.trim()`, kosong saat query kosong. `data` berisi hasil
 * untuk `activeQuery` setelah debounce 300ms.
 */
export const useSearchDiseases = (query: string) => {
  const q = query.trim();
  const path = q ? `/search?q=${encodeURIComponent(q)}` : null;

  const { data, loading, error } = useFetch<Disease[]>(path, [], {
    delayMs: SEARCH_DEBOUNCE_MS,
    resetOnNull: true,
    clearDataOnError: true,
  });

  return { data, loading, error, activeQuery: q };
};
