import { useCallback } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '../lib/supabase';
import type { BodySystem } from '../lib/types';

/** Mengambil daftar sistem tubuh dari tabel `sistem_tubuh` (Supabase). */
export const useBodySystems = () => {
  const fetcher = useCallback(async (signal: AbortSignal): Promise<BodySystem[]> => {
    const { data, error } = await supabase
      .from('sistem_tubuh')
      .select('id,nama,slug,deskripsi')
      .order('id', { ascending: true })
      .abortSignal(signal);

    if (error) throw new Error(error.message);
    return (data as BodySystem[]) ?? [];
  }, []);

  return useSupabaseQuery(fetcher, [], [], { initialLoading: true });
};
