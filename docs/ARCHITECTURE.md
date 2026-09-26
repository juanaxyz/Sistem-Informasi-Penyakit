# Arsitektur & Alur Data

## Gambaran Umum

```
┌────────────────┐   HTTP/JSON   ┌───────────────────┐   SQL    ┌──────────────┐
│   Frontend SPA  │ ───────────> │  Server / BFF      │ ───────> │  PostgreSQL   │
│ React + Vite    │              │ Node.js + Express  │          │ capstone_paru │
│ :5173           │ <─────────── │ :4000/api/*        │ <─────── │              │
└────────────────┘   JSON        └─────────┬─────────┘          └──────────────┘
                                           │  HTTP (proxy)
                                           v
                                    ┌──────────────┐
                                    │  RAG API      │
                                    │ FastAPI :8000 │
                                    └──────────────┘
```

Desain ini memakai pola **BFF (Backend-for-Frontend)**: semua query database,
autentikasi, dan logika bisnis berada di server Express. Frontend hanya berbicara
HTTP/JSON melalui klien API (`frontend/src/lib/api.ts`), sehingga:

- Secret (password, JWT), koneksi DB, dan kebijakan otorisasi tidak bocor ke browser.
- Satu endpoint tunggal (`/api`) yang bisa dipakai kembali oleh aplikasi lain.
- Perilaku produksi (mis. hidden error) dikontrol satu titik di `error-handler`.

---

## Server (BFF) — `server/`

### Struktur Folder

```
server/
├── .env / .env.example        # konfigurasi lingkungan
├── db/schema.sql              # skema tambahan (users, riwayat, prediksi, artikel)
├── scripts/apply-schema.js    # CLI untuk menerapkan schema.sql
└── src/
    ├── server.js              # entry: listen(config.port)
    ├── app.js                 # perakitan Express (middleware global + routes)
    ├── config/index.js        # pembacaan & validasi env (satu titik akses)
    ├── db/pg.js               # Pool & query() dari `pg`
    ├── lib/jwt.js             # signToken / verifyToken
    ├── middlewares/
    │   ├── auth.js            # authMiddleware + requireRole
    │   ├── async-handler.js   # bungkus handler async (error otomatis → next)
    │   ├── error-handler.js   # normalisasi error → JSON
    │   └── rate-limit.js      # globalLimiter + authLimiter
    ├── routes/                # definisi HTTP route, mount handler
    ├── controllers/           # logika bisnis + query DB (satu file per domain)
    ├── utils/                 # helper: AppError, validators, many-to-many
    └── api.test.js            # suite tes (jest + supertest, DB dimock)
```

### Alur Permintaan

1. `helmet` → `cors` → `express.json({ limit: "1mb" })` → `globalLimiter`.
2. Pemetaan route `/api` (lihat `routes/index.js`); setiap sub-route mem-parsing
   params/body lalu memanggil handler controller.
3. Handler controller (di-bungkus `asyncHandler`) menjalankan query via
   `db/pg.query()`. Error dilempar sebagai `AppError(status, message)` atau
   diteruskan `next(err)`.
4. `notFoundHandler` (404) dan `errorHandler` mengubah error menjadi respons JSON.

### Error Handling

- Error operasional: `AppError` berisi `statusCode` + `isOperational = true`.
- Error unik database (`23505`, `duplicate key`): dipetakan ke **409**.
  - Constraint `users_(email|username)_key` → `"Email atau username sudah terdaftar"`.
  - Constraint lain (mis. `penyakit_code_key`, `penyakit_slug_key`) →
    `"Data sudah digunakan"` + nama constraint, sehingga pesan tidak menyesatkan.
- Di `production`, error non-operasional → `500 { error: "Internal server error" }`
  (stack trace disembunyikan); di `development` detail error ikut dikirim.

### Autentikasi & Otorisasi

- `POST /api/auth/register|login` → token JWT (payload `{ id, email, username, role }`,
  kedaluwarsa 7 hari). Password di-hash `bcrypt` (10 rounds).
- `authMiddleware` membaca `Authorization: Bearer <token>`, verifikasi JWT, lalu
  mengisi `req.user`.
- `requireRole("admin")` memastikan `req.user.role` admin. Role `admin` selalu lolos
  untuk semua pengecekan role.
- Rate limit khusus `/api/auth` (20 permintaan / 15 menit) untuk memperlambat brute force.

### Pola Relasi Banyak-ke-Banyak

Relasi pivot diimplementasikan satu tabel penghubung + pola "delete lalu insert ulang":

| Tabel pivot             | Induk        | Anak          | Dipakai di                            |
| ----------------------- | ------------ | ------------- | ------------------------------------- |
| `penyakit_bagian_tubuh` | `penyakit`   | `bagian_tubuh`| Panel admin (form penyakit)           |
| `penyakit_patogen`      | `penyakit` / `patogen` | sisi lawannya | Detail penyakit, detail patogen, admin |

Helper pusat `server/src/utils/many-to-many.js` — `replaceManyToMany(...)` —
menangani hapus-ulang + insert massal multi-baris. Nama tabel/kolom wajib berupa
konstanta internal (bukan input user) demi keamanan SQL injection.

### Skala & Konvensi Baru

- **Satu file controller per domain** (`auth`, `penyakit`, `patogen`, `artikel`,
  `riwayat`, `rag`, `model`, `dashboard`, `sistem-tubuh`). Tambah handler di file
  yang sama, ekspos via routes.
- **Helper dipusatkan**, bukan disalin antar-controller — contoh: ID positif
  divalidasi `validateId()` dari `utils/validators`; nilai opsional (ringkasan,
  code, thumbnail) dinormalisasi ke `NULL` agar tidak melanggar unique index.
- **Respons JSON konsisten**: data di bawah key domain (`{ penyakit }`,
  `{ patogen }`, `{ riwayat }`); error berupa `{ error }` (+ `details` bila perlu).
- Untuk domain baru berskala besar menuju *layering penuh*, evolusi alami:
  `controllers/` → tambah `services/` (logika bisnis) → `repositories/` (SQL).
  Jangan memaksakan lapisan sebelum dibutuhkan agar tetap mudah dipahami.

---

## Database — `capstone_paru`

### Tabel Utama

| Tabel                       | Peran                                                          |
| --------------------------- | -------------------------------------------------------------- |
| `users`                     | Akun pengguna (`user`/`admin`), password bcrypt                |
| `penyakit`                  | Master penyakit (nama, slug, ringkasan, thumbnail, `tingkat_urgensi`, `code` model) |
| `sistem_tubuh`              | Sistem organ (paru, pencernaan, saraf, ...)                    |
| `bagian_tubuh`              | Posisi tubuh pada peta (`depan`/`belakang`), untuk Body Map    |
| `patogen` + `penyakit_patogen` | Patogen penyebab (virus/bakteri/jamur/parasit) & relasi N-N  |
| `penyakit_bagian_tubuh`     | Relasi N-N penyakit ↔ bagian tubuh (Body Map multi-select)     |
| `artikel` + `artikel_bagian`| Artikel edukasi per penyakit, tersusun atas seksi (`tipe`, `urutan`) |
| `referensi`                 | Referensi/sumber tiap penyakit                                 |
| `riwayat`                   | Riwayat analisis gambar per user (`processing`/`completed`/`failed`) |
| `prediksi`                  | Hasil prediksi per model per riwayat                           |
| `model`                     | Daftar model AI aktif                                          |
| `faq` / `jenis_analisis` / `jenis_analisis_bagian_tubuh` | Master pendukung (digunakan RAG / alur analisis) |
| `knowledge_embeddings` | Lapisan vector khusus RAG: satu baris per **chunk** dari `artikel_bagian` / `faq` (256 token/chunk), `embedding VECTOR(384)` + index HNSW. Dimiliki `service/` (`service/db/schema.sql`) |

Catatan: `prediksi` ber-FK ke `model` dan `penyakit`; baris array bisa disisipkan
bulk. Detail kolom lihat `server/db/schema.sql` + definisi SELECT pada controller.

`artikel.konten` adalah kolom **legacy** yang kini kosong — konten artikel nyata
berada di `artikel_bagian`. Pembacaan mana pun (termasuk seeding RAG) harus lewat
`artikel_bagian`.

---

## Frontend — `frontend/`

### Struktur Folder

```
frontend/src/
├── main.tsx              # bootstrap: QueryClient + BrowserRouter + AuthProvider
├── App.tsx               # routing + layout (header, dock, footer, chat)
├── lib/
│   ├── api.ts            # klien API terpusat (get/post/put/del + ApiError)
│   └── types.ts          # tipe domain (Penyakit, Patogen, Riwayat, ...)
├── context/              # AuthProvider & base-types AuthContext
├── hooks/                # wrapper TanStack Query per domain (useDiseaseDetail, ...)
├── components/           # komponen UI reusable (bodyMap, ui/, SiteHeader, ...)
├── pages/                # satu file per halaman/route
└── react-bits/           # komponen pihak ketiga yang di-vendor (Dock)
```

### Alur Data

1. **Halaman** memanggil **hook** (`hooks/`) atau langsung `api.*`.
2. `lib/api.ts` menambah header `Authorization` otomatis dari
   `localStorage["token"]` dan melempar `ApiError{ status, message }` bila respons
   bukan `2xx`.
3. **TanStack Query** mengelola cache/key (`["penyakit","slug",slug]`, ...) dan
   invalidasi agar UI selalu sinkron setelah mutasi (mis. habis simpan admin).
4. **AuthContext** menyimpan `user` + `token`, memuat profil saat start
   (`api.auth.me()`), dan membersihkan sesi bila token tidak valid.

### Konvensi & Skalabilitas

- **Semua pemanggilan network lewat `api` client** — jangan `fetch` langsung di halaman.
- **Tipe domain hidup di `lib/types.ts`**, diimpor dengan `import type`.
  Hindari `any` pada payload API; payload admin (mis. form penyakit) disusun
  menjadi `PenyakitFormPayload` sebelum dikirim.
- **Hook per domain** membungkus query; tambahkan hook baru bila domain lain
  memakai query yang sama.
- **Chunk besar (~777 kB)** — saat fitur bertambah, terapkan *code-splitting*
  (`React.lazy`/`Suspense`) per halaman dan perbesar `build.chunkSizeWarningLimit`
  agar bundle tetap ringan.

---

## Layanan Python (`service/`)

Satu service Python/FastAPI yang menggabungkan dua kemampuan, di folder
`service/` (sebelumnya dua folder terpisah: `RAG/` dan `Analisis/`).

- **RAG Chat**: menjawab pertanyaan pengguna dengan *retrieval* dari basis
  pengetahuan (tabel `knowledge_embeddings` di PostgreSQL/pgvector yang sama +
  Gemini). BFF meneruskan `POST /api/rag/chat`.
  Lihat `service/README.md` & `service/RAG_ARCHITECTURE.md`.
- **Analisis Citra**: **1 endpoint** `POST /api/prediksi` menerima **1 gambar**
  (`multipart`, field `image`) dan mengembalikan **3 hasil dari 3 model berbeda**
  (`{ predictions: [ { model_id, nama_model, versi, label, confidence } ], stub }`).

Catatan teknis analisis citra:

- Registri model + labels di `service/app/config.py` (`MODELS`); inferensi
  memakai `onnxruntime` (`service/app/services/model_loader.py`). Tanpa file
  `.onnx`, aktifkan `ALLOW_STUB=1` untuk hasil deterministik pengembangan
  (ditandai `stub: true`).
- BFF memanggil endpoint via `MODEL_API_URL` (default mengikuti `RAG_API_URL`,
  keduanya `http://localhost:8000` — satu service), lalu auto-sync tabel `model`,
  memetakan `label` → `penyakit` (alias di `riwayat.controller.js`), dan
  menyimpan baris `prediksi`.

Alur analisis: `frontend upload multipart gambar` → `POST /api/riwayat`
(multer, tersimpan di `server/uploads/`, statis `/uploads/*`) →
`POST /api/riwayat/:id/analisis` → BFF kirim bytes gambar ke service
`/api/prediksi` → 3 hasil disimpan → `GET /api/riwayat/:id` mengembalikan `predictions`.