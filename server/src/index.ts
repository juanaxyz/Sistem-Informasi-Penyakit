import { createApp } from './app';
import { env } from './config/env';
import { pool } from './config/database';

const port = env.port;

const app = createApp();

const verifyDatabase = async (): Promise<void> => {
  try {
    await pool.query('SELECT 1');
    console.log('Koneksi database OK.');
  } catch (err) {
    console.warn(
      'Peringatan: database tidak dapat dijangkau saat startup:',
      err instanceof Error ? err.message : err
    );
  }
};

const shutdown = (signal: string): void => {
  console.log(`\nMenerima ${signal}, menutup server...`);
  server.close(() => {
    pool
      .end()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('Gagal menutup pool database:', err);
        process.exit(1);
      });
  });
};

const server = app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  void verifyDatabase();
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
