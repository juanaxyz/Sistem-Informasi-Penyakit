import 'dotenv/config';

/**
 * Konfigurasi lingkungan terpusat.
 *
 * Dibaca sekali saat modul pertama kali dimuat (fail-fast): bila variabel
 * wajib tidak valid, server langsung berhenti dengan pesan error yang jelas.
 * `dotenv` dimuat di sini sehingga file `.env` selalu terbaca terlebih dahulu,
 * baik oleh `index.ts`, aplikasi test, maupun skrip lain yang mengimpornya.
 */

/** Nilai NODE_ENV yang dikenal. */
const KNOWN_NODE_ENVS = ['development', 'test', 'production'] as const;

/** Ambil NODE_ENV (default `development`); tolak nilai yang tidak dikenal. */
const readNodeEnv = (): string => {
  const raw = process.env.NODE_ENV?.trim();
  if (!raw) {
    return 'development';
  }
  if (!(KNOWN_NODE_ENVS as readonly string[]).includes(raw)) {
    throw new Error(
      `NODE_ENV tidak dikenal: "${raw}". Gunakan salah satu dari: ${KNOWN_NODE_ENVS.join(', ')}.`
    );
  }
  return raw;
};

/** Ambil PORT (default `4000`); harus integer positif dalam rentang port TCP. */
const readPort = (): number => {
  const raw = process.env.PORT?.trim();
  if (!raw) {
    return 4000;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`PORT tidak valid: "${raw}". Harus berupa integer positif (1–65535).`);
  }
  return port;
};

const nodeEnv = readNodeEnv();
const port = readPort();

/** Ambil DATABASE_URL; wajib ada kecuali `NODE_ENV === 'test'`. */
const readDatabaseUrl = (): string => {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    if (nodeEnv === 'test') {
      return '';
    }
    throw new Error(
      'DATABASE_URL wajib diisi (lihat server/.env). Hanya diizinkan kosong saat NODE_ENV=test.'
    );
  }
  return raw;
};

const databaseUrl = readDatabaseUrl();

/** Bila `DATABASE_SSL === 'true'`, koneksi DB memakai SSL. */
const databaseSsl = process.env.DATABASE_SSL === 'true';

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port,
  databaseUrl,
  databaseSsl,
};
