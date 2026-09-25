"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

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
  const file = path.join(__dirname, "..", "db", "schema.sql");
  const sql = fs.readFileSync(file, "utf8");
  console.log(`Applying schema to ${pgConfig.database} on ${pgConfig.host}...`);
  await client.query(sql);
  console.log("Schema applied successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Failed to apply schema:", err.message);
  process.exit(1);
});