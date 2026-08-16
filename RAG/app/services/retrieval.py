from supabase import create_client

from app.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    SIMILARITY_THRESHOLD,
    MATCH_COUNT,
)
from app.services.embedding import generate_embedding
from app.config import TASK_TYPE_QUERY


supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def retrieve_chunks(question: str) -> list[dict]:
    query_vector = generate_embedding(question, task_type=TASK_TYPE_QUERY)

    result = supabase.rpc(
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