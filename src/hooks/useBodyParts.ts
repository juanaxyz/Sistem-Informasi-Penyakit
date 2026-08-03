import { useCallback } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '../lib/supabase';
import type { BodyPartRecord } from '../lib/types';

/**
 * Mengambil daftar bagian tubuh dari tabel `bagian_tubuh` (Supabase).
 * `tampilan` opsional, nilainya mengikuti tabel (`'depan'` / `'belakang'`).
 */
export const useBodyParts = (tampilan?: 'depan' | 'belakang') => {
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<BodyPartRecord[]> => {
      let query = supabase
        .from('bagian_tubuh')
        .select('id,nama,slug,tampilan')
        .order('id', { ascending: true })
        .abortSignal(signal);
      if (tampilan) query = query.eq('tampilan', tampilan);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data as BodyPartRecord[]) ?? [];
    },
    [tampilan]
  );

  return useSupabaseQuery(fetcher, [], [tampilan], { initialLoading: true });
};
