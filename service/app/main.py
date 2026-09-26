from fastapi import FastAPI, File, HTTPException, UploadFile

from app.config import ALLOW_STUB, GEMINI_API_KEY, MODELS
from app.schemas.chat import ChatRequest
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
            "model": "gemini-3.6-flash",
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