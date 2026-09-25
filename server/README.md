# web-paru-paru Server (BFF)

Backend-for-frontend (BFF) untuk **web-paru-paru** — aplikasi sistem informasi penyakit paru-paru. Dibangun dengan **Express.js + PostgreSQL** (driver `pg`, SQL langsung), menyajikan API `/api` untuk data penyakit, bagian tubuh, sistem tubuh, artikel, autentikasi, riwayat analisis, dan proxy ke RAG API (FastAPI).

## Arsitektur

```
Frontend (Vite)  ──HTTP──▶  BFF (Express, :4000)  ──▶  PostgreSQL (pg Pool, SQL)
                                │
                                └──proxy /api/rag/chat──▶  RAG API (FastAPI, :8000)
```

- **`/api/rag/chat`** di-proxy BFF ke RAG API, sehingga frontend tidak perlu tahu alamat RAG.
- Semua akses database lewat pool `pg` (`src/db/pg.js`) dengan query ber-parameter (aman dari SQL injection). Skema dirapikan lewat `db/schema.sql` + `npm run db:schema`.

## Struktur Folder

```
server/
├── db/
│   └── schema.sql                 # Skema PostgreSQL (idempotent) — users, riwayat, prediksi, artikel, artikel_bagian
├── scripts/
│   └── apply-schema.js            # Terapkan schema.sql ke PG lokal (npm run db:schema)
├── src/
│   ├── server.js                  # Bootstrap: mount app + listen
│   ├── app.js                     # Factory Express: middleware global, mount router, 404 + error handler
│   ├── config/index.js            # Env config + fail-fast di production
│   ├── db/pg.js                   # Pool pg + helper query(text, params)
│   ├── lib/
│   │   └── jwt.js                 # sign / verify token
│   ├── middlewares/
│   │   ├── async-handler.js       # Bungkus async handler → next(err)
│   │   ├── auth.js                # verifyToken + requireRole
│   │   ├── error-handler.js       # Error terpusat + 404 handler + mapping unique violation (23505)
│   │   └── rate-limit.js          # Limit global & khusus /api/auth
│   ├── controllers/               # Logika per domain (akses DB via query dari ../db/pg)
│   ├── routes/                    # Router per resource, di-mount di bawah /api
│   ├── utils/                     # AppError, validators (validateId, escapeLike)
│   └── api.test.js                # Integration test (jest + supertest, mock ../db/pg)
└── .env.example
```

Alur request: `app.js → routes/ → middlewares → controllers → query (pg Pool) → PostgreSQL`.

## Prasyarat

- Node.js >= 20
- PostgreSQL lokal (mis. 16+) dengan database `capstone_paru`
- RAG API (FastAPI) — opsional; hanya untuk `/api/rag/chat`

## Setup

1. Install dependensi:

   ```bash
   npm install
   ```

2. Salin `.env.example` menjadi `.env` dan isi nilai:

   ```bash
   copy .env.example .env
   ```

   | Variabel                       | Keterangan |
   | ------------------------------ | ---------- |
   | `PGHOST`                       | Host PostgreSQL (default `localhost`) |
   | `PGPORT`                       | Port PostgreSQL (default `5432`) |
   | `PGUSER`                       | User (default `postgres`) |
   | `PGPASSWORD`                   | Password user PostgreSQL — wajib diisi |
   | `PGDATABASE`                   | Nama database (default `capstone_paru`) |
   | `PORT`                         | Port HTTP server (default `4000`) |
   | `NODE_ENV`                     | `development` / `production` |
   | `JWT_SECRET`                   | Secret untuk sign/verify JWT — wajib kuat, wajib ada di production |
   | `CORS_ORIGIN`                  | Origin yang diizinkan, pisahkan koma bila lebih dari satu |
   | `RAG_API_URL`                  | Base URL RAG API (default `http://localhost:8000`) |

   > Di production, server **akan menolak start** bila `JWT_SECRET`, `PGPASSWORD`, `PGHOST`, atau `PGDATABASE` kosong (fail-fast).

3. Terapkan skema database (menambah tabel `users`, `riwayat`, `prediksi`, `artikel`, `artikel_bagian`; idempotent):

   ```bash
   npm run db:schema
   ```

4. Jalankan server:

   ```bash
   npm run dev        # development (nodemon + tsx)
   # atau
   npm start          # production
   ```

5. Cek kesehatan: `GET http://localhost:4000/health` → `{ "status": "OK", ... }`

## Script NPM

| Script            | Perintah          | Keterangan |
| ----------------- | ----------------- | ---------- |
| `npm run dev`     | `nodemon --exec tsx src/server.js` | Development dengan auto-reload |
| `npm start`       | `tsx src/server.js`                | Menjalankan server |
| `npm test`        | `jest --detectOpenHandles`         | Integration test (mock `../db/pg`) |
| `npm run db:schema` | `node scripts/apply-schema.js`   | Terapkan `db/schema.sql` ke PostgreSQL |

## Daftar Endpoint

Semua endpoint berada di bawah prefix `/api`.

### Health & Umum

| Method | Path                 | Proteksi | Keterangan |
| ------ | -------------------- | -------- | ---------- |
| GET    | `/`                  | Publik   | `{ ok: true }` |
| GET    | `/health`            | Publik   | Status server + timestamp |

### Autentikasi

| Method | Path              | Proteksi | Keterangan |
| ------ | ----------------- | -------- | ---------- |
| POST   | `/api/auth/register` | Publik | Daftar user baru → `{ token, user }` |
| POST   | `/api/auth/login`  | Publik     | Login (email/username + password) → `{ token, user }` |
| POST   | `/api/auth/logout` | Publik     | Acknowledgment logout (stateless) |
| GET    | `/api/auth/me`     | `Bearer`   | Profil user saat ini |

### Riwayat & Analisis

| Method | Path                        | Proteksi | Keterangan |
| ------ | --------------------------- | -------- | ---------- |
| POST   | `/api/riwayat`              | `Bearer` | Buat riwayat analisis baru (`gambar`) |
| GET    | `/api/riwayat`              | `Bearer` | Daftar riwayat user (limit/offset) |
| GET    | `/api/riwayat/:id`          | `Bearer` | Detail riwayat (owner/admin) |
| POST   | `/api/riwayat/:id/analisis` | `Bearer` | Jalankan analisis (owner/admin) |

> ⚠️ **Catatan:** `/api/riwayat/:id/analisis` saat ini adalah **simulasi deterministik** (bukan model AI sungguhan). Hasil prediksi dihasilkan dari hash `gambar` → memetakan ke penyakit aktif + confidence acak ter-seed. Rakitan ini dimaksudkan sebagai *stub* sampai inferensi model nyata dihubungkan.

### Model

| Method | Path          | Proteksi | Keterangan |
| ------ | ------------- | -------- | ---------- |
| GET    | `/api/model`  | Publik   | Daftar model aktif |

### Data Penyakit (publik)

| Method | Path                                 | Keterangan |
| ------ | ------------------------------------ | ---------- |
| GET    | `/api/bagian-tubuh`                  | Daftar bagian tubuh untuk peta interaktif |
| GET    | `/api/sistem-tubuh/byBody/:idBody`   | Sistem tubuh + jumlah penyakit per bagian tubuh |
| GET    | `/api/penyakit/bySystemAndBody/:idBody/:idSystem` | Penyakit di bagian tubuh + sistem tubuh |
| GET    | `/api/penyakit/cari?q=...`           | Pencarian penyakit (nama/ringkasan, ILIKE + escape wildcard, max 50) |
| GET    | `/api/penyakit/:idPenyakit/konten`   | Artikel konten penyakit |
| GET    | `/api/penyakit/:idOrSlug`            | Detail lengkap penyakit (numeric ID atau slug) |
| GET    | `/api/penyakit/slug/:slug`           | Alias detail lengkap penyakit via slug |

### Proxy RAG

| Method | Path             | Keterangan |
| ------ | ---------------- | ---------- |
| POST   | `/api/rag/chat`  | Teruskan obrolan ke RAG API (`question`, opsional `session_id`, `history`) |

### Admin (role `admin`)

| Method | Path                            | Keterangan |
| ------ | ------------------------------- | ---------- |
| GET    | `/api/penyakit`                 | Daftar semua penyakit (dashboard admin) |
| POST   | `/api/penyakit`                 | Buat penyakit |
| PUT    | `/api/penyakit/:idPenyakit`     | Update penyakit |
| GET    | `/api/artikel`                  | Daftar artikel |
| PUT    | `/api/artikel/:idArtikel`       | Update artikel (bagian pertama) |
| GET    | `/api/artikel/:idArtikel/bagian`| Ambil semua bagian artikel |
| PUT    | `/api/artikel/:idArtikel/bagian`| Simpan semua bagian artikel (bulk sync) |
| GET    | `/api/sistem-tubuh`             | Daftar sistem tubuh (dropdown admin) |

## Autentikasi & Otorisasi

- Token disediakan pada `POST /api/auth/register` & `POST /api/auth/login`, berlaku **7 hari**.
- Kirim sebagai header: `Authorization: Bearer <token>`.
- Role dari token: `user` atau `admin`. Route admin divalidasi `verifyToken` + `requireRole("admin")`; role `admin` dapat mengakses semua route.
- Password di-hash dengan **bcryptjs** (salt 10) sebelum disimpan ke tabel `users`.

## Keamanan (perlindungan yang terpasang)

- `helmet` → security headers HTTP.
- `express-rate-limit` → limit global (120 req/menit) dan khusus `/api/auth` (20 req/15 menit).
- CORS dibatasi ke `CORS_ORIGIN`.
- Secret tidak punya fallback di production (fail-fast saat start).
- Error handler terpusat: di production tidak membocorkan stack trace; di development menyertakan `stack`.
- Route admin dipisahkan dan selalu butuh autentikasi + role.
- Semua query DB memakai parameter binding (`$1`, `$2`, …) — hindari interpolasi string.

## Pengembangan & Menambah Route

1. Tulis logika di `src/controllers/<resource>.controller.js`.
2. Daftarkan endpoint di `src/routes/<resource>.routes.js`.
3. Mount router di `src/routes/index.js`.
4. Tambahkan test di `src/api.test.js` (mock `../db/pg` & `global.fetch`).
5. Jalankan `npm test` dan `npm run dev`.

Contoh handler baru:

```js
const asyncHandler = require("../middlewares/async-handler");

router.get(
  "/foo",
  (req, res, next) => {
    // middleware opsional di sini
    next();
  },
  asyncHandler(async (req, res) => {
    const { query } = require("../db/pg");
    const { rows } = await query(
      `SELECT id, nama FROM foo WHERE id = $1`,
      [req.user.id],
    );
    res.json({ foo: rows });
  }),
);
```

## Pengujian

```bash
npm test
```

Test menggunakan jest + supertest dengan mock `../db/pg` (query) dan mock `global.fetch`, jadi tidak butuh koneksi database asli. Jalankan `npm run dev` (dengan `.env` terisi) bila ingin mencoba terhadap PostgreSQL sungguhan.