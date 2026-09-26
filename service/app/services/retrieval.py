from supabase import create_client

from app.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SIMILARITY_THRESHOLD,
    MATCH_COUNT,
)
from app.services.embedding import generate_embedding
from app.config import TASK_TYPE_QUERY

_supabase_client = None


def _get_supabase():
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL/SUPABASE_KEY belum diatur di env service/")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client


def retrieve_chunks(question: str) -> list[dict]:
    query_vector = generate_embedding(question, task_type=TASK_TYPE_QUERY)

    result = _get_supabase().rpc(
        "match_knowledge_embeddings",
        {
            "query_embedding": query_vector,
            "match_count": MATCH_COUNT,
            "similarity_threshold": SIMILARITY_THRESHOLD,
        },
    ).execute()

    return result.data or []


def is_out_of_scope(chunks: list[dict]) -> bool:
    return len(chunks) == 0