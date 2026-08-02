# web-paru-paru-api

Backend REST API untuk aplikasi web "Paru Paru" (informasi kesehatan paru-paru).
Dibangun dengan **Express 5 + PostgreSQL (`pg`)** dan TypeScript, dijalankan via `tsx`.

> MVP bersifat read-only: semua endpoint hanya `GET`. Tidak ada fitur
> diagnosis/prediksi AI dan tidak ada operasi create/update/delete dari klien.

## Tech stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js 18+ (dikembangkan di Node 24) |
| Framework | Express 5 |
| Database | PostgreSQL 14+ |
| Driver | `pg` (node-postgres) dengan connection pool |
| Bahasa | TypeScript, dijalankan langsung dengan `tsx` |
| Keamanan | `helmet` (HTTP security headers) |
| Lainnya | `cors`, `dotenv` |
| Testing | `vitest` + `supertest` |

## Struktur folder

```
server/
├── src/
│   ├── index.ts              # entry: env, listen, cek DB saat startup, graceful shutdown
│   ├── app.ts                # factory aplikasi Express (middleware + routes)
│   ├── config/
│   │   ├── env.ts            # validasi & konfigurasi lingkungan terpusat (fail-fast)
│   │   ├── database.ts       # pg.Pool (koneksi database)
│   │   └── dbClient.ts       # helper query() terparameterisasi
│   ├── middleware/
│   │   ├── errorHandler.ts   # respons error JSON konsisten + mapping error pg
│   │   ├── notFound.ts       # 404 untuk /api/* yang tidak dikenal
│   │   └── requestLogger.ts  # log satu baris per request (method, path, status, durasi)
│   ├── routes/
│   │   ├── index.ts          # mount semua router canonical (kebab-case)
│   │   ├── health.ts         # /api/health
│   │   ├── bodyParts.ts      # /api/body-parts
│   │   ├── bodySystems.ts    # /api/body-systems
│   │   ├── diseases.ts       # /api/diseases
│   │   └── search.ts         # /api/search
│   ├── repositories/         # lapisan akses data (query SQL) terpisah dari handler
│   │   ├── bodyPartsRepo.ts
│   │   ├── bodySystemsRepo.ts
│   │   ├── diseasesRepo.ts
│   │   ├── searchRepo.ts
│   │   └── types.ts          # tipe baris hasil query (kontrak respons)
│   └── utils/
│       ├── asyncHandler.ts   # pembungkus handler async → error middleware
│       ├── httpError.ts      # HttpError, NotFoundError, helper notFound()
│       └── params.ts         # validasi ID parameter path
├── migrations/               # file SQL berurutan (001_create_schema, 002_seed_dummy,
│                             #   003_seed_dummy, 004_redesign_indonesia, 005_search_indexes)
├── scripts/
│   └── db-setup.mjs          # runner migrasi (pg + tabel schema_migrations)
├── src/app.test.ts           # test kontrak API (vitest + supertest)
├── src/setupTests.ts         # memuat dotenv sebelum test (baca server/.env)
├── vitest.config.ts          # konfigurasi vitest
├── .env.example              # contoh variabel lingkungan (tanpa nilai rahasia)
├── tsconfig.json
└── package.json
```

## Setup & instalasi

```bash
cd server
npm install
```

1. Salin `.env.example` menjadi `.env` lalu isi nilainya:

```bash
cp .env.example .env
```

2. Isi variabel di `.env` (lihat bagian "Variabel lingkungan").

3. Siapkan database (buat schema + data dummy):

```bash
npm run db:setup
```

## Variabel lingkungan

| Variabel | Wajib | Deskripsi | Contoh |
|---|---|---|---|
| `DATABASE_URL` | Ya | Connection string PostgreSQL | `postgres://user:pass@localhost:5432/web_paru_paru` |
| `PORT` | Tidak | Port API (default `4000`) | `4000` |
| `NODE_ENV` | Tidak | `development` (default), `test`, atau `production` | `development` |
| `DATABASE_SSL` | Tidak | `true` mengaktifkan SSL (mis. layanan cloud) | `true` |

`DATABASE_URL` boleh kosong hanya saat `NODE_ENV=test`. Validasi dilakukan
fail-fast di `src/config/env.ts`. Jangan pernah commit nilai asli ke git —
`.env` sudah masuk `.gitignore`.

## Menjalankan server

```bash
npm run dev        # dev mode + auto-restart (tsx watch) di http://localhost:4000
npm start          # tanpa auto-restart
npm run typecheck  # cek tipe TypeScript (tsc --noEmit)
npm test           # test kontrak API (vitest run; butuh database aktif)
npm run lint       # ESLint (dijalankan dari root repo: npm run lint)
```

## Database & migrasi

- Skema ada di `migrations/*.sql`, diterapkan urut sesuai nama file.
- `npm run db:setup` memakai driver `pg` (bukan `psql`), mencatat migrasi
  yang sudah jalan di tabel `schema_migrations`, dan setiap file migrasi
  dijalankan dalam satu transaksi.
- Jika database sudah memiliki skema inti (mis. hasil setup lama),
  migrasi yang ada otomatis ditandai sebagai baseline (tidak dijalankan ulang).
- Semua tabel memiliki RLS dengan policy `SELECT` publik (read-only).

## Endpoint API

Semua respons sukses berupa array (daftar) atau objek (detail). Respons error
berupa `{ "error": { "message": "..." } }`.

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/api/health` | Status API + koneksi DB: `{ status: 'ok', database: 'up' }` (atau `503` bila DB down) |
| GET | `/api/body-parts` | Semua bagian tubuh |
| GET | `/api/body-parts/filter?tampilan=depan` | Filter bagian tubuh (`tampilan`: depan/belakang; kosong = semua) |
| GET | `/api/body-systems` | Semua sistem tubuh |
| GET | `/api/body-systems/:systemId/diseases` | Penyakit pada satu sistem tubuh |
| GET | `/api/diseases/by-body-part/:bodyPartId` | Penyakit terkait satu bagian tubuh |
| GET | `/api/diseases/:id` | Detail penyakit: `{...penyakit, sistem_tubuh, konten[], bagian_tubuh[], referensi[]}` (`null` bila tidak ditemukan) |
| GET | `/api/search?q=` | Cari penyakit berdasarkan `nama`/`ringkasan` (LIKE case-insensitive, max 50) |

Kolom yang dipakai di respons ringkas: `id`, `nama`, `ringkasan`,
`tingkat_urgensi` (`normal`/`waspada`/`darurat`).

## Konvensi kode

- Bahasa respons: **Bahasa Indonesia**.
- Handler route memanggil **repository** (`src/repositories/*Repo.ts`); query
  SQL tidak ditulis langsung di handler.
- Semua query memakai helper `query()` di `config/dbClient.ts`
  (parameterized → aman dari SQL injection, via connection pool).
- Handler async dibungkus `asyncHandler`; error dilempar ke `errorHandler`
  sebagai `{ error: { message } }`.
- ID path divalidasi (`parseIdParam`) → `400` bila tidak valid.
- Error `pg` dipetakan di `errorHandler` (mis. kode `22P02` → `400`); di
  `NODE_ENV=production` pesan internal tidak bocor.
- Konfigurasi lingkungan dibaca terpusat dari `config/env.ts` (fail-fast saat
  variabel wajib tidak valid).
- Tanpa operasi tulis (MVP read-only). Tambah endpoint baru = tambah file
  router di `src/routes/` dan mount di `src/routes/index.ts`.

## Testing

Test kontrak API memakai **Vitest + Supertest** (butuh database lokal aktif):

```bash
npm test
```

- `src/app.test.ts` — memanggil `supertest(createApp())` langsung (tanpa
  `listen`) dan menguji **bentuk** respons (status code + struktur field),
  bukan isi data (data dummy bisa berubah).
- `src/setupTests.ts` — memuat `dotenv` agar `DATABASE_URL` terbaca dari
  `server/.env`; didaftarkan lewat `setupFiles` di `vitest.config.ts`.
- Kontrak yang diuji: `/api/health`, `/api/body-systems`, `/api/body-parts`
  (+ filter `tampilan`), `/api/diseases/by-body-part/:id`, `/api/diseases/:id`
  (termasuk `null` saat tidak ditemukan dan `400` untuk ID tidak valid),
  `/api/search` (dengan dan tanpa `q`), serta 404 untuk path tidak dikenal
  dan alias legacy yang sudah dihapus (`/api/bodyParts`).
