# service — API Layanan Python (RAG Chat + Analisis Citra)

Satu service FastAPI yang mengabungkan dua kemampuan:

1. **RAG Chat** — chatbot asisten kesehatan (retrieval-augmented generation
   dengan **unified vector search** di Supabase + Gemini).
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
        BFF ──proxy POST──▶ service (FastAPI :8000) ──▶ Supabase + Gemini

frontend AnalysisPage ──POST /api/riwayat──▶ BFF
        BFF ──POST /api/riwayat/:id/analisis──▶ service /api/prediksi
        service ──▶ 3× model ONNX (atau stub) ──▶ { predictions, stub }
```

### RAG Chat
1. Embed pertanyaan (`gemini-embedding-001`, `RETRIEVAL_QUERY`, 768 dims)
2. `match_knowledge_embeddings(query, 5, 0.62)` di Supabase (dedup top-1 per penyakit)
3. Kosong (semua di bawah threshold) → balas "di luar cakupan" **tanpa LLM**
4. Ada → kirim context ke `gemini-3.6-flash` → jawaban + link `/penyakit/{id}`

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
| Embedding | Google `gemini-embedding-001` (768 dims) |
| Generation | Google `gemini-3.6-flash` (`gemini-2.0-flash` sudah retired) |
| Vector store | Supabase Postgres + `pgvector` (HNSW) |
| Inferensi citra | `onnxruntime` (+ `numpy`, `pillow`) |
| API | FastAPI + Uvicorn (Python) |
| Client | `google-genai`, `supabase` |

## Struktur

```
service/
├── app/
│   ├── main.py            # FastAPI: /api/rag/chat, /api/prediksi, /, /health
│   ├── config.py          # konstanta RAG + registri model citra (MODELS)
│   ├── schemas/
│   │   ├── chat.py        # ChatRequest
│   │   └── prediction.py  # PredictionsResponse
│   └── services/
│       ├── embedding.py   # gemini-embedding-001 (DOCUMENT/QUERY)
│       ├── retrieval.py   # rpc match_knowledge_embeddings
│       ├── generation.py  # gemini-3.6-flash + instruksi link
│       ├── model_loader.py# bungkus model ONNX + fallback stub
│       └── predictions.py # decode/resize gambar + jalankan N model
├── models/                # letakkan file .onnx di sini (hanya .gitkeep)
├── ingest.py              # seeding RAG satu kali (TRUNCATE + disease + FAQ)
├── test.py                # smoke test endpoint chat lokal
├── requirements.txt
├── RAG_ARCHITECTURE.md    # spec arsitektur & keputusan desain (chat)
└── .env.example           # contoh env: GEMINI + SUPABASE + citra
```

## Setup

> **PENTING — env Python (conda) ada di Windows, bukan WSL.**
> Semua perintah `python`/`pip` dijalankan dari Windows,
> mis. `D:\python-env\RAG\python.exe`.

1. Siapkan `.env` di folder ini (salinan dari `.env.example`:

   ```
   GEMINI_API_KEY=<Google AI Studio API key>
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_KEY=<service_role key project yang sama dengan aplikasi>
   ALLOW_STUB=1
   ```

   `SUPABASE_URL`/`SUPABASE_KEY` harus project yang sama dengan yang dipakai
   `server/.env` (bukan project lain yang kosong).

2. Install dependensi di conda Windows:

   ```
   pip install -r requirements.txt
   ```

## Seeding RAG (satu kali, dijalankan manual)

```
python ingest.py
```

- `TRUNCATE` tabel lalu insert ulang (idempoten, aman dijalankan ulang).
- `source_type='disease'`: 1 baris per seksi `konten_penyakit` (`tampilkan=true`).
- `source_type='faq'`: parse `RAG_KNOWLEDGE_BASE.md` langsung (15 entri).

Verifikasi: total harus = jumlah seksi tampil + 15.

## Menjalankan API

```
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Endpoint:

| Method | Path | Body | Keterangan |
| --- | --- | --- | --- |
| GET | `/` | — | Health check / versi |
| GET | `/health` | — | Status RAG (gemini_configured) + status tiap model citra |
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
  "answer": "Berdasarkan ... /penyakit/22",
  "sources": [
    { "source_type": "disease", "source_id": 157, "penyakit_id": 22,
      "content": "Nama: Tuberkulosis (TBC)\n...", "similarity": 0.715 }
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
- **Frontend**: `frontend/src/lib/api.ts` (`api.chat`, `api.riwayat.create`);
  `ChatWidget.tsx` untuk chat, `AnalysisPage.tsx` untuk upload gambar.

## Kalibrasi

- **Threshold** similarity: `SIMILARITY_THRESHOLD` di `app/config.py`
  (sekarang `0.62`). Terlalu rendah → pertanyaan di luar cakupan ikut
  dijawab; terlalu tinggi → pertanyaan valid terbuang ke short-circuit.
- **Model generation**: `GENERATION_MODEL` di `app/config.py`. Versi Gemini
  berubah cepat; cek versi terbaru bila API menolak model lama.

## Dokumen terkait

- `RAG_ARCHITECTURE.md` — spec arsitektur & keputusan desain (chat)
- `AGENTS.md` — panduan untuk agent yang bekerja di folder ini