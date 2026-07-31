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
| Lainnya | `cors`, `dotenv` |

## Struktur folder

```
server/
├── src/
│   ├── index.ts              # entry: env, listen, cek DB saat startup, graceful shutdown
│   ├── app.ts                # factory aplikasi Express (middleware + routes)
│   ├── config/
│   │   ├── database.ts       # pg.Pool (koneksi database)
│   │   └── dbClient.ts       # helper query() terparameterisasi
│   ├── middleware/
│   │   ├── errorHandler.ts   # respons error JSON yang konsisten
│   │   └── notFound.ts       # 404 untuk /api/* yang tidak dikenal
│   ├── routes/
│   │   ├── index.ts          # mount semua router + alias legacy
│   │   ├── bodyParts.ts      # /api/body-parts
│   │   ├── bodySystems.ts    # /api/body-systems
│   │   ├── diseases.ts       # /api/diseases
│   │   └── search.ts         # /api/search
│   └── utils/
│       ├── asyncHandler.ts   # pembungkus handler async → error middleware
│       ├── httpError.ts      # error HTTP eksplisit (4xx)
│       └── params.ts         # validasi ID parameter path
├── migrations/               # file SQL berurutan (001_create_schema, 002_seed_dummy)
├── scripts/
│   └── db-setup.mjs          # runner migrasi (pg + tabel schema_migrations)
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
| `PORT` | Tidak | Port API (default `4000`) | `4000` |
| `DATABASE_URL` | Ya | Connection string PostgreSQL | `postgres://user:pass@localhost:5432/web_paru_paru` |

Jangan pernah commit nilai asli ke git — `.env` sudah masuk `.gitignore`.

## Menjalankan server

```bash
npm run dev        # dev mode + auto-restart (tsx watch) di http://localhost:4000
npm start          # tanpa auto-restart
npm run typecheck  # cek tipe TypeScript (tsc --noEmit)
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
| GET | `/api/body-parts` | Semua bagian tubuh |
| GET | `/api/body-parts/filter?side=&gender=` | Filter bagian tubuh (`side`: depan/belakang, `gender`: pria/wanita/netral) |
| GET | `/api/body-systems` | Semua sistem tubuh |
| GET | `/api/body-systems/:systemId/diseases` | Penyakit pada satu sistem tubuh |
| GET | `/api/diseases/by-body-part/:bodyPartId` | Penyakit terkait satu bagian tubuh |
| GET | `/api/diseases/:id` | Detail penyakit (`null` bila tidak ditemukan) |
| GET | `/api/search?q=` | Cari penyakit berdasarkan nama/deskripsi (max 50) |

Alias deprecated (kompatibilitas mundur): `/api/bodyParts`, `/api/bodySystems`
dan `/api/diseases/search`.

## Konvensi kode

- Bahasa respons: **Bahasa Indonesia**.
- Semua query memakai helper `query()` di `config/dbClient.ts`
  (parameterized → aman dari SQL injection, via connection pool).
- Handler async dibungkus `asyncHandler`; error dilempar ke
  `errorHandler` sebagai `{ error: { message } }`.
- ID path divalidasi (`parseIdParam`) → `400` bila tidak valid.
- Tanpa operasi tulis (MVP read-only). Tambah endpoint baru = tambah file
  router di `src/routes/` dan mount di `src/routes/index.ts`.
