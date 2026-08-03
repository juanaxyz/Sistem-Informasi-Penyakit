# Web Paru Paru — Sistem Informasi Penyakit (Body Map Interaktif)

Web informasi penyakit untuk masyarakat umum. Pengguna bisa mencari informasi
penyakit lewat **tiga jalur**:

1. **Body map interaktif** — klik area tubuh pada ilustrasi manusia (depan/belakang),
2. **Sistem tubuh** — pilih kategori fungsional (mis. "sistem pencernaan"),
3. **Pencarian teks** — ketik nama penyakit/gejala.

Ketiganya mengarah ke halaman detail penyakit yang sama (konten edukasi,
gambar, bagian tubuh terdampak, dan referensi medis).

> Bukan alat diagnosis/prediksi AI dan bukan pengganti konsultasi dokter.
> Konten medis divalidasi dari sumber resmi (WHO, Kemenkes RI, CDC) dan
> disiapkan manual oleh pemilik project.

## Status proyek

| Fase | Status |
|---|---|
| FASE 0 — Project Init & Body Map Statis | ✅ Selesai |
| FASE 1 — Database (skema Indonesia) | ✅ Selesai |
| FASE 2 — Data Layer (Hooks) | ✅ Selesai |
| FASE 3 — Integrasi Body Map ke Database | ✅ Selesai |
| FASE 4 — Pencarian & Sistem Tubuh | ✅ Selesai |
| FASE 5 — Halaman Detail & Routing | ✅ Selesai |
| FASE 6 — Polish | ✅ Selesai |

Arsitektur data: **frontend query Supabase langsung** (PostgREST, RLS
public-read) via `@supabase/supabase-js`; backend Express + PostgreSQL lokal
**dihapus** (03 Aug 2026). Deploy: **Vercel** (statis). Data di Supabase:
4 sistem tubuh, 73 bagian tubuh, 48 penyakit, 137 blok konten, 62 gambar,
108 relasi penyakit–bagian tubuh, 37 referensi.

## Tech stack

| Layer | Teknologi |
|---|---|
| Frontend | React 19 + TypeScript, dibangun dengan Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + CSS Modules |
| Data | Supabase (PostgreSQL via PostgREST), RLS public-read |
| State | React built-in (`useState`/`useEffect`) — tanpa Redux/Zustand |
| Routing | `react-router-dom` |
| Hosting | Vercel (static, `dist/`) |

## Prasyarat

- **Node.js 20.19+ atau 22.12+** (syarat Vite 8; proyek dikembangkan di Node 24)
- **npm** (disertakan Node.js)
- Akses ke project Supabase (URL + anon key)

## Setup & menjalankan

```bash
npm install
cp .env.example .env   # lalu isi VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Dev server berjalan di `http://localhost:5173`. Data langsung dari Supabase —
tidak perlu database/backend lokal.

### Env

`.env` (lihat `.env.example`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`VITE_SUPABASE_ANON_KEY` adalah anon/publishable key — aman di browser karena
RLS membatasi akses (public SELECT). **Jangan** memakai service_role key di
kode client.

## Scripts yang tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Vite dev server (HMR) |
| `npm run build` | Type-check (`tsc -b`) lalu build produksi ke `dist/` |
| `npm run preview` | Preview hasil build produksi |
| `npm run lint` | ESLint untuk `.ts`/`.tsx` |

## Struktur folder

```
web_paru_paru_final/
├── AGENTS.md                     # panduan untuk AI agent / kolaborator
├── context/                      # dokumen produk & teknis (PRD, PROJECT, DATABASE, DESIGN, TASKS, frontend-architecture, ROUTES)
├── logs/                         # catatan sesi kerja (satu file per sesi)
├── public/
│   ├── images/
│   │   ├── front.png             # overlay realistis body map sisi depan
│   │   └── back.png              # overlay realistis body map sisi belakang
│   └── uploads/penyakit/         # gambar konten edukasi (dipakai gambar_konten.url_gambar)
├── src/
│   ├── assets/
│   │   └── body-parts.ts         # data statis body map (path SVG) — ⚠️ JANGAN DIUBAH
│   ├── components/
│   │   └── bodyMap/
│   │       ├── BodyMap.tsx       # komponen body map dua sisi (depan/belakang)
│   │       └── BodyMap.module.css
│   ├── hooks/                    # useSupabaseQuery (generik) + 6 hooks domain
│   ├── lib/
│   │   ├── supabase.ts           # client Supabase (anon key) + isAbortError()
│   │   └── types.ts              # tipe data bersama (Disease, DiseaseDetail, …)
│   ├── App.tsx                   # router (HomePage, DiseaseDetailPage, fallback)
│   ├── main.tsx
│   └── index.css
├── .env.example
├── index.html
├── package.json
└── vite.config.ts                # plugin react + tailwindcss
```

## Cara kerja (alur data)

```
Komponen UI (BodyMap, list, search, detail)
    │  memakai hooks domain
    ▼
src/hooks/  (useBodyParts, useBodySystems, useDiseasesByBodyPart,
             useDiseasesByBodySystem, useDiseaseDetail, useSearchDiseases)
    │  semuanya dibangun di atas useSupabaseQuery
    ▼
src/hooks/useSupabaseQuery.ts  (re-query on deps-change, abort request basi, debounce)
    │
    ▼
src/lib/supabase.ts  (client anon) → Supabase PostgREST (RLS public-read)
    │
    ▼
PostgreSQL (sistem_tubuh, bagian_tubuh, penyakit, konten_penyakit,
           gambar_konten, penyakit_bagian_tubuh, referensi)
```

Kontrak tiap hook stabil: **`{ data, loading, error }`** (khusus pencarian
ditambah `activeQuery`). Detail lengkap: `context/frontend-architecture.md`.

Akses data per hook dan detail query — **kontrak lengkap ada di
`context/ROUTES.md`** (single source of truth; jangan mengubah query tabel
tanpa memperbarui file tersebut).

## Roadmap

Semua fase fitur selesai. Tersisa:
- Finalisasi `README.md` (dokumen ini).
- Penggantian data dummy dengan data medis final yang dikonfirmasi pemilik
  project (WHO/Kemenkes RI/CDC).

## Dokumen referensi

| Dokumen | Isi |
|---|---|
| `context/frontend-architecture.md` | Arsitektur frontend (hooks, alur data) |
| `context/ROUTES.md` | Kontrak route frontend & pemetaan akses data Supabase |
| `context/PRD.md` | Kebutuhan produk |
| `context/PROJECT.md` | Stack & struktur folder |
| `context/DATABASE.md` | Skema Supabase/PostgreSQL (referensi) |
| `context/DESIGN.md` | Spesifikasi body map |
| `context/TASKS.md` | Rencana fase implementasi |

## Aturan penting

- UI berbahasa **Indonesia**, sederhana, hindari jargon medis berat.
- **Jangan ubah data `d` (path SVG) di `src/assets/body-parts.ts`** — itu geometri area tubuh.
- Tanpa fitur diagnosis/prediksi AI; tanpa operasi tulis dari client (MVP read-only).
- Tanpa secret/kunci Supabase (service_role) di kode client.
