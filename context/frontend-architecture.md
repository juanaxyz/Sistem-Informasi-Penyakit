# Arsitektur Frontend — Dokumentasi Pasca-Refactor

> Dokumen ini menjelaskan struktur kode frontend (`src/`) setelah arsitektur
> data berpindah dari backend Express ke **Supabase langsung** (03 Aug 2026),
> supaya kontributor cepat memahami: apa yang dipusatkan di mana, bagaimana
> data mengalir dari UI sampai database, dan di mana fitur fase berikutnya
> akan disambungkan.

## 1. Status arsitektur saat ini

- **FASE 0–6 selesai.** `App.tsx` merender router (`react-router-dom`) dengan
  halaman beranda (`HomePage`: body map, sistem tubuh, pencarian) dan halaman
  detail penyakit (`DiseaseDetailPage`).
- **Data layer langsung ke Supabase (PostgREST):**
  - `src/lib/supabase.ts` — client Supabase (anon key, RLS public-read) +
    `isAbortError()`,
  - `src/lib/types.ts` — tipe data bersama,
  - `src/hooks/useSupabaseQuery.ts` — hook query generik (abort, debounce,
    loading/error),
  - 6 hooks domain di `src/hooks/`.
- **Backend Express dihapus** (03 Aug 2026). Tidak ada `server/`, tidak ada
  proxy `/api` di Vite, tidak ada `lib/api.ts`/`useFetch.ts`. Semua baca data
  adalah query PostgREST dari browser.
- **Gambar konten** disimpan statis di `public/uploads/penyakit/` (75 file);
  `gambar_konten.url_gambar` di DB berisi path relatif `/uploads/penyakit/...`
  yang bisa langsung dipakai sebagai `src` `<img>` di Vercel.
- **Route adalah kontrak** — daftar route frontend & pemetaan tabel ada di
  `context/ROUTES.md` (single source of truth). Jangan mengubah query tabel
  tanpa memperbarui file itu.

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
                           │  fetcher: (signal) => Promise<T> | null
                           ▼
┌────────────────────────────────────────────────────────────┐
│ src/hooks/useSupabaseQuery.ts — hook query generik         │
│ re-query on deps-change, abort request basi, debounce, reset│
└──────────────────────────┬─────────────────────────────────┘
                           │  @supabase/supabase-js (client anon)
                           ▼
┌────────────────────────────────────────────────────────────┐
│ Supabase PostgREST — project jxzetjnaijwlszmccofo          │
│ query: select/eq/ilike/order/abortSignal/returns           │
│ RLS public-read (SELECT) aktif; MVP read-only              │
└──────────────────────────┬─────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────────┐
│ PostgreSQL (tabel sistem_tubuh, bagian_tubuh, penyakit,     │
│            konten_penyakit, gambar_konten,                  │
│            penyakit_bagian_tubuh, referensi)                │
└────────────────────────────────────────────────────────────┘
```

Aturan pemisahan yang dijaga:
- Komponen UI **tidak pernah** memanggil `supabase.from(...)` langsung — semua
  lewat hooks domain.
- Hooks domain **tidak pernah** menulis logika re-query/abort/debounce sendiri —
  semua dibangun di atas `useSupabaseQuery`.
- `useSupabaseQuery` **tidak tahu** tabel spesifik — hanya `fetcher`, tipe, dan
  opsi.
- Tipe data dipusatkan di `lib/types.ts`, dipakai oleh semua hooks.

## 3. `src/lib/supabase.ts` — client & helper

```ts
export const supabase: SupabaseClient;
export const isAbortError = (error: unknown): boolean;
```

| Ekspor | Fungsi |
|---|---|
| `supabase` | Client `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`. `throw` saat env kosong. Semua query PostgREST lewat ini. |
| `isAbortError(error)` | Deteksi error akibat `AbortController.abort()` (dipakai `useSupabaseQuery` agar pembatalan request tidak dianggap error sungguhan). |

Env yang dibutuhkan (`src/lib/supabase.ts`, lihat `.env.example`):
- `VITE_SUPABASE_URL` — URL project Supabase.
- `VITE_SUPABASE_ANON_KEY` — anon/publishable key. Aman di browser karena RLS
  membatasi akses (public SELECT). **Jangan pernah** memakai service_role key.

## 4. `src/lib/types.ts` — tipe data bersama

Nama field mengikuti kolom tabel di `context/DATABASE.md` dan SELECT yang
dikirim hooks — **jangan diterjemahkan** ke Bahasa Indonesia.

| Tipe | Dipakai untuk | Field |
|---|---|---|
| `Disease` | Daftar/pencarian penyakit (via `penyakit_bagian_tubuh`, `id_sistem_tubuh`, `ilike`) | `id`, `nama`, `ringkasan?: string \| null`, `tingkat_urgensi?` |
| `DiseaseDetail` | Detail satu penyakit (embedded `sistem_tubuh`, relasi `konten_penyakit`+`gambar_konten`, `penyakit_bagian_tubuh`→`bagian_tubuh`, `referensi`) | `id`, `id_sistem_tubuh`, `nama`, `slug`, `ringkasan?: string \| null`, `tingkat_urgensi?`, `sistem_tubuh: BodySystem \| null`, `konten: DiseaseContent[]`, `bagian_tubuh: BodyPartRecord[]`, `referensi: Reference[]` |
| `DiseaseContent` | Blok konten edukasi (`konten_penyakit`) di dalam detail | `id`, `judul`, `slug`, `isi`, `urutan`, `gambar_konten?: { id, url_gambar, caption?, urutan }[]` |
| `Reference` | Referensi/sumber (`referensi`) di dalam detail | `id`, `judul`, `sumber?`, `url?`, `tahun?` |
| `BodySystem` | Daftar sistem tubuh (`sistem_tubuh`) | `id`, `nama`, `slug`, `deskripsi?` |
| `BodyPartRecord` | Daftar bagian tubuh (`bagian_tubuh`) | `id`, `nama`, `slug`, `tampilan` (`'depan'\|'belakang'`) |

Catatan: `BodyPartRecord` (dari database) **berbeda** dari `BodyPart`
(dari `src/assets/body-parts.ts`). `BodyPart` statis punya field `face` dan `d`
(path SVG); `BodyPartRecord` punya `slug` dan `tampilan`. Keduanya tidak boleh
dicampur.

## 5. `useSupabaseQuery` — hook query generik

```ts
useSupabaseQuery<T>(
  fetcher: ((signal: AbortSignal) => Promise<T>) | null,
  initialData: T,
  deps: readonly unknown[],
  options?: {
    initialLoading?: boolean;   // default false
    delayMs?: number;           // default 0
    resetOnNull?: boolean;      // default false
    clearDataOnError?: boolean; // default false
  },
): { data: T; loading: boolean; error: string | null }
```

### Semantik opsi

| Opsi | Perilaku |
|---|---|
| `initialLoading: true` | `loading` mulai `true` sebelum query pertama. Dipakai untuk list awal (mis. `useBodyParts`, `useBodySystems`) agar UI bisa menampilkan indikator sejak render pertama. |
| `delayMs: number` | Setiap kali `deps` berubah, query ditunda `delayMs` ms (`window.setTimeout`). Untuk debounce pencarian (`useSearchDiseases` memakai 300ms). Timer dibersihkan saat unmount/deps berubah. |
| `resetOnNull: true` | Saat `fetcher` menjadi `null`, state dikembalikan ke nilai awal (`data` = `initialData`, `loading` = `initialLoading`, `error` = `null`). |
| `clearDataOnError: true` | Saat query gagal, `data` dikosongkan (dikembalikan ke `initialData`) selain `error` diisi pesannya. |

### Perilaku penting

1. **Null-fetcher skip** — `fetcher === null` menonaktifkan query. Berguna untuk
   "tunggu id terisi": `useDiseasesByBodyPart(null)` tidak akan memanggil
   Supabase.
2. **Abort & race-condition** — tiap `deps` berubah, effect baru membuat
   `AbortController` baru; effect lama dibatalkan saat cleanup
   (`controller.abort()` + flag `cancelled`). Respons query basi tidak pernah
   di-`setState`. Error `AbortError` difilter lewat `isAbortError()`.
   Hooks meneruskan `signal` ke query lewat `.abortSignal(signal)`.
3. **`initialData` stabil** — nilai awal disimpan di `useRef`, sehingga
   membuat array/objek baru saat render (mis. `[]`) tidak meng-reset state.
4. **Effect dependencies** — `[initialLoading, delayMs, resetOnNull, clearDataOnError, ...deps]`.
   `fetcher` dibaca via `ref` (diperbarui di dalam effect).

### Kenapa hook ini ada

Menduduplikasi (deduplicate) logika yang sama di 6 hooks domain: query saat
deps berubah, state `loading`/`error`/`data`, pembatalan query basi, dan
debounce — sama seperti `useFetch` dulu, tetapi untuk PostgREST.

## 6. Enam hooks domain

Semua hooks memakai `useSupabaseQuery` dan **selalu** mengembalikan
`{ data, loading, error }` (kontrak publik — stabil lintas fase).

| Hook | Query Supabase | Tipe `data` | Opsi `useSupabaseQuery` | Catatan |
|---|---|---|---|---|
| `useBodyParts(tampilan?)` | `bagian_tubuh.select(id,nama,slug,tampilan).order(id)` + `.eq('tampilan', …)` bila diisi | `BodyPartRecord[]` | `{ initialLoading: true }` | Nilai `tampilan` mengikuti isi tabel (mis. `'depan'`). |
| `useBodySystems()` | `sistem_tubuh.select(id,nama,slug,deskripsi).order(id)` | `BodySystem[]` | `{ initialLoading: true }` | — |
| `useDiseasesByBodyPart(bodyPartId)` | `penyakit.select(id,nama,ringkasan,tingkat_urgensi,penyakit_bagian_tubuh!inner(id_bagian_tubuh)).eq('penyakit_bagian_tubuh.id_bagian_tubuh', id).order(nama)` — **wajib** embed `penyakit_bagian_tubuh!inner` di `select` (inner join, bukan left join) agar hanya penyakit yang benar-benar terhubung yang ikut (PGRST108 / hasil tak terfilter) | `Disease[]` | default | Null-skip: id belum terpilih → tidak ada query. |
| `useDiseasesByBodySystem(systemId)` | `penyakit.select(...).eq('id_sistem_tubuh', systemId).order(nama)` | `Disease[]` | default | Null-skip seperti di atas. |
| `useDiseaseDetail(diseaseId)` | 4 query paralel: `penyakit` (+ embedded `sistem_tubuh` via FK), `konten_penyakit` (+ `gambar_konten`), `penyakit_bagian_tubuh` (+ embedded `bagian_tubuh`), `referensi`. Semua `.abortSignal(signal)`. | `DiseaseDetail \| null` | default | Inisial `data = null`; `null` bila penyakit tidak ditemukan. **Urutan penting:** `.abortSignal(signal)` sebelum `.maybeSingle()` (PostgrestBuilder tidak punya `abortSignal`). |
| `useSearchDiseases(query)` | 2 query paralel `penyakit.ilike('nama'/'ringkasan', '*q*')`, `q` di-escape (`\`,`*`,`?`,`%`,`_`), dedupe via `Map` by id, sort nama, slice 50 | `Disease[]` | `{ delayMs: 300, resetOnNull: true, clearDataOnError: true }` | Return `{ data, loading, error, activeQuery }`. `activeQuery` = `query.trim()`. |

Contoh pemakaian:

```tsx
const { data: parts, loading, error } = useBodyParts('depan');
const { data: diseases } = useDiseasesByBodyPart(selectedPartId);
const { data: results, activeQuery } = useSearchDiseases(text);
```

Catatan PostgREST: pastikan `.abortSignal(signal)` dipanggil pada
`PostgrestTransformBuilder`/`PostgrestFilterBuilder` (sebelum `.maybeSingle()`
/ `.returns()` yang menghasilkan `PostgrestBuilder`).

## 7. Komponen `BodyMap` — struktur pasca-refactor

File: `src/components/bodyMap/BodyMap.tsx` (styling saat ini memakai utility
class Tailwind; `BodyMap.module.css` masih ada di repo — kedua sistem styling
tetap tersedia per konvensi `AGENTS.md`).

### Konstanta bernama (top-level, mudah diubah)

| Konstanta | Nilai | Makna |
|---|---|---|
| `SVG_VIEWBOX` | `'0 0 375.42 832.97'` | Area gambar SVG, dipakai kedua sisi body map. |
| `PART_COLORS` | `default: 'rgba(203,213,225,.85)'`, `hovered: 'rgba(96,165,250,.9)'`, `selected: 'rgba(37,99,235,1)'` | Warna isian tiap bagian tubuh per status interaksi (skema biru). |
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
- **Data penyakit:** `useDiseasesByBodyPart(selectedPartId)` dipanggil langsung
  di komponen; `selectedPartId === null` → hook tidak melakukan query
  (null-skip). Hasil dirender sebagai daftar (`nama`, `ringkasan`, badge
  `tingkat_urgensi`) lengkap dengan state loading / error / empty.
- Event handling:
  - klik → `setSelectedPartId(id)` (memicu query penyakit terkait),
  - `onMouseEnter`/`onMouseLeave` → set/reset `hoveredPartId`,
  - **perangkat touch**: handler hover langsung `return` bila
    `IS_TOUCH_DEVICE` true (highlight hover dimatikan — hanya klik yang bekerja).

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
- **Geometri SVG TIDAK diganti** dengan data DB — `bagian_tubuh` tidak
  menyimpan path SVG. Yang di-wire hanya query relasi penyakit. Jangan pernah
  mengganti `body-parts.ts` dengan data dari Supabase.

## 8. Alur data end-to-end

Contoh skenario "klik bagian tubuh → daftar penyakit":

```
User klik <path> di BodyMap
   │ setSelectedPartId(id)
   ▼
useDiseasesByBodyPart(id)          // query penyakit_bagian_tubuh (embedded FK)
   │
   ▼
useSupabaseQuery (fetcher non-null) // abort query lama, buat controller baru
   │ fetcher(signal) → supabase.from(...).select(...).eq(...).abortSignal(signal)
   ▼
Supabase PostgREST (RLS public-read) → SELECT + JOIN embedded
   │
   ▼
PostgreSQL ──rows──▶ fetcher mengembalikan data: Disease[]
   │
   ▼
useSupabaseQuery setData(json)  →  UI render daftar penyakit
```

## 9. Status fase (per `context/TASKS.md`)

| Fase | Status |
|---|---|
| FASE 0 — Project Init & Body Map Statis | Selesai. |
| FASE 1 — Backend & Database | Selesai (skema Indonesia; backend Express kini **dihapus** — data via Supabase). |
| FASE 2 — Data layer hooks | Selesai (`useFetch` → `useSupabaseQuery`, hooks query Supabase). |
| FASE 3 — Integrasi body map | Selesai. |
| FASE 4 — Pencarian & sistem tubuh | Selesai. |
| FASE 5 — Halaman detail & routing | Selesai (`react-router-dom`, `DiseaseDetailPage`, fallback `*` → `/`). |
| FASE 6 — Polish | Selesai (kecuali penulisan `README.md` final). |

Poin kunci: **kontrak `{ data, loading, error }` adalah seam (sambungan)
yang stabil.** Komponen yang dibangun sekarang terhadap kontrak ini akan tetap
bekerja tanpa perubahan saat query tabel fase berikutnya disesuaikan.
