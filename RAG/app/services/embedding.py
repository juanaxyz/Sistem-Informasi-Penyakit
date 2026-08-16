from google import genai

from app.config import GEMINI_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSION


gemini = genai.Client(api_key=GEMINI_API_KEY)


def generate_embedding(text: str, task_type: str = "RETRIEVAL_QUERY") -> list[float]:
    response = gemini.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config={"output_dimensionality": EMBEDDING_DIMENSION, "task_type": task_type},
    )

    return response.embeddings[0].values