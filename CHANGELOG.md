# Changelog

Catatan perubahan penting pada project.

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