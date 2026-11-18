"use strict";

/**
 * Runner migrasi SQL sederhana (tanpa framework tambahan).
 *
 *   node scripts/migrate.js up            # terapkan semua migrasi yang belum jalan
 *   node scripts/migrate.js down [nama]   # rollback migrasi terakhir / yang disebut
 *
 * Migrasi adalah pasangan file di db/migrations/ dengan bentuk
 * `NNN-nama.up.sql` / `NNN-nama.down.sql`, dijalankan dalam satu transaksi,
 * dan dicatat di tabel `schema_migrations`.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

const pgConfig = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "capstone_paru",
};

async function listMigrations() {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".up.sql"));
  return files.map((f) => f.slice(0, -".up.sql".length)).sort();
}

async function loadApplied(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
        name        text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const { rows } = await client.query(`SELECT name FROM schema_migrations`);
  return new Set(rows.map((r) => r.name));
}

async function runMigration(client, name, direction) {
  const file = path.join(MIGRATIONS_DIR, `${name}.${direction}.sql`);
  const sql = fs.readFileSync(file, "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    if (direction === "up") {
      await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [name]);
    } else {
      await client.query(`DELETE FROM schema_migrations WHERE name = $1`, [name]);
    }
    await client.query("COMMIT");
    console.log(`${direction.toUpperCase()}  ${name}`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw new Error(`Gagal ${direction} ${name}: ${err.message}`);
  }
}

async function main() {
  const [, , command, target] = process.argv;
  if (!["up", "down"].includes(command)) {
    console.error("Penggunaan: node scripts/migrate.js up | down [nama]");
    process.exit(1);
  }

  const client = new Client(pgConfig);
  await client.connect();

  try {
    const applied = await loadApplied(client);
    const names = await listMigrations();

    if (command === "up") {
      const pending = names.filter((n) => !applied.has(n));
      if (pending.length === 0) {
        console.log("Tidak ada migrasi yang tertunda.");
      }
      for (const name of pending) {
        await runMigration(client, name, "up");
      }
    } else {
      const toRevert = target ?? [...applied].sort().reverse()[0];
      if (!toRevert) {
        console.log("Tidak ada migrasi yang bisa di-rollback.");
        process.exit(0);
      }
      if (!applied.has(toRevert)) {
        console.error(`Migrasi '${toRevert}' belum pernah diterapkan.`);
        process.exit(1);
      }
      await runMigration(client, toRevert, "down");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
