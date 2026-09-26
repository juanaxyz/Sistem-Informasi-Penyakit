from google import genai

from app.config import GEMINI_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSION

_gemini_client = None


def _get_client():
    global _gemini_client
    if _gemini_client is None:
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY belum diatur di env service/")
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    return _gemini_client


def generate_embedding(text: str, task_type: str = "RETRIEVAL_QUERY") -> list[float]:
    response = _get_client().models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config={"output_dimensionality": EMBEDDING_DIMENSION, "task_type": task_type},
    )

    return response.embeddings[0].values