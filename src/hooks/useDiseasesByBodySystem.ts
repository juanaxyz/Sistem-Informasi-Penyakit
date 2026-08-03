import { useCallback } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '../lib/supabase';
import type { Disease } from '../lib/types';

/** Mengambil daftar penyakit milik satu sistem tubuh (Supabase). */
export const useDiseasesByBodySystem = (systemId: number | null) => {
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<Disease[]> => {
      const { data, error } = await supabase
        .from('penyakit')
        .select('id,nama,ringkasan,tingkat_urgensi')
        .eq('id_sistem_tubuh', systemId)
        .order('nama')
        .abortSignal(signal);

      if (error) throw new Error(error.message);
      return (data as Disease[]) ?? [];
    },
    [systemId]
  );

  return useSupabaseQuery(systemId == null ? null : fetcher, [], [systemId]);
};
