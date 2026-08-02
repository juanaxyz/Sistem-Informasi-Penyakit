# Web Paru Paru — Sistem Informasi Penyakit (Body Map Interaktif)

Web informasi penyakit untuk masyarakat umum. Pengguna bisa mencari informasi
penyakit lewat **tiga jalur**:

1. **Body map interaktif** — klik area tubuh pada ilustrasi manusia (depan/belakang),
2. **Sistem tubuh** — pilih kategori fungsional (mis. "sistem pencernaan"),
3. **Pencarian teks** — ketik nama penyakit/gejala.

Ketiganya mengarah ke halaman detail penyakit yang sama (masuk roadmap, lihat
bagian [Roadmap](#roadmap)).

> Bukan alat diagnosis/prediksi AI dan bukan pengganti konsultasi dokter.
> Konten medis divalidasi dari sumber resmi (WHO, Kemenkes RI, CDC) dan
> disiapkan manual oleh pemilik project.

## Status proyek

| Fase | Status |
|---|---|
| FASE 0 — Project Init & Body Map Statis | ✅ Selesai |
| FASE 1 — Backend & Database (Express + PostgreSQL lokal) | ✅ Selesai |
| FASE 2 — Data Layer (Hooks) | ✅ Selesai |
| FASE 3 — Integrasi Body Map ke Database | ✅ Selesai |
| FASE 4 — Pencarian & Sistem Tubuh | ⏭️ Berikutnya |
| FASE 5–6 | 📋 Di `context/TASKS.md` |

Backend memakai **Express + PostgreSQL lokal** (keputusan final, 01 Aug 2026);
rencana Supabase dibatalkan. Saat ini `App.tsx` merender `BodyMap` yang **sudah
terhubung ke API**: klik bagian tubuh → daftar penyakit (nama, ringkasan, badge
urgensi) dengan state loading/error/empty. Data dummy 19 penyakit dari hasil
migrasi `004_redesign_indonesia.sql` dipertahankan untuk pengembangan.

## Tech stack

| Layer | Teknologi |
|---|---|
| Frontend | React 19 + TypeScript, dibangun dengan Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + CSS Modules |
| Backend | Express 5 + TypeScript (`server/`), dijalankan via `tsx` |
| Database | PostgreSQL (diakses via `pg` connection pool) |
| State | React built-in (`useState`/`useEffect`) — tanpa Redux/Zustand |
| Routing | `react-router-dom` (dijadwalkan FASE 5) |

## Prasyarat

- **Node.js 20.19+ atau 22.12+** (syarat Vite 8; proyek dikembangkan di Node 24)
- **npm** (disertakan Node.js)
- **PostgreSQL 14+** — hanya dibutuhkan untuk menjalankan backend

## Setup & menjalankan

### 1. Frontend (Vite dev server)

```bash
npm install
npm run dev
```

Dev server berjalan di `http://localhost:5173`.

### 2. Backend (Express API — port 4000)

```bash
cd server
npm install
cp .env.example .env    # lalu isi DATABASE_URL
npm run db:setup        # opsional: buat schema + data dummy di PostgreSQL
npm run dev
```

API berjalan di `http://localhost:4000`. Server dan frontend adalah **dua
proses terpisah**. Detail setup database ada di `server/README.md`.

### 3. Menghubungkan frontend ke API

Default `API_BASE` di frontend adalah `/api` (same-origin). Vite dev server
sudah dikonfigurasi **proxy** `/api` → `http://localhost:4000`
(lihat `vite.config.ts`), jadi di development tidak perlu file `.env`.

Alternatif (jika tidak memakai proxy): set `VITE_API_URL=http://localhost:4000`
di file `.env` root — frontend akan memanggil `http://localhost:4000/api/...`
(`VITE_API_URL` + `/api`). CORS sudah diaktifkan di server.

## Scripts yang tersedia

Root (frontend):

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Vite dev server (HMR) |
| `npm run build` | Type-check (`tsc -b`) lalu build produksi ke `dist/` |
| `npm run preview` | Preview hasil build produksi |
| `npm run lint` | ESLint untuk `.ts`/`.tsx` |

`server/` (backend):

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan API dengan auto-restart (`tsx watch`) di port 4000 |
| `npm start` | Jalankan API tanpa auto-restart |
| `npm run typecheck` | Cek tipe TypeScript (`tsc --noEmit`) |
| `npm run db:setup` | Terapkan migrasi + seed data dummy |
| `npm test` | Test kontrak API (`vitest`; butuh database lokal aktif) |

> Catatan: server punya test kontrak API — `cd server && npm test` (membutuhkan
> database aktif; memakai `supertest` langsung terhadap `createApp()`).

## Struktur folder

```
web_paru_paru_final/
├── AGENTS.md                     # panduan untuk AI agent / kolaborator
├── context/                      # dokumen produk & teknis (PRD, PROJECT, DATABASE, DESIGN, TASKS, frontend-architecture)
│   └── frontend-architecture.md  # arsitektur frontend pasca-refactor (wajib dibaca kontributor)
├── logs/                         # catatan sesi kerja (satu file per sesi)
├── public/
│   └── images/
│       ├── front.png             # overlay realistis body map sisi depan
│       └── back.png              # overlay realistis body map sisi belakang
├── server/                       # backend Express + PostgreSQL (port 4000)
│   ├── src/
│   │   ├── index.ts              # entry server (env, listen, graceful shutdown)
│   │   ├── app.ts                # factory aplikasi Express (semua router di bawah /api)
│   │   ├── config/               # env.ts (validasi env), database.ts (pg.Pool), dbClient.ts (query())
│   │   ├── middleware/           # errorHandler, notFound, requestLogger
│   │   ├── routes/               # health, bodyParts, bodySystems, diseases, search (kebab-case)
│   │   ├── repositories/         # query SQL terpisah dari handler (bodyPartsRepo, diseasesRepo, dsb.)
│   │   └── utils/                # asyncHandler, httpError, params (validasi ID)
│   ├── migrations/               # SQL migrasi (schema + seed dummy)
│   ├── scripts/db-setup.mjs      # runner migrasi
│   └── .env.example
├── src/
│   ├── assets/
│   │   └── body-parts.ts         # data statis body map (path SVG) — ⚠️ JANGAN DIUBAH
│   ├── components/
│   │   └── bodyMap/
│   │       ├── BodyMap.tsx       # komponen body map dua sisi (depan/belakang)
│   │       └── BodyMap.module.css
│   ├── hooks/                    # 6 hooks data + useFetch generik
│   ├── lib/
│   │   ├── api.ts                # API_BASE, api(), isAbortError()
│   │   └── types.ts              # tipe respons API bersama
│   ├── App.tsx                   # saat ini hanya merender <BodyMap />
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.ts                # plugin react + tailwindcss
```

## Cara kerja (alur data)

**Kondisi sekarang (FASE 3, body map terhubung ke API):**

```
BodyMap.tsx ──import──> src/assets/body-parts.ts   (array { face, name, id, d } — geometri SVG, jangan diubah)
      │
      ├─ BodyPart  : render <path d={part.d}> + tooltip nama
      ├─ BodySide  : satu kolom (Depan / Belakang)
      ├─ BodyContainer : overlay front.png / back.png + <svg viewBox>
      │
      └─ klik bagian tubuh ──> useDiseasesByBodyPart(id) ──> daftar penyakit (nama, ringkasan, tingkat_urgensi)
```

**Lapisan data (dipakai komponen, termasuk BodyMap):**

```
Komponen UI
    │  memakai hooks data
    ▼
src/hooks/  (useBodyParts, useBodySystems, useDiseasesByBodyPart,
             useDiseasesByBodySystem, useDiseaseDetail, useSearchDiseases)
    │  semuanya dibangun di atas useFetch
    ▼
src/hooks/useFetch.ts  (fetch on path-change, abort request basi, debounce)
    │
    ▼
src/lib/api.ts  (api<T>() → fetch(`${API_BASE}${path}`), isAbortError)
    │
    ▼
Express API (server/) — semua router di mount di bawah /api (server/src/app.ts)
    │  query() terparameterisasi via pg.Pool
    ▼
PostgreSQL
```

Kontrak tiap hook stabil: **`{ data, loading, error }`** (khusus pencarian
ditambah `activeQuery`). Detail lengkap: `context/frontend-architecture.md`.

Endpoint yang tersedia (semua `GET`, MVP read-only):

| Endpoint | Fungsi |
|---|---|
| `/api/health` | Status API + koneksi database (200 `{ status: 'ok', database: 'up' }`; 503 bila DB down) |
| `/api/body-parts/filter?tampilan=depan|belakang` | Bagian tubuh (filter opsional) |
| `/api/body-systems` | Sistem tubuh |
| `/api/body-systems/:id/diseases` | Penyakit pada satu sistem tubuh |
| `/api/diseases/by-body-part/:id` | Penyakit terkait satu bagian tubuh |
| `/api/diseases/:id` | Detail penyakit (`null` bila tidak ada; termasuk `sistem_tubuh`, `konten[]`, `bagian_tubuh[]`, `referensi[]`) |
| `/api/search?q=` | Pencarian nama/ringkasan penyakit |

Respons error konsisten `{ error: { message } }` (mis. 404 untuk endpoint
tidak dikenal). Nama endpoint memakai kebab-case canonical — alias legacy
(`/api/bodyParts`, `/api/bodySystems`, `/api/diseases` tanpa prefix, `/api/search`
kuno) **tidak lagi tersedia** (404).

## Roadmap

Lihat `context/TASKS.md` untuk detail acceptance criteria tiap fase:

- **FASE 1** — Backend & Database (Express + PostgreSQL lokal) ✅
- **FASE 2** — Data layer hooks ✅
- **FASE 3** — Integrasi body map ke database (klik → daftar penyakit) ✅
- **FASE 4** — Fitur pencarian & sistem tubuh
- **FASE 5** — Halaman detail + routing (`react-router-dom`)
- **FASE 6** — Polish (empty/loading/error state, responsive, README)

## Dokumen referensi

| Dokumen | Isi |
|---|---|
| `context/frontend-architecture.md` | Arsitektur frontend pasca-refactor |
| `server/README.md` | Dokumentasi backend (setup, migrasi, endpoint) |
| `context/PRD.md` | Kebutuhan produk |
| `context/PROJECT.md` | Stack & struktur folder |
| `context/DATABASE.md` | Skema PostgreSQL (referensi) |
| `context/DESIGN.md` | Spesifikasi body map |
| `context/TASKS.md` | Rencana fase implementasi |

## Aturan penting

- UI berbahasa **Indonesia**, sederhana, hindari jargon medis berat.
- **Jangan ubah data `d` (path SVG) di `src/assets/body-parts.ts`** — itu geometri area tubuh.
- Tanpa fitur diagnosis/prediksi AI; tanpa operasi tulis dari client (MVP read-only).
- Tanpa secret/kunci Supabase di kode client.
