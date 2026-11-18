"use strict";

/**
 * Mengisi artikel.konten_teks dengan htmlToPlainText yang dipakai aplikasi
 * (src/utils/html.js) — bukan regex SQL. Jalankan SETELAH migrasi 001:
 *
 *   node scripts/migrate.js up
 *   node scripts/backfill-konten-teks.js
 *
 * Idempoten: boleh dijalankan ulang setiap kali ada konten yang diisi di luar
 * endpoint PUT (mis. import langsung ke DB).
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { Client } = require("pg");
const { htmlToPlainText } = require("../src/utils/html");

const pgConfig = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "capstone_paru",
};

async function main() {
  const client = new Client(pgConfig);
  await client.connect();

  try {
    const { rows } = await client.query(
      `SELECT id, konten FROM artikel ORDER BY id`,
    );

    let updated = 0;
    for (const row of rows) {
      const teks = htmlToPlainText(row.konten ?? "");
      await client.query(
        `UPDATE artikel SET konten_teks = $1 WHERE id = $2`,
        [teks, row.id],
      );
      updated += 1;
    }

    console.log(`${updated} artikel diperbarui (konten_teks).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Gagal backfill konten_teks:", err.message);
  process.exit(1);
});
