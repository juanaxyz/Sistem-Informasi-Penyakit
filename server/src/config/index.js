require("dotenv").config();
const path = require("path");

const isProd = process.env.NODE_ENV === "production";

const requiredProd = [
  "JWT_SECRET",
  "PGPASSWORD",
  "PGHOST",
  "PGDATABASE",
];

for (const key of requiredProd) {
  if (isProd && !process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  env: process.env.NODE_ENV || "development",
  pg: {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "capstone_paru",
    max: Number(process.env.PGPOOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT) || 30_000,
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT) || 5_000,
  },
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : true,
  },
  ragApiUrl: process.env.RAG_API_URL || "http://localhost:8000",
  // Analisis citra dimuat di service Python yang sama (default ikut RAG_API_URL).
  modelApiUrl: process.env.MODEL_API_URL || process.env.RAG_API_URL || "http://localhost:8000",
  uploadsDir: path.resolve(__dirname, "..", "..", "uploads"),
  jwt: {
    secret: process.env.JWT_SECRET || (isProd ? "" : "dev_secret_only"),
    expiresIn: "7d",
  },
  isProd,
};