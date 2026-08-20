# RAG_ARCHITECTURE.md — Arsitektur Chatbot (Unified Vector Search)

> Dokumen ini menjelaskan bagaimana chatbot mengambil data untuk menjawab pertanyaan pengguna. Pendekatan: **satu tabel vector di Supabase** (`knowledge_embeddings`) yang menampung embedding dari data penyakit DAN FAQ navigasi web sekaligus. Tidak ada lagi pemisahan "tool A vs tool B" — retrieval selalu lewat satu jalur semantic search yang sama.
>
> **Versi ini adalah hasil sesi grill-me (2026-08-15).** Seluruh keputusan desain di bawah sudah disepakati dan menggantikan versi sebelumnya.

## Prinsip utama

1. **Tabel relational (`penyakit`, `konten_penyakit`, dll) tetap single source of truth** untuk data yang ditampilkan di halaman web. Lihat skema di Supabase (tabel berbahasa Indonesia).
2. **Tabel `knowledge_embeddings`** adalah lapisan tambahan khusus chatbot — representasi vector dari konten yang sama (data penyakit) ditambah konten FAQ navigasi yang tidak ada di tabel relational.
3. Chatbot **tidak pernah** melakukan function calling / tool selection. Alurnya selalu sama: embed → similarity search → generate jawaban.

## Keputusan desain (hasil grill)

| # | Aspek | Keputusan |
|---|-------|-----------|
| 1 | Sumber data disease | Tabel asli `penyakit` + `konten_penyakit` (BUKAN tabel `diseases` imajiner). |
| 2 | Granularitas chunk disease | **1 baris embedding per seksi** di `konten_penyakit` (lebih presisi daripada 1 baris per penyakit). `source_id = konten_penyakit.id`. |
| 3 | Format `content` disease | `Nama: {nama_penyakit}\n{judul_seksi}: {isi}` — prepend nama penyakit saja (tanpa ringkasan). Hanya seksi `tampilkan = true`. |
| 4 | Model embedding | `gemini-embedding-001`, dimensi 768. `task_type` dipecah: `RETRIEVAL_DOCUMENT` saat seeding, `RETRIEVAL_QUERY` saat query user. |
| 5 | Model generation | `gemini-3.6-flash` — `gemini-2.0-flash` sudah retired di Gemini API (404), cek versi terbaru bila perlu. |
| 6 | Index pgvector | **HNSW** (bukan ivfflat) — dataset kecil ±152 baris, ivfflat recall-nya buruk. |
| 7 | Link balik | Kolom `penyakit_id` disimpan di baris disease → link `/penyakit/{penyakit_id}` (route frontend saat ini). |
| 8 | Dedup hasil retrieval | **Postgres function** `match_knowledge_embeddings` — top-1 per `penyakit_id` via window function (diversity untuk pertanyaan umum). |
| 9 | Threshold similarity | Cosine > **0.3** (configurable di `config.py`). Di bawahnya short-circuit "di luar cakupan" tanpa memanggil LLM. |
| 10 | Sumber FAQ | Parse `RAG_KNOWLEDGE_BASE.md` langsung di `ingest.py` (regex `## ENTRI`). Markdown tetap single source of truth. |
| 11 | Idempotensi seeding | `TRUNCATE knowledge_embeddings` lalu insert ulang semua. |
| 12 | Jalur koneksi chat | Frontend → BFF (Express 4000, proxy) → RAG API (FastAPI 8000). Konsisten dengan pola existing. |
| 13 | Dependensi | Buat `requirements.txt` (TIDAK diinstall di WSL; install manual di conda Windows). |

## Stack yang dipakai

| Komponen         | Teknologi                                                       |
| ---------------- | --------------------------------------------------------------- |
| Embedding model  | Google `gemini-embedding-001` (dimensi 768)                     |
| Generation model | Google `gemini-3.6-flash` (2.0-flash sudah retired)              |
| Vector store     | Supabase Postgres + ekstensi `pgvector`                         |
| Library          | `google-genai`, `supabase` (Python), `fastapi`, `uvicorn`       |

## Skema tabel `knowledge_embeddings`

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_embeddings (
    id BIGSERIAL PRIMARY KEY,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('disease', 'faq')),
    source_id BIGINT,                  -- konten_penyakit.id jika source_type = 'disease', NULL jika 'faq'
    penyakit_id BIGINT,                -- penyakit.id induk, diisi untuk 'disease', NULL untuk 'faq'
    content TEXT NOT NULL,             -- teks yang di-embed (lihat aturan penyusunan di bawah)
    embedding VECTOR(768),             -- gemini-embedding-001 default 768 dimensi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_embeddings_embedding
    ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_knowledge_embeddings_source
    ON knowledge_embeddings(source_type, source_id);

ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_knowledge_embeddings"
    ON knowledge_embeddings FOR SELECT USING (true);
```

Catatan:
- Tidak ada trigger `updated_at` — data diperlakukan fixed content.
- RLS SELECT for all: RAG API memakai `SUPABASE_KEY` (service role, bypass RLS), policy ini untuk hygiene/akses publik saja.

## Aturan penyusunan `content` per source_type

### Untuk `source_type = 'disease'` (1 baris per seksi)

Gabungkan `penyakit.nama` dengan 1 seksi `konten_penyakit` (`tampilkan = true`):

```
Nama: {penyakit.nama}
{judul_seksi}: {isi_seksi}
```

Contoh nyata:
```
Nama: Tuberkulosis
Gejala: Batuk berdarah, demam lebih dari 3 minggu, ...
```

- `source_id = konten_penyakit.id`
- `penyakit_id = konten_penyakit.id_penyakit`
- Seksi dengan `tampilkan = false` dilewati (tidak di-embed).

### Untuk `source_type = 'faq'`

Satu baris per entri di `RAG_KNOWLEDGE_BASE.md` (15 entri). Format `content`:

```
Topik: {topik}
Pertanyaan terkait: {pertanyaan_terkait}
Jawaban: {jawaban}
```

- `source_id = NULL`, `penyakit_id = NULL`.

## Proses seeding embedding (one-time, dijalankan manual di env conda Windows)

Jalankan `ingest.py` dari local (bukan WSL, bukan bagian aplikasi runtime):

1. `TRUNCATE knowledge_embeddings` (idempoten — aman dijalankan ulang).
2. Ambil semua `penyakit` + `konten_penyakit` (`tampilkan = true`) dari Supabase.
3. Susun `content` per seksi sesuai format di atas → panggil Gemini Embedding API (`task_type = RETRIEVAL_DOCUMENT`, dimensi 768) → insert baris `source_type = 'disease'`.
4. Parse `RAG_KNOWLEDGE_BASE.md` (split per `## ENTRI`, ekstrak Topik / Pertanyaan terkait / Jawaban) → susun `content` → embed (`RETRIEVAL_DOCUMENT`) → insert `source_type = 'faq'`.
5. Cetak jumlah baris per `source_type` untuk verifikasi (harus = jumlah seksi tampil + 15 FAQ).

## Postgres function `match_knowledge_embeddings`

Dedup **di SQL** (keputusan grill #6): window function mengambil top-1 chunk per `penyakit_id`. Baris FAQ (`penyakit_id` NULL) otomatis unik per baris sehingga tidak kena dedup.

```sql
CREATE OR REPLACE FUNCTION match_knowledge_embeddings(
    query_embedding VECTOR(768),
    match_count INT,
    similarity_threshold FLOAT
)
RETURNS TABLE (
    source_type VARCHAR,
    source_id BIGINT,
    penyakit_id BIGINT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH ranked AS (
        SELECT
            ke.source_type,
            ke.source_id,
            ke.penyakit_id,
            ke.content,
            1 - (ke.embedding <=> query_embedding) AS similarity,
            ROW_NUMBER() OVER (
                PARTITION BY ke.penyakit_id
                ORDER BY ke.embedding <=> query_embedding ASC
            ) AS rn
        FROM knowledge_embeddings ke
        WHERE ke.embedding <=> query_embedding < 1 - similarity_threshold
    )
    SELECT source_type, source_id, penyakit_id, content, similarity
    FROM ranked
    WHERE rn = 1
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
```

Panggilan dari Python (`supabase.rpc`):

```python
result = supabase.rpc(
    "match_knowledge_embeddings",
    {
        "query_embedding": query_vector,
        "match_count": 5,
        "similarity_threshold": 0.3,
    },
).execute()
```

## Alur runtime saat user bertanya

```
1. User mengirim pertanyaan (teks) → BFF → RAG API (/api/rag/chat)
2. Embed pertanyaan: gemini-embedding-001, task_type = RETRIEVAL_QUERY, 768 dims
3. Panggil match_knowledge_embeddings(query, 5, 0.3)
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
mencampur history (keputusan arsitektur, lihat AGENTS.md).

## Jalur koneksi frontend → RAG (proxy via BFF)

```
frontend ChatWidget ──POST /api/rag/chat──▶ BFF (Express :4000)
        BFF ──proxy POST──▶ RAG API (FastAPI :8000) ──▶ Supabase + Gemini
```

- **BFF** (`server/src/server.js`) menambah route `POST /api/rag/chat` yang memforward `{question}` ke `RAG_API_URL` (env baru, mis. `http://localhost:8000`), lalu meneruskan `{answer, sources}` balik ke frontend.
- **Frontend** (`src/lib/api.ts`) menambah `api.chat(question)`; `ChatWidget.tsx` memakainya.
- CORS cukup diatur di BFF (pola existing); FastAPI tidak perlu CORS untuk akses server-side.
- Cari tahu route BFF di `server/src/server.js` (port 4000), jangan duplikasi logika.

## Dependensi Python (`RAG/requirements.txt`)

```
fastapi
uvicorn
pydantic
python-dotenv
google-genai
supabase
```

> **Catatan env:** Agent berada di WSL; Python conda user ada di **Windows**. Jangan jalankan `pip install` di WSL — install manual di conda Windows lalu jalankan `ingest.py` / server FastAPI dari sana.

## Larangan untuk agent

- Jangan bangun mekanisme function calling / tool selection.
- Jangan pakai tabel `diseases` imajiner dari versi doc lama — sumber nyata adalah `penyakit` + `konten_penyakit`.
- Jangan gunakan ivfflat — index sudah HNSW.
- Jangan install dependensi Python di WSL (env conda ada di Windows).
- Jangan ubah `task_type` embedding jadi satu nilai untuk semua — split DOCUMENT (ingest) / QUERY (retrieval).
- Jangan hardcode threshold di dalam kode runtime — jadikan konstanta di `config.py` agar mudah dikalibrasi.

## Status implementasi saat ini (untuk panduan agent)

| Komponen | Status |
|----------|--------|
| `app/main.py` | Ada (endpoint `/api/rag/chat`) |
| `app/schemas/chat.py` | Ada (`ChatRequest.question`) |
| `app/services/retrieval.py` | Ada — rpc + dedup + threshold di function SQL |
| `app/services/embedding.py` | Ada — task_type DOCUMENT/QUERY |
| `app/config.py` | Ada — konstanta model, threshold 0.62, task type |
| Tabel `knowledge_embeddings` | Ada (migration diterapkan) |
| Function `match_knowledge_embeddings` | Ada (migration diterapkan) |
| BFF route proxy `/api/rag/chat` | Ada di `server/src/server.js` |
| Frontend `api.chat` + wiring ChatWidget | Ada |
| `requirements.txt` | Ada |

## Rujukan dokumen terkait

- Frontend: `src/lib/api.ts`, `src/components/ChatWidget.tsx`
- BFF: `server/src/server.js`