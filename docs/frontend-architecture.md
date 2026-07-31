# Arsitektur Frontend — Dokumentasi Pasca-Refactor

> Dokumen ini menjelaskan struktur kode frontend (`src/`) setelah refactor
> readability, supaya kontributor cepat memahami: apa yang dipusatkan di mana,
> bagaimana data mengalir dari UI sampai database, dan di mana fitur fase
> berikutnya akan disambungkan.

## 1. Status arsitektur saat ini

- **FASE 0 selesai.** `App.tsx` hanya merender `<BodyMap />` yang memakai data
  statis `src/assets/body-parts.ts`.
- **Lapisan data sudah dibangun lengkap** meski belum dipakai komponen:
  - `src/lib/api.ts` — helper fetch ke Express API,
  - `src/lib/types.ts` — tipe respons API bersama,
  - `src/hooks/useFetch.ts` — hook fetch generik,
  - 6 hooks domain di `src/hooks/`.
- **Backend Express + PostgreSQL sudah berjalan** di `server/` (port 4000),
  semua router di-mount di bawah `/api` (lihat `server/src/app.ts`).
- **Supabase belum diimplementasikan** — hanya rencana di `context/TASKS.md`
  (FASE 1). Jangan tulis dokumentasi seolah-olah sudah live.

## 2. Lapisan arsitektur

```
┌────────────────────────────────────────────────────────────┐
│ UI React (BodyMap, daftar penyakit, search, detail, ...)    │
└──────────────────────────┬─────────────────────────────────┘
                           │  hanya lewat hooks domain
                           ▼
┌────────────────────────────────────────────────────────────┐
│ src/hooks/ — 6 hooks domain                                │
│ kontrak publik stabil: { data, loading, error }            │
│ (+ activeQuery untuk pencarian)                            │
└──────────────────────────┬─────────────────────────────────┘
                           │  path: string | null
                           ▼
┌────────────────────────────────────────────────────────────┐
│ src/hooks/useFetch.ts — hook generik                       │
│ fetch on path-change, abort request basi, debounce, reset  │
└──────────────────────────┬─────────────────────────────────┘
                           │  api<T>(path, { signal })
                           ▼
┌────────────────────────────────────────────────────────────┐
│ src/lib/api.ts — API_BASE + api() + isAbortError()         │
│ fetch(`${API_BASE}${path}`), lempar Error bila bukan 2xx   │
└──────────────────────────┬─────────────────────────────────┘
                           │  HTTP GET (MVP read-only)
                           ▼
┌────────────────────────────────────────────────────────────┐
│ Express API — server/src/app.ts (base /api)                │
│ routes: bodyParts, bodySystems, diseases, search           │
└──────────────────────────┬─────────────────────────────────┘
                           │  query() terparameterisasi (pg.Pool)
                           ▼
┌────────────────────────────────────────────────────────────┐
│ PostgreSQL (tabel diseases, body_parts, body_systems,      │
│            disease_body_part, disease_body_system)         │
└────────────────────────────────────────────────────────────┘
```

Aturan pemisahan yang dijaga:
- Komponen UI **tidak pernah** memanggil `api()` / `fetch` langsung — semua
  lewat hooks.
- Hooks domain **tidak pernah** menulis logika fetch sendiri — semua dibangun
  di atas `useFetch`.
- `useFetch` **tidak tahu** endpoint spesifik — hanya `path`, tipe, dan opsi.
- Tipe respons dipusatkan di `lib/types.ts`, dipakai oleh semua hooks.

## 3. `src/lib/api.ts` — gerbang akses API

```ts
export const API_BASE: string;
export const api = async <T>(path: string, options?: RequestInit): Promise<T>;
export const isAbortError = (error: unknown): boolean;
```

| Ekspor | Fungsi |
|---|---|
| `API_BASE` | Base URL API. Default `/api`. Bila env `VITE_API_URL` diisi, menjadi `${VITE_API_URL}/api`. Seluruh path di hooks ditulis **tanpa** prefix `/api`. |
| `api<T>(path, options)` | `fetch(`${API_BASE}${path}`, options)`. Bila respons tidak 2xx → melempar `Error` dengan status HTTP. Bila sukses → parse JSON sebagai `T`. |
| `isAbortError(error)` | Deteksi error akibat `AbortController.abort()` (berguna di `useFetch` agar pembatalan request tidak dianggap error sungguhan). |

Kenapa dipusatkan di sini:
- **Satu titik** untuk mengubah base URL / menambah header (auth, dsb.).
- Pesan error konsisten: `API <path> failed: <status>`.

## 4. `src/lib/types.ts` — tipe respons API bersama

Nama field mengikuti kolom tabel di `context/DATABASE.md` dan SELECT yang
dikirim server (`server/src/routes/*.ts`) — **jangan diterjemahkan** ke Bahasa
Indonesia.

| Tipe | Dipakai untuk | Field |
|---|---|---|
| `Disease` | Daftar/pencarian penyakit (`/diseases/by-body-part/:id`, `/body-systems/:id/diseases`, `/search`) | `id`, `nama`, `deskripsi?`, `tingkat_urgensi?` |
| `DiseaseDetail` | Detail satu penyakit (`/diseases/:id`) | `id`, `nama`, `deskripsi`, `penyebab?`, `pencegahan?`, `pengobatan?`, `kapan_ke_dokter?`, `tingkat_urgensi?` |
| `BodySystem` | Daftar sistem tubuh (`/body-systems`) | `id`, `nama`, `deskripsi?` |
| `BodyPartRecord` | Daftar bagian tubuh (`/body-parts/filter`) | `id`, `nama`, `kode_svg`, `side` (`'depan'|'belakang'`), `gender` (`'pria'|'wanita'|'netral'`), `deskripsi?` |

Catatan: `BodyPartRecord` (dari database) **berbeda** dari `BodyPart`
(dari `src/assets/body-parts.ts`). `BodyPart` statis punya field `face` dan `d`
(path SVG); `BodyPartRecord` punya `side`, `gender`, dan `kode_svg`. Keduanya
tidak boleh dicampur.

## 5. `useFetch` — hook fetch generik

```ts
useFetch<T>(
  path: string | null,
  initialData: T,
  options?: {
    initialLoading?: boolean;  // default false
    delayMs?: number;          // default 0
    resetOnNull?: boolean;     // default false
    clearDataOnError?: boolean;// default false
  },
): { data: T; loading: boolean; error: string | null }
```

### Semantik opsi

| Opsi | Perilaku |
|---|---|
| `initialLoading: true` | `loading` mulai `true` sebelum fetch pertama. Dipakai untuk list awal (mis. `useBodyParts`, `useBodySystems`) agar UI bisa menampilkan indikator sejak render pertama. |
| `delayMs: number` | Setiap kali `path` berubah, fetch ditunda `delayMs` ms (`window.setTimeout`). Untuk debounce pencarian (`useSearchDiseases` memakai 300ms). Timer dibersihkan saat unmount/`path` berubah. |
| `resetOnNull: true` | Saat `path` menjadi `null`, state dikembalikan ke nilai awal (`data` = `initialData`, `loading` = `initialLoading`, `error` = `null`). |
| `clearDataOnError: true` | Saat fetch gagal, `data` dikosongkan (dikembalikan ke `initialData`) selain `error` diisi pesannya. |

### Perilaku penting

1. **Null-path skip** — `path === null` menonaktifkan request. Berguna untuk
   "tunggu id terisi": `useDiseasesByBodyPart(null)` tidak akan memanggil API.
2. **Abort & race-condition** — tiap `path` berubah, effect baru membuat
   `AbortController` baru; effect lama dibatalkan saat cleanup
   (`controller.abort()` + flag `cancelled`). Respons dari request yang sudah
   basi/tidak relevan tidak akan pernah di-`setState`. Error `AbortError`
   difilter lewat `isAbortError()` sehingga tidak muncul sebagai error sungguhan.
3. **`initialData` stabil** — nilai awal disimpan di `useRef`, sehingga
   membuat array/objek baru saat render (mis. `[]`) tidak meng-reset state.
4. **Effect dependencies** — `[path, initialLoading, delayMs, resetOnNull, clearDataOnError]`.
   Perubahan salah satu memicu re-fetch.

### Kenapa hook ini ada

Menduduplikasi (deduplicate) logika yang sama di 6 hooks domain: fetch saat
path berubah, state `loading`/`error`/`data`, pembatalan request basi,
dan debounce. Tanpa `useFetch`, setiap hook domain harus mengulang pola
`useEffect` + `AbortController` yang rawan inkonsistensi.

## 6. Enam hooks domain

Semua hooks memakai `useFetch` dan **selalu** mengembalikan
`{ data, loading, error }` (kontrak publik — stabil lintas fase; komponen yang
dibuat terhadap kontrak ini tidak perlu diubah saat sumber data diganti).

| Hook | Endpoint (`API_BASE` + path) | Path yang dikirim | Tipe `data` | Opsi `useFetch` | Catatan |
|---|---|---|---|---|---|
| `useBodyParts(side?, gender?)` | `GET /body-parts/filter` | `/body-parts/filter?side=...&gender=...` (query hanya untuk argumen yang diisi) | `BodyPartRecord[]` | `{ initialLoading: true }` | Nilai `side`/`gender` mengikuti isi tabel `body_parts` (mis. `side="depan"`, `gender="pria"`). |
| `useBodySystems()` | `GET /body-systems` | `/body-systems` (tetap) | `BodySystem[]` | `{ initialLoading: true }` | — |
| `useDiseasesByBodyPart(bodyPartId)` | `GET /diseases/by-body-part/:id` | `null` bila `bodyPartId` adalah `null`/`undefined` | `Disease[]` | default | Null-skip: selama id belum terpilih, tidak ada request. |
| `useDiseasesByBodySystem(systemId)` | `GET /body-systems/:id/diseases` | `null` bila `systemId` adalah `null`/`undefined` | `Disease[]` | default | Null-skip seperti di atas. |
| `useDiseaseDetail(diseaseId)` | `GET /diseases/:id` | `null` bila `diseaseId` adalah `null`/`undefined` | `DiseaseDetail \| null` | default | Inisial `data = null`; server mengembalikan `null` bila penyakit tidak ditemukan. |
| `useSearchDiseases(query)` | `GET /search?q=...` | `null` bila `query.trim()` kosong; selain itu `/search?q=<encodeURIComponent(q)>` | `Disease[]` | `{ delayMs: 300, resetOnNull: true, clearDataOnError: true }` | Return `{ data, loading, error, activeQuery }`. `activeQuery` selalu sama dengan `query.trim()` — merepresentasikan query yang sedang aktif (hasil `data` berlaku untuk query ini). |

Contoh pemakaian (gaya FASE 3+, bukan implementasi saat ini):

```tsx
const { data: parts, loading, error } = useBodyParts('depan', 'pria');
const { data: diseases } = useDiseasesByBodyPart(selectedPartId);
const { data: results, activeQuery } = useSearchDiseases(text);
```

## 7. Komponen `BodyMap` — struktur pasca-refactor

File: `src/components/bodyMap/BodyMap.tsx` (styling saat ini memakai utility
class Tailwind; `BodyMap.module.css` masih ada di repo — kedua sistem styling
tetap tersedia per konvensi `AGENTS.md`).

### Konstanta bernama (top-level, mudah diubah)

| Konstanta | Nilai | Makna |
|---|---|---|
| `SVG_VIEWBOX` | `'0 0 375.42 832.97'` | Area gambar SVG, dipakai kedua sisi body map. |
| `PART_COLORS` | `default: 'rgba(75,75,77,.2)'`, `hovered: 'rgb(85,85,87)'`, `selected: 'rgba(255,59,48,.2)'` | Warna isian tiap bagian tubuh per status interaksi. |
| `IS_TOUCH_DEVICE` | `typeof window !== 'undefined' && 'ontouchstart' in window` | Deteksi perangkat touch saat runtime. |

### Sub-komponen stateless

| Sub-komponen | Tanggung jawab |
|---|---|
| `BodyPart` | Satu area tubuh interaktif: merender `<path d={part.d}>` dengan `id="body-part-{id}"`, tooltip nama via `<title>` bawaan browser, dan meneruskan `onClick`/`onMouseEnter`/`onMouseLeave` (fill warna sudah ditentukan oleh pemanggil). |
| `BodyContainer` | Wadah satu sisi body map: kotak `210×467px`, overlay gambar realistis (opsional, `imageSrc`) yang di-stack di bawah SVG, lalu `<svg viewBox={SVG_VIEWBOX}>` berisi anak-anaknya. |
| `BodySide` | Satu kolom sisi (Depan/Belakang): judul, `BodyContainer` dengan `imageSrc`-nya, dan memetakan array `parts` menjadi `BodyPart` — sekaligus menghitung warna tiap bagian (`partColor`): selected > hovered > default. |

### Komponen utama `BodyMap`

- State lokal: `selectedPartId: number | null` dan `hoveredPartId: number | null`.
- `antParts` / `postParts`: hasil filter `bodyParts` berdasarkan `face`
  (`'ant'` = depan, `'post'` = belakang) — di-memo dengan `useMemo`.
- `selectedPartName`: nama bagian yang terpilih, untuk judul header
  (fallback: "Klik pada bagian tubuh").
- Event handling:
  - klik → `setSelectedPartId(id)`,
  - `onMouseEnter`/`onMouseLeave` → set/reset `hoveredPartId`,
  - **perangkat touch**: handler hover langsung `return` bila
    `IS_TOUCH_DEVICE` true (perangkat touch tidak punya event hover, jadi
    highlight hover dimatikan — hanya klik yang bekerja).

### Aturan keras: jangan ubah `src/assets/body-parts.ts`

```ts
export type BodyPart = {
  face: 'ant' | 'post';
  name: string;
  id: number;
  d: string; // path SVG — geometri area tubuh
};
```

- Data `d` (path SVG) adalah **geometri area tubuh** dan dianggap tetap
  (immutable contract). **Jangan pernah mengubah nilai `d`**, karena akan
  menggeser area klik relatif terhadap overlay `front.png`/`back.png`.
- Perubahan kosmetik (mis. nama, warna) boleh lewat komponen; perubahan
  geometri hanya boleh disengaja dan diverifikasi visual.
- Di FASE 3 (`context/TASKS.md`), sumber data ini akan **diganti** dengan
  fetch dari `useBodyParts` — bukan diedit.

## 8. Alur data end-to-end

Contoh skenario "klik bagian tubuh → daftar penyakit" (FASE 3+):

```
User klik <path> di BodyMap
   │ setSelectedPartId(id)
   ▼
useDiseasesByBodyPart(id)          // path = /diseases/by-body-part/:id
   │
   ▼
useFetch (path bukan null)         // abort request lama, buat controller baru
   │ api<T>(path, { signal })
   ▼
fetch(`${API_BASE}/diseases/by-body-part/${id}`)
   │   API_BASE = /api        (atau VITE_API_URL + /api)
   ▼
Express: /api/diseases/by-body-part/:bodyPartId   (server/src/routes/diseases.ts)
   │ query('SELECT d.id, d.nama, ... FROM diseases d
   │       JOIN disease_body_part dbp ... WHERE dbp.body_part_id = $1', [id])
   ▼
PostgreSQL ──rows──▶ res.json(rows)
   │
   ▼
useFetch setData(json)  →  data: Disease[]  →  UI render daftar penyakit
```

## 9. Titik sambung FASE 1+ (per `context/TASKS.md`)

| Fase | Rencana | Titik sambung di kode ini |
|---|---|---|
| FASE 1 — Setup Supabase | Install `@supabase/supabase-js`, buat `src/lib/supabaseClient.ts`, `.env.example`, tabel per `context/DATABASE.md`, RLS, data dummy. | Belum ada. `src/lib/supabaseClient.ts` belum dibuat; **jangan dokumentasikan sebagai live**. |
| FASE 2 — Data layer hooks | Semua akses data wajib lewat `src/hooks/`. | Hooks domain **sudah ada** dan memenuhi kontrak `{ data, loading, error }`. Apabila sumber data nanti berganti dari Express ke Supabase, perubahannya cukup di dalam hooks (dan `useFetch`/`api`), **tanpa** mengubah komponen UI. |
| FASE 3 — Integrasi body map | Ganti `bodyParts` statis dengan `useBodyParts(side, gender)`; klik bagian tubuh memanggil `useDiseasesByBodyPart`. | BodyMap saat ini masih impor `body-parts.ts` langsung; pemasangan hooks dilakukan di fase ini. |
| FASE 4 — Pencarian & sistem tubuh | UI search memakai `useSearchDiseases` (debounce 300ms sudah ada di hook); daftar sistem tubuh memakai `useBodySystems`; klik sistem → `useDiseasesByBodySystem`. | Semua hook sudah siap dipakai. |
| FASE 5 — Routing | `react-router-dom`, halaman detail via `useDiseaseDetail`. | Belum ada (`App.tsx` hanya BodyMap). |
| FASE 6 — Polish | Empty/loading/error state, responsive 375/768/1280px, README. | — |

Poin kunci: **kontrak `{ data, loading, error }` adalah seam (sambungan)
yang stabil.** Komponen yang dibangun sekarang terhadap kontrak ini akan tetap
bekerja tanpa perubahan saat sumber data fase berikutnya disambungkan.
