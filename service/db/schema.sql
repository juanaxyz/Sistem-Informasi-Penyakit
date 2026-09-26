-- Skema tabel vector untuk RAG (semantic search) di PostgreSQL.
-- Aman dijalankan ulang (idempotent) lewat `python scripts/apply_schema.py`.
--
-- Tabel sumber (penyakit, artikel, artikel_bagian, faq) diasumsikan sudah ada
-- di database yang sama -- cek `server/db/schema.sql` untuk tabel inti aplikasi.
--
-- CATATAN DIMENSI: kolom `embedding` bertipe VECTOR(384) karena model embedding
-- lokal `LazarusNLP/all-indo-e5-small-v4` menghasilkan 384 dimensi. Bila model
-- diganti, ubah nilai di sini DAN `EMBEDDING_DIMENSION` di `app/config.py`,
-- lalu jalankan ulang `apply_schema.py`. Skrip akan menyesuaikan ulang tabel
-- bila dimensinya tidak cocok, karena isinya bisa dibangun ulang lewat `ingest.py`.

CREATE EXTENSION IF NOT EXISTS vector;

-- Satu baris = satu chunk dari satu sumber.
--   source_type = 'disease' -> source_id = artikel_bagian.id, penyakit_id = penyakit.id
--   source_type = 'faq'     -> source_id = faq.id,             penyakit_id = NULL
--
-- Chunking: satu sumber (mis. satu artikel_bagian) dipecah jadi beberapa chunk
-- supaya tiap vektor berisi satu gagasan utuh dan muat dalam batas input model.
-- Karena itu `chunk_index` wajib ada: (source_type, source_id) saja tidak unik lagi.
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id              BIGSERIAL PRIMARY KEY,
    source_type     VARCHAR(20) NOT NULL CHECK (source_type IN ('disease', 'faq')),
    source_id       BIGINT      NOT NULL,
    chunk_index     INTEGER     NOT NULL DEFAULT 0,
    penyakit_id     BIGINT,
    content         TEXT        NOT NULL,
    -- source_hash  = hash konten MENTAH sumber, untuk melacak apakah sumber berubah.
    -- content_hash = hash teks chunk FINAL, untuk melacak perubahan per chunk.
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

-- HNSW (bukan ivfflat): korpus kecil sehingga recall ivfflat buruk.
-- Index ini dipakai saat retrieval; window function dedup di query retrieval
-- membuat planner bisa memilih sequential scan untuk korpus sekecil ini.
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_embedding
    ON knowledge_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_penyakit
    ON knowledge_embeddings(penyakit_id);
