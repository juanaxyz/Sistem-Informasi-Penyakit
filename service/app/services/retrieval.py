"""Similarity search vektor di PostgreSQL (pgvector).

Embedding dilakukan lokal (`services/embedding.py`), sehingga tidak ada lagi
panggilan API eksternal di jalur retrieval. Query berparameter penuh (`%s`).
"""

from app.config import MATCH_COUNT, MAX_CHUNKS_PER_PENYAKIT, SIMILARITY_THRESHOLD
from app.db import connection, to_vector_literal
from app.services.embedding import generate_embedding

# Operator `<=>` = cosine distance, jadi similarity = 1 - distance.
# Karena konten dipecah jadi beberapa chunk per penyakit, `ROW_NUMBER` dipakai
# untuk membatasiä¸Šä½ N chunk per penyakit -- tanpa itu, 5 hasil retrieval bisa
# semuanya berasal dari satu penyakit yang sama. FAQ (penyakit_id NULL)
# dikelompokkan lewat -id agar tiap baris punya partisi sendiri; `PARTITION BY`
# memperlakukan NULL sebagai satu kelompok, yang bila dibiarkan akan mengembalikan
# maksimal 1 chunk FAQ.
MATCH_SQL = f"""
    SELECT source_type, source_id, chunk_index, penyakit_id, content, similarity
    FROM (
        SELECT
            ke.source_type,
            ke.source_id,
            ke.chunk_index,
            ke.penyakit_id,
            ke.content,
            1 - (ke.embedding <=> %s::vector) AS similarity,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(ke.penyakit_id, -ke.id)
                ORDER BY ke.embedding <=> %s::vector ASC
            ) AS rn
        FROM knowledge_embeddings ke
        WHERE ke.embedding IS NOT NULL
          AND 1 - (ke.embedding <=> %s::vector) >= %s
    ) ranked
    WHERE rn <= %s
    ORDER BY similarity DESC
    LIMIT %s
"""


def retrieve_chunks(question: str) -> list[dict]:
    query_vector = generate_embedding(question)
    literal = to_vector_literal(query_vector)

    with connection() as conn:
        rows = conn.execute(
            MATCH_SQL,
            (literal, literal, literal, SIMILARITY_THRESHOLD, MAX_CHUNKS_PER_PENYAKIT, MATCH_COUNT),
        ).fetchall()

    return [dict(row) for row in rows]


def is_out_of_scope(chunks: list[dict]) -> bool:
    return len(chunks) == 0
