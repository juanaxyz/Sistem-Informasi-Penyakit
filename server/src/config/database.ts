import { Pool } from 'pg';
import { env } from './env';

/**
 * Pool koneksi PostgreSQL.
 * Dipakai bersama oleh semua route; jangan membuat koneksi baru per-request.
 *
 * Konfigurasi tambahan:
 * - `application_name` memudahkan identifikasi koneksi di pg_stat_activity.
 * - `statement_timeout` mencegah satu query menggantung tanpa batas.
 * - `idle_in_transaction_session_timeout` menutup koneksi yang terbengkalai
 *   di dalam transaksi.
 * - `env.databaseSsl` (`DATABASE_SSL === 'true'`) mengaktifkan SSL (mis. untuk
 *   layanan cloud) dengan `rejectUnauthorized: false` (menerima sertifikat self-signed).
 *
 * Nilai `connectionString`/`ssl` bersumber dari `config/env.ts`; opsi pool
 * lainnya tidak berubah.
 */
export const pool = new Pool({
  ...(env.databaseUrl ? { connectionString: env.databaseUrl } : {}),
  ...(env.databaseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 10, // maksimal 10 koneksi simultan
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: 'web-paru-paru-api',
  statement_timeout: 5_000,
  idle_in_transaction_session_timeout: 10_000,
});

// Cegah proses mati ketika koneksi idle bermasalah (mis. database restart).
pool.on('error', (err) => {
  console.error('[pg] unexpected error pada koneksi idle:', err);
});
