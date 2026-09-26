# Sistem Informasi Penyakit — Web Paru-Paru

Aplikasi web edukasi & bantuan deteksi penyakit berbasis paru-paru. Pengguna dapat
menjelajahi **peta tubuh interaktif** untuk menemukan penyakit dan organ terkait,
melihat **detail penyakit** (artikel edukasi, patogen penyebab, bagian tubuh),
mencari penyakit berdasarkan kata kunci, serta melewati alur **analisis foto X-ray**
yang menghasilkan riwayat + prediksi model AI. Panel **admin** dipakai untuk
mengelola master penyakit, artikel edukasi, patogen, dan detail dashboard.

> Informasi pada aplikasi ini bersifat edukasi — bukan diagnosis medis.

## Struktur Repositori (Monorepo)

| Folder     | Isi                                                                 |
| ---------- | ------------------------------------------------------------------- |
| `frontend/` | Aplikasi SPA — React 19 + TypeScript + Vite + TanStack Query + Tailwind 4 |
| `server/`   | **BFF** (backend-for-frontend) — Node.js/Express + PostgreSQL, melayani seluruh API `/api/*` |
| `service/`  | Layanan Python/FastAPI terpadu: chat RAG + analisis citra — lihat `service/README.md` |

Alur data: **Frontend (SPA)** → **BFF Express** (`:4000/api`) → **PostgreSQL**
(`capstone_paru`). Percakapan *chat* & analisis citra diteruskan BFF ke
**service Python** (`:8000`).

## Persyaratan

- Node.js ≥ 20
- PostgreSQL (lokal, skema awal di `server/db/schema.sql`)
- (Opsional) Service Python di `service/` untuk fitur chat RAG & analisis citra

## Menjalankan

### 1. Database

```powershell
# Dari `server/`: terapkan skema tambahan (users, riwayat, prediksi, artikel, ...)
npm run db:schema
```

Tabel inti (`penyakit`, `sistem_tubuh`, `bagian_tubuh`, `patogen`, `referensi`,
`model`, `faq`, `jenis_analisis`, dll.) diasumsikan sudah tersedia di database.
Daftar lengkap tabel ada di `docs/ARCHITECTURE.md`.

### 2. Server (BFF)

```powershell
cd server
Copy-Item .env.example .env   # sesuaikan PGPASSWORD, JWT_SECRET, dll.
npm install
npm run dev                   # http://localhost:4000 (nodemon + tsx)
```

### 3. Frontend

```powershell
cd frontend
Copy-Item .env.example .env   # opsional; default VITE_API_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:5173
```

### 4. Service Python (chat RAG & analisis citra)

```powershell
cd service
Copy-Item .env.example .env   # isi GEMINI_API_KEY, PG* (sama dengan server/.env), ALLOW_STUB
pip install -r requirements.txt
python scripts/apply_schema.py  # buat tabel knowledge_embeddings (sekali, idempotent)
python ingest.py                 # seeding embedding (ulang tiap konten berubah)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# lihat service/README.md untuk model .onnx, dll.
```

## Konfigurasi Environment

### `server/.env`

| Variabel               | Default              | Keterangan                                                        |
| ---------------------- | -------------------- | ----------------------------------------------------------------- |
| `PGHOST`               | `localhost`          | Host PostgreSQL                                                   |
| `PGPORT`               | `5432`               | Port PostgreSQL                                                   |
| `PGUSER`               | `postgres`           | User database                                                     |
| `PGPASSWORD`           | *(kosong)*           | **Wajib** di production                                           |
| `PGDATABASE`           | `capstone_paru`      | Nama database                                                     |
| `PGPOOL_MAX`           | `10`                 | Ukuran pool koneksi `pg`                                          |
| `PG_CONN_TIMEOUT`      | `5000`               | Timeout koneksi (ms)                                              |
| `PORT`                 | `4000`               | Port HTTP server                                                  |
| `NODE_ENV`             | `development`        | `development` / `production` (mengubah perilaku error handler)    |
| `JWT_SECRET`           | *(kosong)*           | Secret sign/verify JWT — **wajib** di production                  |
| `CORS_ORIGIN`          | `*` (true)           | Origin yang diizinkan, pisahkan koma bila lebih dari satu         |
| `RAG_API_URL`          | `http://localhost:8000` | Base URL service Python (chat + analisis citra) |
| `MODEL_API_URL`        | (ikut `RAG_API_URL`) | Override base URL analisis citra bila terpisah |

### `frontend/.env`

| Variabel       | Default               | Keterangan                                  |
| -------------- | --------------------- | ------------------------------------------- |
| `VITE_API_URL` | `http://localhost:4000` | Base URL BFF yang dipanggil frontend        |

## Skrip Berguna

| Tempat     | Perintah          | Fungsi                                   |
| ---------- | ----------------- | ---------------------------------------- |
| `server/`  | `npm run dev`     | Jalankan BFF (nodemon, reload otomatis)   |
| `server/`  | `npm start`       | Jalankan BFF untuk production            |
| `server/`  | `npm test`        | Jest + supertest (mock DB, 37 tes)       |
| `server/`  | `npm run db:schema` | Terapkan skema tambahan ke database      |
| `frontend/`| `npm run dev`     | Jalankan Vite dev server                 |
| `frontend/`| `npm run build`   | Type-check (`tsc -b`) + build produksi   |
| `frontend/`| `npm run lint`    | ESLint                                   |
| `frontend/`| `npm run preview` | Pratinjau hasil build                    |

## Dokumentasi

- [Arsitektur & Alur Data](docs/ARCHITECTURE.md) — struktur server/frontend, keamanan, skema database, konvensi agar mudah diskalakan.
- [Referensi API](docs/API.md) — seluruh endpoint `/api`, contoh permintaan & respons.

## Keamanan Singkat

- Password di-hash dengan `bcrypt` (10 rounds); token JWT kedaluwarsa 7 hari.
- Rate limit global + otentikasi pada `/api/auth`.
- `helmet` untuk header keamanan; body JSON dibatasi 1&nbsp;MB.
- Endpoint admin (kelola penyakit/artikel/patogen/dashboard) dilindungi `requireRole("admin")`.
- Di `production`, `error-handler` menyembunyikan detail error internal.