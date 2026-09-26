# service — API Layanan Python (RAG Chat + Analisis Citra)

Satu service FastAPI yang mengabungkan dua kemampuan:

1. **RAG Chat** — chatbot asisten kesehatan (retrieval-augmented generation
   dengan **unified vector search** di PostgreSQL/pgvector + Gemini).
2. **Analisis Citra** — prediksi N hasil (3 model berbeda) dari 1 gambar X-ray.

> Bukan alat diagnosis. Jawaban chat hanya disusun dari sumber internal website
> (konten penyakit + FAQ navigasi); hasil prediksi citra adalah bantuan, bukan
> keputusan medis.

Folder ini sebelumnya dua service terpisah (`RAG/` untuk chat dan `Analisis/`
untuk citra). Setelah digabung, cukup **1 perintah run** untuk menghidupkan
seluruh layanan berbasis Python:

```
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Arsitektur

```
frontend ChatWidget ──POST /api/rag/chat──▶ BFF (Express :4000)
        BFF ──proxy POST──▶ service (FastAPI :8000) ──▶ PostgreSQL (pgvector) + Gemini

frontend AnalysisPage ──POST /api/riwayat──▶ BFF
        BFF ──POST /api/riwayat/:id/analisis──▶ service /api/prediksi
        service ──▶ 3× model ONNX (atau stub) ──▶ { predictions, stub }
```

### RAG Chat
1. Embed pertanyaan secara lokal (`LazarusNLP/all-indo-e5-small-v4`, 384 dims,
   L2-normalized). Tidak ada panggilan API untuk embedding.
2. Similarity search di `knowledge_embeddings` (cosine `<=>`, dedup top-2 per
   penyakit, threshold 0.40, max 5 chunk)
3. Kosong (semua di bawah threshold) → balas "di luar cakupan" **tanpa LLM**
4. Ada → kirim context ke `gemini-3.6-flash` → jawaban + link `/penyakit/{id}`

Gemini hanya dipakai pada langkah 4 (menyusun jawaban), tidak untuk embedding.

### Analisis Citra
- 1 gambar multipart (`image`) → 3 model berbeda (DenseNet121, ResNet50,
  EfficientNetB0, semuanya `v1`) → 3 prediksi `{ model_id, nama_model, versi,
  label, confidence }`.
- Inferensi via `onnxruntime` (opsional). Tanpa file `.onnx` dan dengan
  `ALLOW_STUB=1`, hasil adalah **fallback deterministik** (hash gambar + model)
  sehingga alur end-to-end tetap bisa diuji sebelum model asli dipasang.
- Tanpa stub & tanpa model → `503` dengan instruksi.

## Stack

| Komponen | Teknologi |
| --- | --- |
| Embedding | `sentence-transformers` lokal — `LazarusNLP/all-indo-e5-small-v4` (384 dims) |
| Generation | Google `gemini-3.6-flash` (`gemini-2.0-flash` sudah retired) |
| Chunking | Token-based, 256 token/chunk, overlap 32, tokenizer model yang sama |
| Vector store | PostgreSQL lokal + `pgvector` (HNSW), tabel `knowledge_embeddings` |
| Driver DB | `psycopg` 3 (connection pool) |
| Inferensi citra | `onnxruntime` (+ `numpy`, `pillow`) |
| API | FastAPI + Uvicorn (Python) |
| Client | `google-genai` |

## Struktur

```
service/
├── app/
│   ├── main.py            # FastAPI: /api/rag/chat, /api/prediksi, /, /health
│   ├── config.py          # konstanta RAG + PG* + registri model citra (MODELS)
│   ├── db.py              # connection pool psycopg (singleton)
│   ├── schemas/
│   │   ├── chat.py        # ChatRequest
│   │   └── prediction.py  # PredictionsResponse
│   └── services/
│       ├── embedding.py   # sentence-transformers lokal, lazy load, normalized
│       ├── chunking.py    # chunk 256 token + overlap, snap batas kalimat
│       ├── ingestion.py   # baca -> chunk -> embed -> upsert knowledge_embeddings
│       ├── retrieval.py   # similarity search SQL (dedup top-2 per penyakit)
│       ├── generation.py  # gemini-3.6-flash + instruksi link
│       ├── model_loader.py# bungkus model ONNX + fallback stub
│       └── predictions.py # decode/resize gambar + jalankan N model
├── db/
│   └── schema.sql         # tabel knowledge_embeddings + index HNSW
├── scripts/
│   └── apply_schema.py    # terapkan db/schema.sql (idempotent + deteksi drift)
├── tests/
│   └── test_chunking.py   # jaminan chunk tidak pernah melebihi batas token
├── ingest.py              # CLI: jalankan sinkronisasi tanpa HTTP
├── models/                # letakkan file .onnx di sini (hanya .gitkeep)
├── ingest.py              # seeding RAG (inkremental via content_hash)
├── test.py                # smoke test endpoint chat lokal
├── requirements.txt
├── requirements-dev.txt   # pytest (opsional, untuk tests/)
├── RAG_ARCHITECTURE.md    # spec arsitektur & keputusan desain (chat)
└── .env.example           # contoh env: GEMINI + PG* + citra
```

## Setup

> **PENTING — env Python (conda) ada di Windows, bukan WSL.**
> Semua perintah `python`/`pip` dijalankan dari Windows,
> mis. `D:\python-env\RAG\python.exe`.

1. Siapkan `.env` di folder ini (salinan dari `.env.example`):

   ```
   GEMINI_API_KEY=<Google AI Studio API key>
   PGHOST=localhost
   PGPORT=5432
   PGUSER=postgres
   PGPASSWORD=admin
   PGDATABASE=capstone_paru
   ALLOW_STUB=1
   ```

   Credential PostgreSQL **harus sama dengan `server/.env`** — service RAG dan
   BFF kini membaca satu database yang sama, bukan dua project terpisah.

2. Install dependensi di conda Windows:

   ```
   pip install -r requirements.txt
   ```

   Untuk menjalankan test (opsional, tidak dibutuhkan runtime):

   ```
   pip install -r requirements-dev.txt
   python -m pytest tests/
   ```

3. Terapkan skema tabel vector (sekali saja, idempotent):

   ```
   python scripts/apply_schema.py
   ```

   Memerlukan ekstensi `pgvector` terpasang di database:
   `CREATE EXTENSION IF NOT EXISTS vector;`

## Seeding RAG (dijalankan manual, aman diulang)

```
python ingest.py
```

- `source_type='disease'`: 1 baris per baris `artikel_bagian` yang kontennya
  tidak kosong,_join_ ke `penyakit` untuk nama penyakit. `source_id` =
  `artikel_bagian.id`, `penyakit_id` = `penyakit.id` (dipakai untuk link
  `/penyakit/{id}`).
- `source_type='faq'`: 1 baris per baris `faq` dengan pertanyaan & jawaban
  terisi. `source_id` = `faq.id`, `penyakit_id` = NULL.
- **Inkremental**: baris dengan `content_hash` yang tidak berubah tidak
  di-embed ulang (menghemat panggilan Gemini). Baris yang hilang dari sumber
  otomatis dihapus.
- Jalankan ulang setiap kali konten penyakit atau FAQ berubah.

## Menjalankan API

```
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Endpoint:

| Method | Path | Body | Keterangan |
| --- | --- | --- | --- |
| GET | `/` | — | Health check / versi |
| GET | `/health` | — | Status RAG (`gemini_configured`, `database`) + status tiap model citra |
| POST | `/api/rag/chat` | `{ "question", "session_id?", "history?" }` | Jawaban + `sources` |
| POST | `/api/prediksi` | multipart `image` | 3 prediksi + `stub` flag |

### `/api/rag/chat`

`session_id` dan `history` opsional (multi-turn). `history` = array
`{ role: "user" | "assistant", content: string }`; dipakai sebagai konteks
percakapan (retrieval tetap per-question). `session_id` tidak disimpan server.

Response contoh:

```json
{
  "question": "Apa saja gejala TBC?",
  "answer": "Berdasarkan ... /penyakit/2",
  "sources": [
    { "source_type": "disease", "source_id": 157, "penyakit_id": 2,
      "content": "Nama: Tuberkulosis\nBagian: Gejala\n...", "similarity": 0.715 }
  ],
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `/api/prediksi`

Response contoh (mode stub):

```json
{
  "predictions": [
    { "model_id": "densenet121", "nama_model": "DenseNet121", "versi": "v1",
      "label": "Lung Opacity", "confidence": 0.89 },
    { "model_id": "resnet50", "nama_model": "ResNet50", "versi": "v1",
      "label": "COVID-19", "confidence": 0.75 },
    { "model_id": "efficientnetb0", "nama_model": "EfficientNetB0", "versi": "v1",
      "label": "Pneumonia", "confidence": 0.76 }
  ],
  "stub": true
}
```

### Memasang model ONNX asli

1. Ekspor model ke ONNX lalu letakkan di `models/` (default `models/*.onnx`).
2. Samakan `onnx_path` di `app/config.py` (atau env `MODEL_ONNX_*` di `.env`)
   dengan nama file.
3. Pastikan `input_size` & `labels` sesuai model (urutan output = urutan kelas).
4. Matikan `ALLOW_STUB` (0 atau hapus dari `.env`) agar hasil benar-benar dari
   model. Tanpa `.onnx` dan `ALLOW_STUB` mati → endpoint memberi `503`.

## Integrasi (BFF & frontend)

- **BFF** (`server/src/server.js`): `POST /api/rag/chat` mem-proxy ke
  `RAG_API_URL`; `POST /api/riwayat/:id/analisis` memanggil `MODEL_API_URL/api/prediksi`.
  Keduanya default ke `http://localhost:8000` (satu service ini).
- **Database**: service ini dan BFF membaca satu PostgreSQL yang sama
  (`PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` identik dengan `server/.env`).
  Tabel sumber (`penyakit`, `artikel_bagian`, `faq`) dipakai bersama; tabel
  vector `knowledge_embeddings` dimiliki service ini saja.
- **Frontend**: `frontend/src/lib/api.ts` (`api.chat`, `api.riwayat.create`);
  `ChatWidget.tsx` untuk chat, `AnalysisPage.tsx` untuk upload gambar.

## Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| `/health` → `database: false` | PostgreSQL tidak terjangkau. Cek `PGHOST`/`PGPASSWORD` di `.env` dan bahwa service PostgreSQL jalan. |
| `relation "knowledge_embeddings" does not exist` | Skema belum diterapkan → `python scripts/apply_schema.py`. |
| `operator does not exist: vector <=> unknown` | Ekstensi pgvector belum aktif → `CREATE EXTENSION vector;` (atau jalankan ulang `apply_schema.py`). |
| Semua pertanyaan dijawab "di luar cakupan" | `knowledge_embeddings` masih kosong → `python ingest.py`. |
| Jawaban tanpa link `/penyakit/{id}` | `penyakit_id` NULL — pastikan sumber disease diambil dari `artikel_bagian` yang ter-`JOIN` ke `penyakit`, lalu `ingest.py`. |
| Port 8000 sudah dipakai | Ada instance service lama yang masih jalan. Matikan dulu, lalu jalankan ulang agar env/kode baru terpasang. |

## Kalibrasi

- **Threshold** similarity: `SIMILARITY_THRESHOLD` di `app/config.py`
  (sekarang `0.40`). Terlalu rendah → pertanyaan di luar cakupan ikut
  dijawab; terlalu tinggi → pertanyaan valid terbuang ke short-circuit.
  Angka ini diukur dari korpus **saat ini** (10 chunk: 1 paragraf medis +
  8 FAQ cara-pakai-situs + 1 data uji): in-scope 0.595–0.824, out-of-scope
  ≤ 0.248. **Wajib diukur ulang begitu isi knowledge base berubah banyak.**
- **Jumlah chunk**: `MATCH_COUNT` di `app/config.py` (sekarang `5`).
- **Ukuran chunk**: `CHUNK_TOKENS` (256) dan `CHUNK_OVERLAP_TOKENS` (32).
  Harus ≤ `MODEL_MAX_SEQ_LENGTH` (512) — kalau tidak, model memotong ekor
  chunk secara diam-diam. `tests/test_chunking.py` menjaganya.
- **Model generation**: `GENERATION_MODEL` di `app/config.py`. Versi Gemini
  berubah cepat; cek versi terbaru bila API menolak model lama.

## Dokumen terkait

- `RAG_ARCHITECTURE.md` — spec arsitektur & keputusan desain (chat)
- `AGENTS.md` — panduan untuk agent yang bekerja di folder ini