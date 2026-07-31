import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

/**
 * Pool koneksi PostgreSQL.
 * Dipakai bersama oleh semua route; jangan membuat koneksi baru per-request.
 */
export const pool = new Pool({
  ...(connectionString ? { connectionString } : {}),
  max: 10, // maksimal 10 koneksi simultan
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Cegah proses mati ketika koneksi idle bermasalah (mis. database restart).
pool.on('error', (err) => {
  console.error('[pg] unexpected error pada koneksi idle:', err);
});
