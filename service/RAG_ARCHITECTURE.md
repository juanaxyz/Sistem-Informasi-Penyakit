# RAG_ARCHITECTURE.md — Arsitektur Chatbot (Unified Vector Search)

> Dokumen ini menjelaskan bagaimana chatbot mengambil data untuk menjawab pertanyaan pengguna. Pendekatan: **satu tabel vector di PostgreSQL** (`knowledge_embeddings`) yang menampung embedding dari data penyakit DAN FAQ navigasi web sekaligus. Tidak ada lagi pemisahan "tool A vs tool B" — retrieval selalu lewat satu jalur semantic search yang sama.
>
> **Migrasi dari Supabase ke PostgreSQL lokal (2026-09-26).** RAG kini membaca database yang sama dengan BFF (`capstone_paru`, pgvector 0.8.6). RPC Supabase `match_knowledge_embeddings` dihapus; similarity search dijalankan sebagai SQL berparameter langsung dari `app/services/retrieval.py` via psycopg. Skema ada di `db/schema.sql`.
>
> **Embedding pindah ke model lokal + chunking per token (2026-09-26).** `gemini-embedding-001` (768 dims) diganti `LazarusNLP/all-indo-e5-small-v4` (384 dims, `sentence-transformers`, L2-normalized, tanpa prefix `query:`/`passage:`) sehingga embedding jalan offline dan `task_type` dihapus. Karena teks panjang tidak muat dalam 384-token window, tiap sumber dipecah jadi chunk 256 token (overlap 32) dan disimpan per `chunk_index`; retrieval mengambil top-2 chunk per penyakit. Gemini kini hanya menyusun jawaban. Sinkronisasi dipicu dari tombol **Sinkronkan Basis Pengetahuan** di Admin Dashboard (`POST /api/load-knowledge` di service, diproxy `POST /api/admin/rag/load-knowledge` di BFF, dilindungi JWT role `admin` + header `X-Rag-Admin-Token`). Threshold turun ke `0.40`.
>
> **Versi ini adalah hasil sesi grill-me (2026-08-15).** Seluruh keputusan desain di bawah sudah disepakati dan menggantikan versi sebelumnya.

## Prinsip utama

1. **Tabel relational (`penyakit`, `artikel`, `artikel_bagian`, `faq`) tetap single source of truth** untuk data yang ditampilkan di halaman web dan sekaligus sumber embedding.
2. **Tabel `knowledge_embeddings`** adalah lapisan tambahan khusus chatbot — representasi vector dari konten yang sama (data penyakit) ditambah konten FAQ navigasi.
3. Chatbot **tidak pernah** melakukan function calling / tool selection. Alurnya selalu sama: embed → similarity search → generate jawaban.

## Keputusan desain (hasil grill)

| # | Aspek | Keputusan |
|---|-------|-----------|
| 1 | Sumber data disease | Tabel asli `penyakit` + `artikel_bagian` (BUKAN tabel `diseases`/`konten_penyakit` imajiner). `artikel_bagian` di-`JOIN` ke `artikel` lalu `penyakit` untuk nama. |
| 2 | Granularitas chunk disease | Sumber = 1 baris `artikel_bagian`, dipecah jadi **beberapa chunk 256 token** (overlap 32). `source_id = artikel_bagian.id`, `chunk_index` = urutan. |
| 3 | Format `content` disease | Tiap chunk diawali header konteks `Nama: {nama_penyakit}\nBagian: {judul}` lalu isi chunk-nya, supaya potongan tengah tetap bisa membaca diri sendiri. Baris dengan `judul` kosong dilewati baris `Bagian:`-nya. |
| 4 | Model embedding | `LazarusNLP/all-indo-e5-small-v4` via `sentence-transformers`, **384 dimensi, lokal, L2-normalized**. Tanpa prefix `query:`/`passage:`, jadi `task_type` tidak relevan. |
| 5 | Model generation | `gemini-3.6-flash` — `gemini-2.0-flash` sudah retired di Gemini API (404), cek versi terbaru bila perlu. Gemini **hanya** menyusun jawaban. |
| 6 | Index pgvector | **HNSW** (bukan ivfflat) — dataset kecil, ivfflat recall-nya buruk. |
| 7 | Link balik | Kolom `penyakit_id` disimpan di baris disease → link `/penyakit/{penyakit_id}` (route frontend saat ini). |
| 8 | Dedup hasil retrieval | Window function di SQL (`app/services/retrieval.py`) — top-2 per penyakit via `PARTITION BY COALESCE(penyakit_id, -id)`, karena satu penyakit kini punya banyak chunk. |
| 9 | Threshold similarity | Cosine ≥ **0.40** (`SIMILARITY_THRESHOLD` di `config.py`). Di bawahnya short-circuit "di luar cakupan" tanpa memanggil LLM. |
| 10 | Sumber FAQ | Tabel `faq` langsung dari database. |
| 11 | Sinkronisasi | `POST /api/load-knowledge` (tombol admin) atau `python ingest.py` — keduanya memanggil `run_ingest()`. Full rebuild tiap jalan; `source_hash`/`content_hash` dipakai untuk **laporan** ke admin, bukan untuk skip. |
| 12 | Jalur koneksi chat | Frontend → BFF (Express 4000, proxy) → RAG API (FastAPI 8000). Konsisten dengan pola existing. |
| 13 | Dependensi | `requirements.txt` (TIDAK diinstall di WSL; install manual di conda Windows). |

## Stack yang dipakai

| Komponen         | Teknologi                                                       |
| ---------------- | --------------------------------------------------------------- |
| Embedding model  | `sentence-transformers` lokal — `LazarusNLP/all-indo-e5-small-v4` (384 dims) |
| Chunking         | 256 token/chunk, overlap 32, tokenizer model yang sama |
| Generation model | Google `gemini-3.6-flash` (2.0-flash sudah retired)              |
| Vector store     | PostgreSQL lokal + ekstensi `pgvector` (tabel `knowledge_embeddings`) |
| Driver DB        | `psycopg` 3 — connection pool di `app/db.py`, query berparameter  |
| Library          | `sentence-transformers`, `google-genai`, `psycopg`, `fastapi`, `uvicorn` |


## Skema tabel `knowledge_embeddings`

Berkas: `db/schema.sql` (idempotent, diterapkan via `python scripts/apply_schema.py`).

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id              BIGSERIAL PRIMARY KEY,
    source_type     VARCHAR(20) NOT NULL CHECK (source_type IN ('disease', 'faq')),
    source_id       BIGINT      NOT NULL,
    chunk_index     INTEGER     NOT NULL DEFAULT 0,
    penyakit_id     BIGINT,
    content         TEXT        NOT NULL,
    source_hash     CHAR(64)    NOT NULL,
    content_hash    CHAR(64)    NOT NULL,
    embed_model     VARCHAR(80) NOT NULL,
    embedding       VECTOR(384),
    dibuat_pada     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Kunci alami untuk upsert: satu chunk per (sumber, urutan).
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_embeddings_source
    ON knowledge_embeddings(source_type, source_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_embedding
    ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_penyakit
    ON knowledge_embeddings(penyakit_id);
```

Catatan:
- Tidak ada trigger `updated_at` — `diperbarui_pada` di-`SET` eksplisit saat upsert.
- **Tidak ada RLS** lagi. Service memakai user PostgreSQL biasa, bukan service role. Pastikan user tersebut punya `INSERT`/`SELECT`/`DELETE` pada tabel ini.
- Unique `(source_type, source_id)` aman karena id disease berasal dari `artikel_bagian` dan id FAQ dari `faq`, sedangkan `source_type` membedakannya.
- **`content_hash`** = SHA-256 dari `content`, dipakai `ingest.py` untuk melewati embedding yang tidak berubah.

## Aturan penyusunan `content` per source_type

### Untuk `source_type = 'disease'` (1 baris per `artikel_bagian`)

```
Nama: {penyakit.nama}
Bagian: {artikel_bagian.judul}
{konten}
```

Contoh nyata:
```
Nama: COVID-19
Bagian: Pengertian & Ringkasan
Coronavirus adalah keluarga besar virus yang dapat menyebabkan penyakit ...
```

- `source_id = artikel_bagian.id`
- `penyakit_id = artikel.id_penyakit` (dari tabel `artikel`)
- Baris dengan `konten` kosong/spasi dilewati (tidak di-embed).
- `judul` kosong → baris `Bagian:` dihilangkan, sisanya tetap.

### Untuk `source_type = 'faq'`

Satu baris per entri di tabel `faq`. Format `content`:

```
Pertanyaan: {faq.pertanyaan}
Jawaban: {faq.jawaban}
```

- `source_id = faq.id`, `penyakit_id = NULL`.

## Proses seeding embedding (dijalankan manual di env conda Windows)

Jalankan `ingest.py` dari local (atau klik tombol di Admin Dashboard):

1. Baca semua `artikel_bagian` yang punya konten, di-`JOIN` ke `artikel` + `penyakit` ? susun `source_type = 'disease'`.
2. Baca semua `faq` dengan pertanyaan & jawaban terisi ? susun `source_type = 'faq'`.
3. Pecah tiap sumber jadi chunk 256 token (overlap 32) memakai tokenizer model.
4. Hitung `source_hash` (hash konten mentah sumber) dan `content_hash` (hash tiap
   chunk final).
5. **Full rebuild**: semua chunk di-embed ulang lalu upsert. Tidak ada logika
   skip — embedding lokal hanya ~20 ms/chunk, jadi tidak ada biaya API yang perlu
   dihindari, dan rebuild total menjamin nol risiko data basi. Hash dipakai
   untuk **laporan** ke admin (`sumber_berubah` / `sumber_tidak_berubah`).
6. Hapus chunk yang tak lagi berlaku: sumber yang hilang, dan `chunk_index` =
   jumlah chunk baru (ekor sisa saat konten dipendekkan).
7. Cetak jumlah baris per `source_type` untuk verifikasi.


## Similarity search (SQL di `app/services/retrieval.py`)

Menggantikan RPC Supabase. Query berparameter penuh (`%s`), tidak ada interpolasi
string dari input user. Vektor dikirim sebagai literal `'[... ]'` dengan cast
`::vector`.

```sql
SELECT source_type, source_id, penyakit_id, content, similarity
FROM (
    SELECT
        ke.source_type,
        ke.source_id,
        ke.penyakit_id,
        ke.content,
        1 - (ke.embedding <=> %s::vector) AS similarity,
        ROW_NUMBER() OVER (
            PARTITION BY COALESCE(ke.penyakit_id, -ke.id)
            ORDER BY ke.embedding <=> %s::vector ASC
        ) AS rn
    FROM knowledge_embeddings ke
    WHERE ke.embedding IS NOT NULL
      AND 1 - (ke.embedding <=> %s::vector) >= %s
) ranked
WHERE rn = 1
ORDER BY similarity DESC
LIMIT %s
```

**Bug lama yang sudah diperbaiki:** versi SQL sebelumnya (RPC Supabase) memakai
`PARTITION BY ke.penyakit_id` polos. Karena `PARTITION BY` *groups* seluruh nilai
NULL ke dalam satu partisi, semua baris FAQ bertumpuk dan hanya **1** chunk FAQ
yang bisa pernah dikembalikan. `COALESCE(ke.penyakit_id, -ke.id)` memberi tiap
baris FAQ partisi sendiri (`id` positif, `penyakit_id` juga positif, tidak
bentrok karena keduanya berasal dari tabel berbeda).

Catatan performa: window function membuat planner tidak memakai index HNSW pada
korpus sekecil ini (sequential scan jauh lebih cepat untuk ratusan baris). Index
tetap dipertahankan untuk pertumbuhan data ke depan.

## Alur runtime saat user bertanya

```
1. User mengirim pertanyaan (teks) → BFF → RAG API (/api/rag/chat)
2. Embed pertanyaan secara lokal: `LazarusNLP/all-indo-e5-small-v4`, 384 dims
3. Jalankan query di atas (threshold 0.40, limit 5, top-2 per penyakit)
4. Jika hasil kosong (semua di bawah threshold) → balas "di luar cakupan website"
   secara langsung, TANPA memanggil LLM (hemat 1 API call, anti-halusinasi)
5. Susun hasil jadi context (campuran disease/faq, sudah dedup per penyakit)
6. Kirim ke `gemini-3.6-flash` bersama pertanyaan asli
7. Gemini generate jawaban natural language dari context tsb
8. Jawaban ditampilkan ke user
```

Total pemanggilan API eksternal per pertanyaan normal: **1x embedding + 1x generation**. Pertanyaan di luar cakupan: **1x embedding saja**.

### Prompt generation

Prompt menginstruksikan model:
- Jawab hanya dari CONTEXT; bila tidak tersedia, katakan tidak ditemukan.
- Untuk chunk `source_type = 'disease'`, sertakan tautan `/penyakit/{penyakit_id}` di jawaban agar user bisa lanjut ke halaman detail.
- Tidak membuat diagnosis / kepastian medis (disclaimer).

**Multi-turn (opsional):** `ChatRequest` juga menerima `session_id` (identitas,
tidak disimpan server) dan `history` (array `{role, content}` dari turn
sebelumnya). `history` dirender ke prompt sebagai blok `RIWAYAT PERCAKAPAN`
sebelum `PERTANYAAN`. **Retrieval tetap per-question** — embedding tidak pernah
mencampur history.

## Jalur koneksi frontend → RAG (proxy via BFF)

```
frontend ChatWidget ──POST /api/rag/chat──▶ BFF (Express :4000)
        BFF ──proxy POST──▶ RAG API (FastAPI :8000) ──▶ PostgreSQL + Gemini
```

- **BFF** menambah route `POST /api/rag/chat` yang memforward `{question}` ke `RAG_API_URL` (env, mis. `http://localhost:8000`), lalu meneruskan `{answer, sources}` balik ke frontend.
- **Frontend** (`src/lib/api.ts`) memakai `api.chat(question)`; `ChatWidget.tsx` memakainya.
- CORS cukup diatur di BFF; FastAPI tidak perlu CORS untuk akses server-side.
- Service dan BFF memakai **satu database yang sama** — credential `PG*` di
  `service/.env` harus identik dengan `server/.env`.

## Dependensi Python (`service/requirements.txt`)

```
fastapi
uvicorn
pydantic
python-dotenv
google-genai
psycopg[binary,pool]
python-multipart
numpy
pillow
onnxruntime
requests
```

> **Catatan env:** Agent berada di WSL; Python conda user ada di **Windows**. Jangan jalankan `pip install` di WSL — install manual di conda Windows lalu jalankan `ingest.py` / server FastAPI dari sana.

## Larangan untuk agent

- Jangan bangun mekanisme function calling / tool selection.
- Jangan pakai tabel `diseases`, `konten_penyakit`, atau `gambar_konten` imajiner dari versi doc lama — sumber nyata adalah `penyakit` + `artikel` + `artikel_bagian` + `faq`.
- Jangan kembalikan Supabase sebagai sumber data RAG.
- Jangan gunakan ivfflat — index sudah HNSW.
- Jangan install dependensi Python di WSL (env conda ada di Windows).
- Jangan naikkan `CHUNK_TOKENS` di atas `MODEL_MAX_SEQ_LENGTH` - model akan memotong ekor chunk secara diam-diam (default SentenceTransformer 128 harus di-override ke 512).
- Jangan pakai prefix `query:` / `passage:` saat embedding - model Indonesian E5 ini dilatih tanpa prefix dan prefix menurunkan skor.
- Jangan andalkan hash untuk skip embedding - full rebuild memang disengaja; hash hanya untuk laporan.
- Jangan hardcode threshold di dalam kode runtime — jadikan konstanta di `config.py` agar mudah dikalibrasi.
- Jangan lupa `penyakit_id` saat seeding chunk disease — tanpa itu link `/penyakit/{id}` tidak pernah muncul di jawaban.
- Jangan hanya baca `artikel.konten` — kolom itu legacy dan kosong; konten nyata ada di `artikel_bagian`.

## Status implementasi saat ini (untuk panduan agent)

| Komponen | Status |
|----------|--------|
| `app/main.py` | Ada (endpoint `/api/rag/chat`, `/api/prediksi`) |
| `app/db.py` | Ada — connection pool psycopg + `ping()` untuk `/health` |
| `app/schemas/chat.py` | Ada (`ChatRequest.question`) |
| `app/services/retrieval.py` | Ada - SQL dedup top-2 per penyakit + threshold |
| `app/services/embedding.py` | Ada - sentence-transformers lokal, lazy load, normalized |
| `app/services/chunking.py` | Ada - chunk 256 token + overlap, snap batas kalimat |
| `app/services/ingestion.py` | Ada - `run_ingest()` dipakai CLI dan endpoint |
| `app/config.py` | Ada - konstanta model, PG*, chunk, threshold (tanpa task type) |
| `db/schema.sql` | Ada - `knowledge_embeddings` (VECTOR(384)) + index HNSW |
| `scripts/apply_schema.py` | Ada - penerapan skema idempotent + deteksi drift |
| `tests/test_chunking.py` | Ada - jaminan chunk tidak melebihi `CHUNK_TOKENS` |
| Frontend `api.chat` + wiring ChatWidget | Ada |
| `requirements.txt` | Ada (`psycopg`, tanpa `supabase`) |

## Rujukan dokumen terkait

- Skema tabel: `service/db/schema.sql`
- Env: `service/.env.example`
- BFF: `server/src/server.js`, `server/src/db/pg.js`
