# RAG API — Chatbot Asisten Kesehatan (Unified Vector Search)

Layanan RAG (Retrieval-Augmented Generation) untuk chatbot asisten kesehatan
di website Peta Kesehatan. Pendekatan **unified vector search**: satu tabel
vector di Supabase (`knowledge_embeddings`) menampung embedding dari data
penyakit **dan** FAQ navigasi website sekaligus — tanpa function calling,
tanpa pemisahan tool. Retrieval selalu lewat satu jalur semantic search.

> Bukan alat diagnosis. Jawaban hanya disusun dari sumber internal website
> (konten penyakit + FAQ navigasi).

## Status

Implementasi MVP selesai: migration, seeding (152 baris), retrieval dengan
dedup per penyakit + threshold, generation, proxy BFF, dan wiring frontend
chat widget. Lihat `RAG_ARCHITECTURE.md` untuk spec lengkap & keputusan desain.

## Arsitektur

```
frontend ChatWidget ──POST /api/rag/chat──▶ BFF (Express :4000)
        BFF ──proxy POST──▶ RAG API (FastAPI :8000) ──▶ Supabase + Gemini
```

Alur per pertanyaan:
1. Embed pertanyaan (`gemini-embedding-001`, `RETRIEVAL_QUERY`, 768 dims)
2. `match_knowledge_embeddings(query, 5, 0.62)` di Supabase (dedup top-1 per penyakit)
3. Kosong (semua di bawah threshold 0.62) → balas "di luar cakupan" **tanpa LLM**
4. Ada → kirim context ke `gemini-3.6-flash` bersama pertanyaan → jawaban + link `/penyakit/{id}`

## Stack

| Komponen | Teknologi |
| --- | --- |
| Embedding | Google `gemini-embedding-001` (768 dims) |
| Generation | Google `gemini-3.6-flash` (`gemini-2.0-flash` sudah retired) |
| Vector store | Supabase Postgres + `pgvector` (HNSW) |
| API | FastAPI + Uvicorn (Python) |
| Client | `google-genai`, `supabase` |

## Struktur

```
RAG/
├── app/
│   ├── main.py            # FastAPI, endpoint /api/rag/chat + short-circuit
│   ├── config.py          # konstanta: model, task type, threshold
│   ├── schemas/chat.py    # ChatRequest
│   └── services/
│       ├── embedding.py   # gemini-embedding-001 (DOCUMENT/QUERY)
│       ├── retrieval.py   # rpc match_knowledge_embeddings
│       └── generation.py  # gemini-3.6-flash + instruksi link
├── ingest.py              # seeding satu kali (TRUNCATE + disease + FAQ)
├── test.py                # smoke test endpoint lokal
├── requirements.txt
├── RAG_ARCHITECTURE.md    # spec arsitektur & keputusan desain
└── RAG_KNOWLEDGE_BASE.md  # sumber konten FAQ (15 entri)
```

## Setup

> **PENTING — env Python (conda) ada di Windows, bukan WSL.**
> Semua perintah `python`/`pip` dijalankan dari Windows (conda base),
> mis. lewat PowerShell: `Set-Location D:\project\web_paru_paru_final\RAG`.

1. Siapkan `.env` di folder ini (salinan dari `.env.example` bila ada / dari
   dashboard Supabase + Google AI Studio):

   ```
   GEMINI_API_KEY=<Google AI Studio API key>
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_KEY=<service_role key project yang sama dengan aplikasi>
   ```

   `SUPABASE_URL`/`SUPABASE_KEY` harus project yang sama dengan yang dipakai
   `server/.env` (bukan project lain yang kosong).

2. Install dependensi di conda Windows:

   ```
   pip install -r requirements.txt
   ```

## Seeding (satu kali, dijalankan manual)

Setelah data penyakit final + `RAG_KNOWLEDGE_BASE.md` final:

```
python ingest.py
```

- `TRUNCATE` tabel lalu insert ulang (idempoten, aman dijalankan ulang).
- `source_type='disease'`: 1 baris per seksi `konten_penyakit` (`tampilkan=true`),
  format `Nama: {nama}\n{judul}: {isi}`, `task_type=RETRIEVAL_DOCUMENT`.
- `source_type='faq'`: parse `RAG_KNOWLEDGE_BASE.md` langsung (15 entri).

Verifikasi: total harus = jumlah seksi tampil + 15.

## Menjalankan API

```
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Endpoint:

| Method | Path | Body | Keterangan |
| --- | --- | --- | --- |
| GET | `/` | — | Health check |
| POST | `/api/rag/chat` | `{ "question": "...", "session_id?", "history?" }` | Jawaban + `sources` |

`session_id` dan `history` opsional (multi-turn). `history` = array
`{ role: "user" | "assistant", content: string }` dari turn-turn sebelumnya;
dipakai sebagai konteks percakapan di prompt generation (retrieval tetap
per-question). `session_id` diteruskan apa adanya (identitas sesi, tidak
disimpan server).

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

## Integrasi (BFF & frontend)

- **BFF** (`server/src/server.js`): route `POST /api/rag/chat` mem-proxy ke
  `RAG_API_URL` (env di `server/.env`, default `http://localhost:8000`).
- **Frontend** (`frontend/src/lib/api.ts`): `api.chat(question)`;
  `ChatWidget.tsx` memakainya, link `/penyakit/{id}` jadi navigasi klik.

## Kalibrasi

- **Threshold** similarity: konstanta `SIMILARITY_THRESHOLD` di `app/config.py`
  (sekarang `0.62`). Terlalu rendah → pertanyaan di luar cakupan ikut dijawab;
  terlalu tinggi → pertanyaan valid terbuang ke short-circuit.
- **Model generation**: `GENERATION_MODEL` di `app/config.py`. Versi Gemini
  berubah cepat; cek versi terbaru bila API menolak model lama.

## Dokumen terkait

- `RAG_ARCHITECTURE.md` — spec arsitektur & keputusan desain (hasil grill-me)
- `RAG_KNOWLEDGE_BASE.md` — sumber konten FAQ
- `AGENTS.md` — panduan untuk agent yang bekerja di folder ini