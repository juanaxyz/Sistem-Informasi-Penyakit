import secrets

import psycopg
from fastapi import FastAPI, File, Header, HTTPException, UploadFile

from app import db
from app.config import (
    ALLOW_STUB,
    EMBEDDING_DIMENSION,
    EMBEDDING_MODEL,
    GEMINI_API_KEY,
    GENERATION_MODEL,
    MODELS,
    RAG_ADMIN_TOKEN,
)
from app.schemas.chat import ChatRequest
from app.services.ingestion import IngestError, run_ingest
from app.services.retrieval import retrieve_chunks, is_out_of_scope
from app.services.generation import generate_answer
from app.services.model_loader import load_registry
from app.services.predictions import run_predictions

OUT_OF_SCOPE_ANSWER = (
    "Maaf, pertanyaan ini berada di luar cakupan informasi website. "
    "Saya hanya dapat membantu pertanyaan seputar informasi penyakit dan "
    "cara menggunakan website ini. Silakan hubungi tenaga medis profesional "
    "untuk konsultasi kesehatan."
)

app = FastAPI(title="Web Paru-Paru Service API", version="2.0.0")

registry = load_registry(MODELS)


@app.get("/")
def root():
    return {"message": "Service API is running"}


@app.get("/health")
def health():
    return {
        "status": "OK",
        "rag": {
            "gemini_configured": bool(GEMINI_API_KEY),
            "database": db.ping(),
            "embedding_model": EMBEDDING_MODEL,
            "embedding_dimension": EMBEDDING_DIMENSION,
            "generation_model": GENERATION_MODEL,
            "admin_sync_enabled": bool(RAG_ADMIN_TOKEN),
        },
        "prediksi": {
            "stub_allowed": ALLOW_STUB,
            "models": [m.summary() for m in registry],
        },
    }


@app.post("/api/rag/chat")
def chat(request: ChatRequest):
    print("QUESTION:", request.question)
    print("SESSION:", request.session_id, "| HISTORY turns:", len(request.history or []))

    chunks = retrieve_chunks(request.question)

    if is_out_of_scope(chunks):
        print("OUT_OF_SCOPE: no chunks above threshold")
        return {
            "question": request.question,
            "answer": OUT_OF_SCOPE_ANSWER,
            "sources": [],
            "session_id": request.session_id,
        }

    print("CHUNKS:", chunks)

    answer = generate_answer(request.question, chunks, history=request.history)

    print("ANSWER:", answer)

    return {
        "question": request.question,
        "answer": answer,
        "sources": chunks,
        "session_id": request.session_id,
    }


@app.post("/api/prediksi")
async def prediksi(image: UploadFile = File(...)):
    """Terima 1 gambar, jalankan 3 model berbeda, kembalikan 3 hasil."""
    if not ALLOW_STUB and not any(m.available for m in registry):
        raise HTTPException(
            status_code=503,
            detail=(
                "Model prediksi belum tersedia: letakkan file .onnx model di "
                "direktori models/ (lihat README). Untuk uji coba alur, atur "
                "ALLOW_STUB=1 pada lingkungan service/."
            ),
        )
    data = await image.read()
    if not data:
        raise HTTPException(status_code=422, detail="Gambar kosong")
    try:
        return run_predictions(data, registry, ALLOW_STUB)
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Gagal memproses gambar: {exc}") from exc

@app.post("/api/load-knowledge")
def load_knowledge(x_rag_admin_token: str = Header(default="")):
    """Sinkronkan ulang embedding knowledge base dari `artikel_bagian` + `faq`.

    Dipicu tombol "Sinkronkan Basis Pengetahuan" di Admin Dashboard lewat BFF.
    Service Python yang menangani semuanya: ambil data -> chunk -> embed (lokal)
    -> simpan ke PostgreSQL. Tidak ada body request.

    Dilindungi dua lapis:
      1. BFF mewajibkan role admin (satu-satunya pemanggil yang diizinkan).
      2. Header `X-Rag-Admin-Token` dicocokkan dengan `RAG_ADMIN_TOKEN`.

    Dijalankan sinkron: embedding lokal untuk korpus kecil hanya butuh beberapa
    detik, jadi tidak perlu pola background job + polling.
    """
    if not RAG_ADMIN_TOKEN:
        raise HTTPException(
            status_code=503,
            detail=(
                "RAG_ADMIN_TOKEN belum diatur di service/.env, sehingga endpoint "
                "sinkronisasi dinonaktifkan demi keamanan."
            ),
        )
    if not secrets.compare_digest(x_rag_admin_token, RAG_ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="Token admin tidak valid")

    try:
        return run_ingest(log=lambda *_args: None)
    except IngestError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except psycopg.Error as exc:
        raise HTTPException(status_code=500, detail=f"Gagal sinkronisasi basis pengetahuan: {exc}")
