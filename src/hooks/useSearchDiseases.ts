import { useCallback } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '../lib/supabase';
import type { Disease } from '../lib/types';

/** Jeda sebelum query pencarian dikirim (menunggu user berhenti mengetik). */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Escape wildcard PostgREST/SQL agar input user dicari literal, bukan pola.
 * PostgREST `ilike` memakai `*` sebagai wildcard `%`; `?` sebagai `_`.
 * Karakter yang perlu diescape: `\`, `*`, `?`, plus `%`/`_` (wildcard SQL).
 */
const escapeLike = (input: string): string => input.replace(/[\\*?%_]/g, '\\$&');

/**
 * Pencarian penyakit real-time ke Supabase (tabel `penyakit`, kolom
 * `nama`/`ringkasan` via ILIKE). Query dijalankan terpisah per kolom lalu
 * digabung + diurutkan (menghindari parsing `.or()` yang rapuh terhadap
 * karakter khusus pada input). `activeQuery` selalu `query.trim()`; `data`
 * berisi hasil untuk `activeQuery` setelah debounce 300ms.
 */
export const useSearchDiseases = (query: string) => {
  const q = query.trim();

  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<Disease[]> => {
      const pattern = `*${escapeLike(q)}*`;

      const [namaRes, ringkasanRes] = await Promise.all([
        supabase.from('penyakit').select('id,nama,ringkasan,tingkat_urgensi').ilike('nama', pattern).abortSignal(signal),
        supabase.from('penyakit').select('id,nama,ringkasan,tingkat_urgensi').ilike('ringkasan', pattern).abortSignal(signal),
      ]);

      if (namaRes.error) throw new Error(namaRes.error.message);
      if (ringkasanRes.error) throw new Error(ringkasanRes.error.message);

      const byId = new Map<number, Disease>();
      for (const row of [...(namaRes.data ?? []), ...(ringkasanRes.data ?? [])]) {
        const disease = row as Disease;
        if (!byId.has(disease.id)) byId.set(disease.id, disease);
      }

      return [...byId.values()].sort((a, b) => a.nama.localeCompare(b.nama)).slice(0, 50);
    },
    [q]
  );

  const { data, loading, error } = useSupabaseQuery(q ? fetcher : null, [], [q], {
    delayMs: SEARCH_DEBOUNCE_MS,
    resetOnNull: true,
    clearDataOnError: true,
  });

  return { data, loading, error, activeQuery: q };
};
