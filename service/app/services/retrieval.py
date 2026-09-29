"""Similarity search vektor di PostgreSQL (pgvector).

Embedding dilakukan lokal (`services/embedding.py`), sehingga tidak ada lagi
panggilan API eksternal di jalur retrieval. Query berparameter penuh (`%s`).
"""

from app.config import MATCH_COUNT, MAX_CHUNKS_PER_PENYAKIT, SIMILARITY_THRESHOLD, BODY_PART_BOOST
from app.db import connection, to_vector_literal
from app.services.embedding import generate_embedding

# Body parts dictionary untuk ekstraksi dari query
BODY_PART_KEYWORDS = [
    "dada", "paru", "paru-paru", "perut", "kepala", "leher", 
    "panggul", "lutut", "telapak kaki", "telapak tangan", "jari",
    "mata", "telinga", "hidung", "mulut", "gigi", "lidah",
    "tenggorokan", "lambung", "usus", "hati", "ginjal", "jangkang",
    "paha", "betis", "paha", "bahu", "siku", "pergelangan tangan",
    "jantung", "otak", "sumsum tulang", "kulit", "rambut", "kuku"
]

def extract_body_parts(query: str) -> list[str]:
    """Ekstrak kata kunci bagian tubuh dari query bahasa Indonesia."""
    q = query.lower()
    found = []
    for bp in BODY_PART_KEYWORDS:
        if bp in q:
            found.append(bp)
    return found

# Hybrid search: semantic similarity + body part boost
# Body part boost: +0.3 jika chunk memiliki body part yang cocok dengan query
MATCH_SQL = f"""
    SELECT source_type, source_id, chunk_index, penyakit_id, content, 
           similarity + body_part_boost AS final_score
    FROM (
        SELECT
            ke.source_type,
            ke.source_id,
            ke.chunk_index,
            ke.penyakit_id,
            ke.content,
            1 - (ke.embedding <=> %s::vector) AS similarity,
            CASE 
                WHEN ke.bagian_tubuh && %s::text[] THEN {BODY_PART_BOOST}
                ELSE 0
            END AS body_part_boost,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(ke.penyakit_id, -ke.id)
                ORDER BY (1 - (ke.embedding <=> %s::vector) + 
                          CASE WHEN ke.bagian_tubuh && %s::text[] THEN {BODY_PART_BOOST} ELSE 0 END) DESC
            ) AS rn
        FROM knowledge_embeddings ke
        WHERE ke.embedding IS NOT NULL
          AND 1 - (ke.embedding <=> %s::vector) >= %s
    ) ranked
    WHERE rn <= %s
    ORDER BY final_score DESC
    LIMIT %s
"""


def retrieve_chunks(question: str) -> list[dict]:
    query_vector = generate_embedding(question)
    literal = to_vector_literal(query_vector)
    body_parts = extract_body_parts(question)
    body_parts_array = "{" + ",".join(body_parts) + "}" if body_parts else "{}"

    with connection() as conn:
        rows = conn.execute(
            MATCH_SQL,
            (literal, body_parts_array, literal, body_parts_array, literal, SIMILARITY_THRESHOLD, MAX_CHUNKS_PER_PENYAKIT, MATCH_COUNT),
        ).fetchall()

    return [dict(row) for row in rows]


def is_out_of_scope(chunks: list[dict]) -> bool:
    return len(chunks) == 0
