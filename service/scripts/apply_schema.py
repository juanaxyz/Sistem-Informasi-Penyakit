"""Terapkan db/schema.sql ke PostgreSQL.

Jalankan dari folder mana pun:

    python scripts/apply_schema.py

Idempotent. Bila tabel `knowledge_embeddings` sudah ada dengan dimensi vektor
yang berbeda dari yang diminta, tabel itu DIBUANG ULANG — isinya sepenuhnya
turunan (hasil `ingest.py`) dan bisa dibangun ulang, sedangkan pgvector tidak
membolehkan mengubah dimensi kolom secara langsung.
"""

import sys
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

# Jalankan dari folder mana pun: pastikan root service/ ada di sys.path.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import EMBEDDING_DIMENSION, PGDATABASE, PG_DSN  # noqa: E402

SCHEMA_FILE = Path(__file__).resolve().parent.parent / "db" / "schema.sql"


REQUIRED_COLUMNS = {
    "source_type",
    "source_id",
    "chunk_index",
    "penyakit_id",
    "content",
    "source_hash",
    "content_hash",
    "embed_model",
    "embedding",
}
EXPECTED_UNIQUE_INDEX = ("source_type", "source_id", "chunk_index")


def _current_dimension(cur) -> int | None:
    """Dimensi kolom `embedding` yang terpasang, atau None bila tabel belum ada."""
    cur.execute("SELECT to_regclass('public.knowledge_embeddings') AS tbl")
    if cur.fetchone()["tbl"] is None:
        return None
    cur.execute(
        """
        SELECT a.atttypmod AS typmod
        FROM pg_attribute a
        WHERE a.attrelid = 'public.knowledge_embeddings'::regclass
          AND a.attname = 'embedding'
          AND NOT a.attisdropped
        """
    )
    row = cur.fetchone()
    if row is None:
        return None
    # Untuk pgvector, atttypmod menyimpan dimensi secara langsung (tanpa offset).
    return row["typmod"]


def _schema_drift(cur) -> str | None:
    """Alasan tabel perlu dibangun ulang, atau None bila skemanya sudah sesuai.

    `CREATE TABLE IF NOT EXISTS` diam-diam tidak mengubah tabel yang sudah ada,
    jadi perubahan skema tidak akan pernah diterapkan tanpa pemeriksaan ini.
    """
    cur.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'knowledge_embeddings'
        """
    )
    columns = {r["column_name"] for r in cur.fetchall()}
    missing = REQUIRED_COLUMNS - columns
    if missing:
        return f"kolom hilang: {', '.join(sorted(missing))}"

    # Kumpulkan kolom tiap unique index, URUTAN index (generate_subscripts),
    # lalu bandingkan sebagai himpunan: urutan tidakierrelevan untuk keunikan.
    cur.execute(
        """
        SELECT array_agg(a.attname ORDER BY s.ord) AS cols
        FROM pg_index i
        JOIN LATERAL generate_subscripts(i.indkey, 1) AS s(ord) ON true
        JOIN pg_attribute a
          ON a.attrelid = i.indrelid
         AND a.attnum = i.indkey[s.ord]
        WHERE i.indrelid = 'knowledge_embeddings'::regclass
          AND i.indisunique
        GROUP BY i.indexrelid
        """
    )
    actual = {frozenset(r["cols"]) for r in cur.fetchall()}
    if frozenset(EXPECTED_UNIQUE_INDEX) not in actual:
        readable = sorted(tuple(sorted(c)) for c in actual)
        return (
            f"unique index {EXPECTED_UNIQUE_INDEX} belum ada; yang ada: "
            f"{readable or 'tidak ada'}"
        )
    return None


def _rebuild(cur, reason: str) -> None:
    """Buang tabel turunan agar skema baru bisa diterapkan bersih."""
    print(f"  ! {reason}")
    print("    -> membangun ulang knowledge_embeddings; jalankan ingest.py setelahnya")
    cur.execute("DROP TABLE IF EXISTS knowledge_embeddings")


def main() -> int:
    if not SCHEMA_FILE.is_file():
        print(f"SKEMA tidak ditemukan: {SCHEMA_FILE}")
        return 1

    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    print(f"Menerapkan schema.sql ke database {PGDATABASE} ...")

    try:
        with psycopg.connect(PG_DSN, autocommit=True, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                found = _current_dimension(cur)
                if found is not None and found != EMBEDDING_DIMENSION:
                    _rebuild(cur, f"dimensi vektor {found} != {EMBEDDING_DIMENSION}")
                    found = None

                if found is not None:
                    drift = _schema_drift(cur)
                    if drift:
                        _rebuild(cur, drift)
                        found = None

                if found is None:
                    cur.execute(sql)
                else:
                    # Skema sudah cocok; jalankan SQL tetap aman (semua idempotent).
                    cur.execute(sql)

                cur.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
                extversion = cur.fetchone()["extversion"]
                if not extversion:
                    print("GAGAL: ekstensi 'vector' tidak aktif.")
                    return 1

                cur.execute(
                    """
                    SELECT source_type,
                           count(DISTINCT source_id)::int AS n_sumber,
                           count(*)::int AS n_chunk
                    FROM knowledge_embeddings
                    GROUP BY source_type ORDER BY source_type
                    """
                )
                per_source = cur.fetchall()

    except psycopg.Error as exc:
        print(f"GAGAL: {exc}")
        return 1

    print(f"  pgvector {extversion} | dimensi vektor {EMBEDDING_DIMENSION}")
    if not per_source:
        print("  knowledge_embeddings kosong -> jalankan `python ingest.py`")
    for s in per_source:
        print(
            f"  {s['source_type']}: {s['n_sumber']} sumber -> "
            f"{s['n_chunk']} chunk"
        )
    print("Selesai.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
