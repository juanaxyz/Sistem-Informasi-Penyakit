# Changelog

Catatan perubahan penting pada project.

## [2026-09-26] — Referensi penyakit, editor artikel, dan tampilan baca

### Fitur

- Referensi/Sumber Medis kini dikelola dari **editor artikel**, bukan form
  penyakit. Blok **Referensi / Sumber Medis** di `Admin.tsx` menyediakan tambah
  URL, ubah, dan hapus, plus tombol **Simpan Referensi** dan penanda "Belum
  disimpan". Validasi klien (`http:`/`https:` saja) dibuat sama dengan aturan
  server supaya tidak ada URL yang lolos di form lalu ditolak BFF.
- Endpoint baru `PUT /api/penyakit/:id/referensi` (role `admin`). Dipisah dari
  `PUT /api/penyakit/:id` karena endpoint penyakit mewajibkan `nama`, `slug`,
  `tingkat_urgensi`, `id_sistem_tubuh`, dan `bagian_tubuhIds`, sedangkan editor
  artikel tidak memegang data penyakit. Endpoint ini hanya menyentuh tabel
  `referensi`, jadi edit sumber tidak pernah menimpa kolom penyakit lain.
- `POST /api/penyakit` dan `PUT /api/penyakit/:id` tetap menerima field
  `referensi` sebagai array URL, disimpan lewat `replacePenyakitReferences()`.
  Kalau field ini **tidak dikirim** pada `PUT`, baris yang ada tidak disentuh;
  dikirim `[]` berarti hapus semua.
- URL dinormalisasi ke bentuk kanonik (`https://who.int` → `https://who.int/`),
  entri kosong diabaikan, duplikat diringkas, maksimal 50 per penyakit.
  `normalizeUrl()` ditambahkan ke `server/src/utils/validators.js`.
- `server/db/schema.sql` sekarang ikut mendefinisikan tabel `referensi`
  (idempotent) beserta index `id_penyakit`, karena tabel ini tidak lagi
  diasumsikan "sudah ada" tapi dikelola BFF.
- Toolbar formatting di editor artikel (tebal, miring, subjudul, daftar,
  tautan) yang menyisipkan sintaks Markdown di posisi kursor, plus tombol
  **Pratinjau** per bagian yang merender Markdown dengan gaya yang sama seperti
  halaman detail. Tinggi textarea dinaikkan dari 6 ke 16 baris.

### Perbaikan

- **Styling artikel di halaman detail praktis tidak aktif.** `ArticleProse`
  beserta 37 aturan `.article-prose` di `src/index.css` tidak pernah dipakai:
  `DiseaseDetailPage.tsx` merender `<Markdown>` polos dengan kelas `prose` dari
  plugin `@tailwindcss/typography` yang **tidak terpasang** dan tidak ada
  `tailwind.config.js`, sehingga kelas itu no-op. Heading, list, blockquote, dan
  tabel di dalam artikel tampil nyaris tanpa style. `DiseaseDetailPage.tsx`
  sekarang memakai `ArticleProse`.
- `white-space: pre-line` pada `.article-prose` dihapus. Aturan itu warisan dari
  teks polos, tapi kontainer ini berisi elemen blok dari `react-markdown`, jadi
  aturan tersebut hanya menambah celah tak terduga. Teks juga diubah dari rata
  kanan ke rata kiri karena rata kanan menghasilkan celah buruk pada kata
  panjang seperti nama obat Latin.
- Tiap seksi artikel sekarang punya anchor sendiri (`#bagian-<id>`) dengan ikon
  rantai yang menyalin tautan saat diklik, dan halaman detail punya progress bar
  baca di atas. Artikel penyakit bisa sangat panjang, jadi ini memudahkan
  navigasi.
- **Bug lama yang belum ketahui tes**: `admin-penyakit.controller.js`
  mendestruksi `bagian_tubuhIds` tapi meneruskan `bagianTubuhIds` (huruf
  besar-kecil beda) ke `replacePenyakitRelations()`. Akibatnya `POST`/`PUT
  /api/penyakit` selalu melempar `ReferenceError` → 500. Tidak ada tes yang
  menyentuh handler ini, jadi bugnya bertahan sejak Admin penyakit pertama kali
  ditulis. Sekarang diperbaiki dan ditutup oleh tes baru.
- `INSERT INTO referensi` sempat salah bentuk (3 kolom tapi tiap tuple hanya 2
  nilai, dengan `CURRENT_TIMESTAMP` menggantung sebagai tuple sendiri) → 500.
  Tes tidak menangkapnya karena `query` di-mock; sekarang ada tes yang
  memverifikasi jumlah kolom, nilai per tuple, dan placeholder `$1..$n`.
- `ArtikelListItem.id_penyakit` di `Admin.tsx` ditandai opsional padahal BFF
  selalu mengirimnya, sehingga `tsc -b` gagal saat dipakai sebagai argumen
  `number`. Sekarang wajib, sesuai respons API.
- `service/RAG_ARCHITECTURE.md` dan `service/app/services/chunking.py` rusak
  encoding (double-encoded UTF-8, mis. `—` jadi `â€”`) sejak commit
  `c0016c6`; sudah dikembalikan ke UTF-8 yang benar.

## [2026-09-26] — Embedding lokal, chunking per token, sinkronisasi dari Admin

### BREAKING — model embedding

- Embedding pindah dari Gemini ke model lokal `LazarusNLP/all-indo-e5-small-v4`
  (`sentence-transformers`), **384 dimensi**, L2-normalized, tanpa prefix
  `query:`/`passage:`. `task_type` DOCUMENT/QUERY dihapus total dari config.
- `MODEL_MAX_SEQ_LENGTH` di-override ke **512**. Default SentenceTransformer
  (128) akan memotong chunk 256 token di ujung secara diam-diam.
- Gemini (`gemini-3.6-flash`) kini hanya menyusun jawaban, tidak lagi embedding.
  `GEMINI_API_KEY` tetap dibutuhkan untuk chat, tapi tidak untuk sinkronisasi.
- `SIMILARITY_THRESHOLD` turun `0.62` → **`0.40`**, dikalibrasi dari korpus
  aktual: in-scope 0.595–0.824, out-of-scope ≤ 0.248. Wajib diukur ulang saat
  isi knowledge base berubah.
- `MATCH_COUNT` tetap 5, dedup retrieval jadi **top-2 chunk per penyakit**.

### Chunking

- Sumber dipecah jadi chunk **256 token, overlap 32** oleh
  `app/services/chunking.py`, dengan header konteks per chunk dan snap ke
  batas kalimat terdekat (force-split sebagai fallback).
- Skema `knowledge_embeddings` mendapat kolom `chunk_index`, `source_hash`,
  `content_hash`, `embed_model`; unique index jadi
  `(source_type, source_id, chunk_index)`. `embedding` jadi `VECTOR(384)`.
- `scripts/apply_schema.py` mendeteksi drift kolom/index/dimensi dan rebuild
  tabel turunan secara idempotent.
- `tests/test_chunking.py` (9 test) menjamin chunk tidak pernah melebihi batas
  token — termasuk kasus judul sangat panjang.

### Sinkronisasi dari Admin Dashboard

- Tombol **Sinkronkan Basis Pengetahuan** di `frontend/src/pages/AdminDashboard.tsx`
  memanggil `POST /api/admin/rag/load-knowledge` (BFF) → `POST /api/load-knowledge`
  (FastAPI). Python yang menangani baca sumber → hash → chunk → embed → upsert.
- CLI `python ingest.py` memakai `run_ingest()` yang sama.
- `run_ingest()` **full rebuild setiap kali dijalankan**; `source_hash`/
  `content_hash` dipakai untuk laporan jumlah sumber berubah, bukan untuk skip.
  Chunk basi ikut terhapus: sumber hilang dan `chunk_index` di luar jumlah baru.
- Proteksi dua lapis: JWT role `admin` di BFF + header `X-Rag-Admin-Token`
  di FastAPI (401 tanpa/salah token, 403 non-admin, 502 saat service mati).
- 5 test BFF baru untuk endpoint tersebut; total 45/45 lulus.

### Perbaikan

- `app/main.py` `/health` kini melaporkan model embedding, dimensi, generasi
  DB, dan status konfigurasi admin sync.
- Sequence `penyakit_id_seq` dan `faq_id_seq` yang meleset diperbaiki dengan
  `setval`; `service/db/schema.sql` yang dibuat ulang akan mencegah terulangnya.

## [2026-09-26] — RAG migrasi Supabase → PostgreSQL (pgvector)

### BREAKING — sumber data RAG

- RAG tidak lagi memakai Supabase. `app/services/retrieval.py` dan `ingest.py`
  kini bicara langsung ke PostgreSQL yang **sama dengan BFF** (`capstone_paru`)
  lewat driver `psycopg` 3. Package `supabase` dihapus dari `requirements.txt`
  dan di-uninstall dari env conda.
- Env `SUPABASE_URL` / `SUPABASE_KEY` diganti `PGHOST` / `PGPORT` / `PGUSER` /
  `PGPASSWORD` / `PGDATABASE` (identik dengan `server/.env`), plus opsional
  `PG_POOL_MAX` dan `PG_CONNECT_TIMEOUT`.
- RPC Supabase `match_knowledge_embeddings` **dihapus**. Similarity search
  sekarang SQL berparameter penuh di `app/services/retrieval.py` (cosine `<=>`,
  dedup top-1 per penyakit, threshold 0.62, max 5 chunk). Tidak ada lagi
  fungsi/function eksternal yang harus diterapkan manual.
- RLS dihapus; service memakai user PostgreSQL biasa.

### Skema

- `service/db/schema.sql` (baru) — tabel `knowledge_embeddings` + unique index
  `(source_type, source_id)` + index HNSW `vector_cosine_ops`.
  Terapkan dengan `python scripts/apply_schema.py` (baru, idempotent).
- Drift kolom `knowledge_embeddings` diperbaiki: kini memakai
  `source_id` + `penyakit_id` + `content_hash` (sebelumnya dokumen,
  `ingest.py`, dan `generation.py` saling tidak cocok).
- Kolom `embedding` nullable supaya baris bisa di-`upsert` sebelum embedding
  selesai ditulis.

### Perbaikan bug

- **Konten penyakit tidak pernah ter-embed.** `ingest.py` membaca
  `artikel.konten`, padahal kolom itu legacy dan **kosong** di database —
  seluruh 3 baris `artikel` punya `konten` kosong. Sumber data sekarang
  `artikel_bagian` (di-`JOIN` ke `artikel` lalu `penyakit`), jadi disease
  chunk akhirnya ter-produce.
- **Link `/penyakit/{id}` tidak pernah muncul.** `generation.py` membaca
  `penyakit_id`, tapi `ingest.py` tidak pernah menyimpannya dan RPC-nya
  membaca kolom yang tidak ada. `penyakit_id` kini diisi saat seeding
  (terverifikasi: jawaban memuat `/penyakit/1`).
- **Maksimal 1 chunk FAQ per pertanyaan.** SQL lama memakai
  `PARTITION BY ke.penyakit_id`, dan `PARTITION BY` mengelompokkan semua NULL
  ke satu partisi — seluruh baris FAQ bertumpuk. Diganti
  `PARTITION BY COALESCE(ke.penyakit_id, -ke.id)`.
- `requests` ditambahkan ke `requirements.txt` (dipakai `test.py`).

### Peningkatan

- Seeding jadi **inkremental**: baris dengan `content_hash` tidak berubah tidak
  di-embed ulang (menghemat panggilan Gemini), baris yang hilang dari sumber
  ikut terhapus. Sebelumnya `TRUNCATE` + embed ulang semua tiap kali dijalankan.
- `app/db.py` (baru) — connection pool psycopg singleton, selalu query
  berparameter (`%s`).
- `/health` kini melaporkan `rag.database` (ping) plus nama model embedding dan
  generation secara eksplisit (sebelumnya `model` di-hardcode).
- Seksi troubleshooting di `service/README.md`.

### Dokumentasi

- `service/RAG_ARCHITECTURE.md` ditulis ulang: nama tabel `konten_penyakit`
  imajiner diganti `artikel_bagian`, threshold 0.3 → 0.62, sumber FAQ
  `RAG_KNOWLEDGE_BASE.md` → tabel `faq`.
- `docs/ARCHITECTURE.md`: tabel `knowledge_embeddings` didokumentasikan;
  `artikel.konten` ditandai legacy.
- README root, `service/README.md`, dan `CHANGELOG.md` diperbarui.

## [2026-09-26] — Service Python terpadu + analisis per bagian tubuh

### Struktur monorepo (BREAKING)

- `RAG/` dan `Analisis/` digabung menjadi satu folder **`service/`**
  (FastAPI, port `8000`).
- Satu perintah run melayani chat RAG (`POST /api/rag/chat`) dan analisis
  citra (`POST /api/prediksi`).
- Konfigurasi `server`: `MODEL_API_URL` default sekarang mengikuti
  `RAG_API_URL` (`http://localhost:8000`) — cukup satu service.
- Referensi path di `README.md`, `docs/*`, dan `.gitignore` diperbarui.
- `service/.env.example` baru: `GEMINI_API_KEY`, `SUPABASE_URL/KEY`,
  `ALLOW_STUB`, `MODELS_DIR`, dll.

### server

- Alur analisis riwayat nyata: upload multipart → `server/uploads/` →
  BFF memanggil service `/api/prediksi` → 3 prediksi disimpan
  (auto-sync tabel `model`, alias label→penyakit di `riwayat.controller.js`).
- Endpoint baru `GET /api/jenis-analisis/byBody/:idBody` — daftar jenis
  analisis aktif untuk satu bagian tubuh via `jenis_analisis_bagian_tubuh`.
- `confidence` dikirim sebagai angka (`::float8`); memperbaiki
  `confidence.toFixed(...)` yang gagal di frontend karena `numeric`
  Postgres dibaca `pg` sebagai string.
- Admin: dashboard, manajemen patogen, dan util many-to-many.

### frontend

- Halaman analisis baru: klik bagian tubuh → modal menampilkan hanya jenis
  analisis yang tersedia untuk bagian tersebut (kini dada kiri & dada kanan)
  — `AnalysisPage.tsx` + hook `useAnalysesByBodyPart`.
- `XRayAnalysisPage.tsx` direname menjadi `AnalysisPage.tsx` dengan route
  `/analisis`; label "Analisis" di dock, menu, dan home.
- Halaman admin dashboard dan detail patogen; menu pengguna overlay.

### service

- FastAPI gabungan: endpoint chat (`/api/rag/chat`) + prediksi
  (`/api/prediksi`) + `/health` (status RAG + tiap model citra).
- Modul prediksi dipindah dari `Analisis/` (`model_loader.py`,
  `predictions.py`) dengan registri `MODELS` di `app/config.py`.
- Client Gemini/Supabase dibuat **lazy** agar service tetap bisa dinyalakan
  tanpa key (prediksi tetap jalan).
- Tanpa file `.onnx` dan `ALLOW_STUB=1`, prediksi memakai fallback
  deterministik (ditandai `stub: true`).