import type { QueryResult, QueryResultRow } from 'pg';
import { pool } from './database';

/**
 * Helper untuk menjalankan query terparameterisasi lewat pool.
 *
 * Semua route WAJIB memakai helper ini:
 * - parameterized query → aman dari SQL injection,
 * - hasil dijalankan di salah satu koneksi pool → efisien (tanpa bikin koneksi baru).
 */
export const query = async <T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> => pool.query(text, params);
