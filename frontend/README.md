# Web Paru Paru — Sistem Informasi Penyakit (Body Map Interaktif)

Web informasi penyakit untuk masyarakat umum. Pengguna mencari informasi
penyakit lewat **body map interaktif** (klik area tubuh, lalu pilih sistem
tubuh terlebih dahulu untuk melihat daftar penyakitnya — wajib) atau
**pencarian teks**. Keduanya mengarah ke halaman detail penyakit yang sama
(konten edukasi, gambar, bagian tubuh terdampak, referensi medis).

> Bukan alat diagnosis/prediksi AI dan bukan pengganti konsultasi dokter.
> Konten medis divalidasi dari sumber resmi (WHO, Kemenkes RI, CDC).

## Status proyek

Semua fase fitur selesai. Tersisa: penggantian data dummy dengan data medis
final yang dikonfirmasi pemilik project (WHO/Kemenkes RI/CDC).

## Arsitektur

- **Frontend** (`frontend/`) — React 19 + Vite 8 + TypeScript + Tailwind v4 +
  shadcn/ui + `@tanstack/react-query`. Semua data lewat `fetch` ke BFF
  (`src/lib/api.ts`); **tidak** query Supabase langsung.
- **Server BFF** (`server/`) — Express + Supabase (CommonJS). Menyajikan route
  `/api` untuk bagian tubuh, sistem tubuh, penyakit, pencarian, dan detail.
  Env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT`, `CORS_ORIGIN`.

Alur data:

```
Komponen UI (BodyMap, ResultsPanel, SearchTab, DiseaseDetailPage)
    ▼
src/hooks/*  (react-query: useBodyParts, useSystemsByBodyPart,
              useDiseasesByBodyPartAndSystem, useSearchDiseases,
              useDiseaseDetail)
    ▼
src/lib/api.ts  (fetch ke VITE_API_URL, default http://localhost:4000)
    ▼
server/src/server.js  (Express BFF) → Supabase PostgREST (RLS public-read)
    ▼
PostgreSQL (sistem_tubuh, bagian_tubuh, penyakit, konten_penyakit,
           gambar_konten, penyakit_bagian_tubuh, referensi)
```

## Prasyarat

- **Node.js 20.19+ atau 22.12+** (syarat Vite 8; proyek dikembangkan di Node 24)
- **npm**
- Project Supabase (URL + anon key) untuk server BFF

## Setup & menjalankan

Dua terminal — server dulu, baru frontend:

```bash
# Terminal 1 — server BFF (http://localhost:4000)
cd server
npm install
cp .env.example .env   # isi SUPABASE_URL + SUPABASE_ANON_KEY (+ PORT, CORS_ORIGIN)
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install
cp .env.example .env   # isi VITE_API_URL (opsional; default http://localhost:4000)
npm run dev
```

### Env frontend

`VITE_API_URL` — base URL server BFF (default `http://localhost:4000`).

### Env server

`SUPABASE_URL`, `SUPABASE_ANON_KEY` (anon/publishable key — aman di server;
RLS membatasi akses ke public SELECT, **jangan** pakai service_role),
`PORT` (default 4000), `CORS_ORIGIN` (origin yang diizinkan, koma-pisah;
default reflect origin).

## Scripts

| Folder | Perintah | Fungsi |
|---|---|---|
| frontend | `npm run dev` | Vite dev server (HMR) |
| frontend | `npm run build` | Type-check (`tsc -b`) lalu build ke `dist/` |
| frontend | `npm run lint` | ESLint `.ts`/`.tsx` |
| frontend | `npm run preview` | Preview hasil build |
| server | `npm run dev` | `nodemon --exec tsx src/server.js` (watch) |
| server | `npm start` | `tsx src/server.js` |

## Struktur folder

```
web_paru_paru_final/
├── frontend/
│   ├── src/
│   │   ├── assets/body-parts.ts     # data statis body map (path SVG) — ⚠️ JANGAN DIUBAH
│   │   ├── components/              # UI + bodyMap/ (BodyMap.tsx, BodyMap.module.css)
│   │   ├── hooks/                   # react-query hooks (data via api.ts)
│   │   ├── lib/                     # api.ts (client BFF), types.ts, utils.ts (cn)
│   │   ├── pages/                   # HomePage, DiseaseDetailPage
│   │   ├── App.tsx                  # router
│   │   ├── main.tsx                 # QueryClientProvider + BrowserRouter
│   │   └── index.css                # Tailwind v4 + token warna
│   ├── public/images/               # front.png, back.png (overlay body map)
│   ├── public/uploads/penyakit/     # gambar konten edukasi
│   └── logs/                        # catatan sesi kerja (satu file per sesi)
└── server/
    ├── src/server.js                # seluruh endpoint /api (Express BFF + Supabase)
    └── .env(.example)
```

## Aturan penting

- UI berbahasa **Indonesia**, sederhana, hindari jargon medis berat.
- **Jangan ubah data `d` (path SVG) di `src/assets/body-parts.ts`** — itu geometri area tubuh.
- Tanpa operasi tulis dari client (MVP read-only); tanpa secret (service_role) di kode client.
- Kontrak hook stabil: `{ data, isLoading, error, refetch }` (react-query).
