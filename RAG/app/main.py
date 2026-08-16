from fastapi import FastAPI

from app.schemas.chat import ChatRequest
from app.services.retrieval import retrieve_chunks, is_out_of_scope
from app.services.generation import generate_answer

OUT_OF_SCOPE_ANSWER = (
    "Maaf, pertanyaan ini berada di luar cakupan informasi website. "
    "Saya hanya dapat membantu pertanyaan seputar informasi penyakit dan "
    "cara menggunakan website ini. Silakan hubungi tenaga medis profesional "
    "untuk konsultasi kesehatan."
)


app = FastAPI(title="Web Paru-Paru RAG API", version="1.1.0")


@app.get("/")
def root():
    return {"message": "RAG API is running"}


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