import { useCallback } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '../lib/supabase';
import type { Disease } from '../lib/types';

/**
 * Mengambil daftar penyakit untuk satu bagian tubuh (Supabase).
 * Menyaring `penyakit` lewat relasi `penyakit_bagian_tubuh` (many-to-many).
 */
export const useDiseasesByBodyPart = (bodyPartId: number | null) => {
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<Disease[]> => {
      const { data, error } = await supabase
        .from('penyakit')
        .select('id,nama,ringkasan,tingkat_urgensi')
        .eq('penyakit_bagian_tubuh.id_bagian_tubuh', bodyPartId)
        .order('nama')
        .abortSignal(signal);

      if (error) throw new Error(error.message);
      return (data as Disease[]) ?? [];
    },
    [bodyPartId]
  );

  return useSupabaseQuery(bodyPartId == null ? null : fetcher, [], [bodyPartId]);
};
