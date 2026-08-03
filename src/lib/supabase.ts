import { createClient } from '@supabase/supabase-js';

/**
 * Klien Supabase (anon key — aman untuk client).
 *
 * Variabel env wajib:
 * - `VITE_SUPABASE_URL` — URL project Supabase
 * - `VITE_SUPABASE_ANON_KEY` — anon/publishable key (read-only via RLS)
 *
 * Semua query PostgREST lewat klien ini. RLS di Supabase sudah
 * membatasi akses (public SELECT) sehingga anon key aman dipakai di browser.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY wajib diisi (lihat .env.example).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Deteksi error yang muncul karena request dibatalkan (`AbortController.abort()`). */
export const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';
