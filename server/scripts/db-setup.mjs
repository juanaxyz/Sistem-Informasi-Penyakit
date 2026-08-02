/**
 * Runner migrasi PostgreSQL sederhana.
 *
 * Cara pakai:
 *   npm run db:setup
 *
 * Perilaku:
 * - Membaca semua file `*.sql` di `migrations/` (urut sesuai nama file).
 * - Mencatat migrasi yang sudah terpasang di tabel `schema_migrations`.
 * - Setiap file migrasi dijalankan dalam satu transaksi (all-or-nothing).
 * - Jika tabel inti (sistem_tubuh/penyakit) sudah ada di database,
 *   migrasi yang ada ditandai sebagai baseline (tidak dijalankan ulang).
 */
import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../migrations');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL tidak ditemukan di server/.env');
  process.exit(1);
}

const client = new Client({ connectionString });
await client.connect();

const listMigrationFiles = async () => {
  const entries = await readdir(migrationsDir);
  return entries.filter((file) => file.endsWith('.sql')).sort();
};

const hasTable = async (schemaTable) => {
  const { rows } = await client.query('SELECT to_regclass($1) AS name', [schemaTable]);
  return rows[0].name !== null;
};

const coreTablesExist = async () => {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname IN ('sistem_tubuh', 'penyakit')`
  );
  return rows[0].count > 0;
};

const markApplied = async (fileName) => {
  await client.query('INSERT INTO schema_migrations (file_name) VALUES ($1)', [fileName]);
};

try {
  const files = await listMigrationFiles();
  if (files.length === 0) {
    console.log('Tidak ada file migrasi di migrations/.');
  }

  if (!(await hasTable('public.schema_migrations'))) {
    await client.query(`
      CREATE TABLE schema_migrations (
        id SERIAL PRIMARY KEY,
        file_name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Tabel schema_migrations dibuat.');

    // Baseline: database lama yang sudah punya skema inti
    // (hasil setup via psql sebelumnya) dianggap sudah termigrasi.
    if (await coreTablesExist()) {
      for (const file of files) await markApplied(file);
      console.log('Skema inti sudah ada — migrasi yang ada ditandai sebagai baseline.');
    }
  }

  const { rows } = await client.query('SELECT file_name FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.file_name));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`- skip  ${file} (sudah terpasang)`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await markApplied(file);
      await client.query('COMMIT');
      console.log(`- apply ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Gagal memasang ${file}:`, err.message);
      process.exitCode = 1;
      break;
    }
  }

  console.log('db:setup selesai.');
} catch (err) {
  console.error('db:setup gagal:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
