import { useEffect, useRef, useState } from 'react';
import { api, isAbortError } from '../lib/api';

type UseFetchOptions = {
  /** Mulai dengan `loading = true` sebelum fetch pertama (mis. list awal). */
  initialLoading?: boolean;
  /** Tunda fetch setiap kali `path` berubah; dipakai untuk debounce pencarian. */
  delayMs?: number;
  /** Saat `path` menjadi `null`, kembalikan state ke nilai awal. */
  resetOnNull?: boolean;
  /** Saat fetch gagal, kosongkan `data` (kembali ke nilai awal). */
  clearDataOnError?: boolean;
};

/**
 * Hook fetch generik yang dipakai semua hooks data:
 * - memanggil `api()` (lewat `API_BASE`) saat `path` berubah,
 * - membatalkan request yang tidak lagi relevan lewat `AbortController`,
 * - `path === null` menonaktifkan request (berguna untuk "tunggu id terisi").
 */
export const useFetch = <T>(
  path: string | null,
  initialData: T,
  { initialLoading = false, delayMs = 0, resetOnNull = false, clearDataOnError = false }: UseFetchOptions = {},
): { data: T; loading: boolean; error: string | null } => {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  // `initialData` hanya dipakai sebagai nilai awal; disimpan di ref agar
  // nilai awal tetap stabil walau caller membuat array/objek baru tiap render.
  const initialDataRef = useRef(initialData);

  useEffect(() => {
    const resetToInitial = () => {
      setData(initialDataRef.current);
      setLoading(initialLoading);
      setError(null);
    };

    if (path === null) {
      if (resetOnNull) resetToInitial();
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let timer: number | undefined;

    const load = async () => {
      setLoading(true);
      try {
        const json = await api<T>(path, { signal: controller.signal });
        if (!cancelled) setData(json);
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
  }, [path, initialLoading, delayMs, resetOnNull, clearDataOnError]);

  return { data, loading, error };
};
