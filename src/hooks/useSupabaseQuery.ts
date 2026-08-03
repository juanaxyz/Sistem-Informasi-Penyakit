import { useEffect, useRef, useState } from 'react';
import { isAbortError } from '../lib/supabase';

type UseSupabaseQueryOptions = {
  /** Mulai dengan `loading = true` sebelum query pertama (mis. list awal). */
  initialLoading?: boolean;
  /** Tunda query setiap kali `deps` berubah; dipakai untuk debounce pencarian. */
  delayMs?: number;
  /** Saat `fetcher` menjadi `null`, kembalikan state ke nilai awal. */
  resetOnNull?: boolean;
  /** Saat query gagal, kosongkan `data` (kembali ke nilai awal). */
  clearDataOnError?: boolean;
};

/**
 * Hook query generik ke Supabase (PostgREST).
 *
 * - `fetcher` menerima `AbortSignal` dan mengembalikan hasil query; `null`
 *   menonaktifkan query (berguna untuk "tunggu id terisi").
 * - `deps` adalah array yang menjadi trigger re-query (mirip `path` di `useFetch` lama).
 * - Perilaku (abort, debounce, reset) identik dengan `useFetch` lama,
 *   sehingga kontrak `{ data, loading, error }` komponen tetap stabil.
 */
export const useSupabaseQuery = <T>(
  fetcher: ((signal: AbortSignal) => Promise<T>) | null,
  initialData: T,
  deps: readonly unknown[],
  { initialLoading = false, delayMs = 0, resetOnNull = false, clearDataOnError = false }: UseSupabaseQueryOptions = {},
): { data: T; loading: boolean; error: string | null } => {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  // `initialData` hanya dipakai sebagai nilai awal; disimpan di ref agar
  // nilai awal tetap stabil walau caller membuat array/objek baru tiap render.
  const initialDataRef = useRef(initialData);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;

    const resetToInitial = () => {
      setData(initialDataRef.current);
      setLoading(initialLoading);
      setError(null);
    };

    if (fetcherRef.current === null) {
      if (resetOnNull) resetToInitial();
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let timer: number | undefined;

    const load = async () => {
      setLoading(true);
      try {
        const json = await fetcherRef.current?.(controller.signal);
        if (!cancelled) setData(json as T);
      } catch (e) {
        if (!cancelled && !isAbortError(e)) {
          if (clearDataOnError) setData(initialDataRef.current);
          setError(e instanceof Error ? e.message : 'unknown');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (delayMs > 0) {
      timer = window.setTimeout(() => void load(), delayMs);
    } else {
      void load();
    }

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoading, delayMs, resetOnNull, clearDataOnError, ...deps]);

  return { data, loading, error };
};
