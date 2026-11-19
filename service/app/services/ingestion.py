"""Sinkronisasi `knowledge_embeddings` dari sumber di database.

Dipakai tiga jalur:
- `ingest.py` (CLI, backfill penuh)
- `POST /api/load-knowledge` (endpoint, dipicu tombol admin panel)
- `POST /api/ingest-article` (dipicu BFF setiap kali artikel disimpan)

Sumber konten disease: tabel `artikel` (satu HTML Quill per penyakit, sudah
disanitasi BFF). Satu artikel dipecah menjadi chunk per heading <h2>
(isi <h3> ikut bagian <h2>-nya); bagian yang lebih panjang dari
`CHUNK_TOKENS` dipecah lagi per paragraf. `content` selalu teks polos
(diprefix header konteks "Nama: ... Bagian: ..."), BUKAN HTML.

Optimasi: chunk yang `content_hash`-nya tidak berubah (dan embed_model sama)
tidak di-embed ulang. Chunk lama dengan indeks yang tak lagi ada dihapus,
sehingga artikel yang makin pendek tidak meninggalkan vektor basi.
"""

import hashlib
import time

import psycopg
from psycopg.rows import dict_row

from app.config import CHUNK_TOKENS, EMBEDDING_MODEL, PG_DSN
from app.db import to_vector_literal
from app.services.chunking import chunk_section, chunk_text
from app.services.embedding import generate_embeddings, get_tokenizer
from app.services.html_split import html_to_plain_text, split_sections, split_paragraphs

SOURCE_DISEASE = "disease"
SOURCE_FAQ = "faq"

# Konten penyakit berasal dari `artikel` (satu HTML Quill per penyakit).
# Join bagian_tubuh via penyakit_bagian_tubuh untuk metadata body parts.
DISEASE_SQL = """
    SELECT a.id AS source_id, a.id_penyakit AS penyakit_id,
           a.konten, COALESCE(NULLIF(a.konten_teks, ''), NULL) AS konten_teks,
           p.nama AS nama_penyakit,
           COALESCE(array_agg(DISTINCT bt.nama) FILTER (WHERE bt.nama IS NOT NULL), '{}') AS bagian_tubuh
    FROM artikel a
    JOIN penyakit p ON p.id = a.id_penyakit
    LEFT JOIN penyakit_bagian_tubuh pbt ON pbt.id_penyakit = p.id
    LEFT JOIN bagian_tubuh bt ON bt.id = pbt.id_bagian_tubuh
    WHERE COALESCE(btrim(a.konten), '') <> ''
    GROUP BY a.id, a.id_penyakit, a.konten, a.konten_teks, p.nama
    ORDER BY a.id_penyakit, a.id
"""

DISEASE_SQL_ONE = DISEASE_SQL.replace(
    "WHERE COALESCE(btrim(a.konten), '') <> ''",
    "WHERE a.id = %(id_artikel)s AND COALESCE(btrim(a.konten), '') <> ''",
)

FAQ_SQL = """
    SELECT id AS source_id, pertanyaan, jawaban
    FROM faq
    WHERE COALESCE(btrim(pertanyaan), '') <> ''
      AND COALESCE(btrim(jawaban), '') <> ''
    ORDER BY id
"""


class IngestError(RuntimeError):
    """Kegagalan yang layak ditampilkan ke admin (bukan 500 generik)."""


def content_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _disease_header(nama_penyakit: str, judul: str | None) -> str:
    header = f"Nama: {nama_penyakit}"
    judul = (judul or "").strip()
    if judul:
        header += f"\nBagian: {judul}"
    return header


def _faq_header(row: dict) -> str:
    return f"Pertanyaan: {(row['pertanyaan'] or '').strip()}"


def _plan_disease_chunks(row: dict, tokenizer) -> list[str]:
    """Pecah satu artikel menjadi chunk teks polos per heading <h2>."""
    html = row["konten"] or ""
    pieces: list[str] = []
    for judul, text in split_sections(html):
        header = _disease_header(row["nama_penyakit"], judul)
        pieces.extend(
            chunk_section(text, tokenizer, max_tokens=CHUNK_TOKENS, header=header)
        )
    return pieces


def _plan_rows(conn: psycopg.Connection, tokenizer) -> list[dict]:
    """Baca sumber, pecah jadi chunk, dan hashi semuanya."""
    planned: list[dict] = []

    for row in conn.execute(DISEASE_SQL).fetchall():
        raw = (row["konten_teks"] or "").strip() or html_to_plain_text(row["konten"])
        source_hash = content_sha256(f"{row['nama_penyakit']}\n{raw}")
        pieces = _plan_disease_chunks(row, tokenizer)
        bagian_tubuh = row["bagian_tubuh"] if row["bagian_tubuh"] else []
        for i, piece in enumerate(pieces):
            planned.append(
                {
                    "source_type": SOURCE_DISEASE,
                    "source_id": row["source_id"],
                    "chunk_index": i,
                    "penyakit_id": row["penyakit_id"],
                    "bagian_tubuh": bagian_tubuh,
                    "content": piece,
                    "source_hash": source_hash,
                    "content_hash": content_sha256(piece),
                }
            )

    for row in conn.execute(FAQ_SQL).fetchall():
        question = (row["pertanyaan"] or "").strip()
        answer = (row["jawaban"] or "").strip()
        raw = f"Pertanyaan: {question}\nJawaban: {answer}"
        source_hash = content_sha256(raw)
        header = _faq_header(row)
        pieces = chunk_text(answer, tokenizer, header=header)
        for i, piece in enumerate(pieces):
            planned.append(
                {
                    "source_type": SOURCE_FAQ,
                    "source_id": row["source_id"],
                    "chunk_index": i,
                    "penyakit_id": None,
                    "bagian_tubuh": [],
                    "content": piece,
                    "source_hash": source_hash,
                    "content_hash": content_sha256(piece),
                }
            )

    return planned


def _stored_chunks(conn: psycopg.Connection) -> dict[tuple[str, int], dict[int, tuple[str, str]]]:
    """{source_key: {chunk_index: (content_hash, embed_model)}}."""
    rows = conn.execute(
        """
        SELECT source_type, source_id, chunk_index, content_hash, embed_model
        FROM knowledge_embeddings
        """
    ).fetchall()
    stored: dict[tuple[str, int], dict[int, tuple[str, str]]] = {}
    for r in rows:
        key = (r["source_type"], r["source_id"])
        stored.setdefault(key, {})[r["chunk_index"]] = (
            r["content_hash"], r["embed_model"],
        )
    return stored


def _is_current(chunk_info: tuple[str, str], content_hash: str) -> bool:
    return chunk_info[0] == content_hash and chunk_info[1] == EMBEDDING_MODEL


def run_ingest(log=print) -> dict:
    """Sinkronkan seluruh basis pengetahuan. Mengembalikan ringkasan."""
    started = time.perf_counter()
    tokenizer = get_tokenizer()

    with psycopg.connect(PG_DSN, row_factory=dict_row) as conn:
        planned = _plan_rows(conn, tokenizer)
        if not planned:
            raise IngestError(
                "Tidak ada konten sumber. Isi tabel artikel atau faq terlebih dahulu."
            )

        summary = _sync_sources(conn, tokenizer, planned, log)
        summary["chunk_tokens"] = CHUNK_TOKENS
        summary["durasi_detik"] = round(time.perf_counter() - started, 2)
        log(
            f"Selesai: {summary['total']} chunk dari {sum(summary['sumber'].values())} sumber "
            f"dalam {summary['durasi_detik']}s"
        )
        return summary


def ingest_article(id_artikel: int, log=print) -> dict:
    """Sinkronkan chunk satu artikel (dipicu BFF setelah PUT /api/artikel/:id)."""
    started = time.perf_counter()
    tokenizer = get_tokenizer()

    with psycopg.connect(PG_DSN, row_factory=dict_row) as conn:
        rows = conn.execute(DISEASE_SQL_ONE, {"id_artikel": id_artikel}).fetchall()
        if not rows:
            raise IngestError(f"artikel {id_artikel} tidak ditemukan / kontennya kosong")

        planned: list[dict] = []
        for row in rows:
            raw = (row["konten_teks"] or "").strip() or html_to_plain_text(row["konten"])
            source_hash = content_sha256(f"{row['nama_penyakit']}\n{raw}")
            pieces = _plan_disease_chunks(row, tokenizer)
            for i, piece in enumerate(pieces):
                planned.append(
                    {
                        "source_type": SOURCE_DISEASE,
                        "source_id": row["source_id"],
                        "chunk_index": i,
                        "penyakit_id": row["penyakit_id"],
                        "bagian_tubuh": row["bagian_tubuh"] or [],
                        "content": piece,
                        "source_hash": source_hash,
                        "content_hash": content_sha256(piece),
                    }
                )

        summary = _sync_sources(conn, tokenizer, planned, log, prune_missing=False)
        summary["id_artikel"] = id_artikel
        summary["chunk_tokens"] = CHUNK_TOKENS
        summary["durasi_detik"] = round(time.perf_counter() - started, 2)
        return summary


def _sync_sources(
    conn, tokenizer, planned: list[dict], log, prune_missing: bool = True
) -> dict:
    """Tulis rencana chunk ke DB: embed hanya yang berubah, hapus yang basi.

    `prune_missing=True` (untuk run_ingest) menghapus seluruh chunk sumber yang
    tidak ada di `planned`. `ingest_article` memproses satu artikel saja dan
    harus mengirim `prune_missing=False`, sebab `planned` tidak pernah berisi
    sumber lain — pemangkasan di sini akan menghapus seluruh basis pengetahuan.
    """
    stored = _stored_chunks(conn)

    by_source: dict[tuple[str, int], list[dict]] = {}
    for p in planned:
        by_source.setdefault((p["source_type"], p["source_id"]), []).append(p)

    to_embed: list[dict] = []
    unchanged_meta: list[dict] = []
    changed_sources = 0

    for key, pieces in by_source.items():
        source_chunks = stored.get(key, {})
        source_changed = False
        for p in pieces:
            stored_info = source_chunks.get(p["chunk_index"])
            if stored_info is None or not _is_current(stored_info, p["content_hash"]):
                to_embed.append(p)
                source_changed = True
            else:
                unchanged_meta.append(p)
        if source_changed:
            changed_sources += 1

    log(f"Chunk: total={len(planned)} | perlu embed={len(to_embed)}, "
        f"tidak berubah={len(unchanged_meta)}")

    vectors = generate_embeddings([p["content"] for p in to_embed]) if to_embed else []

    with conn.transaction():
        # Sumber yang hilang dari DB -> hapus seluruh chunk-nya.
        # Hanya untuk sinkronisasi penuh; lihat docstring fungsi ini.
        if prune_missing:
            for key in stored:
                if key not in by_source:
                    conn.execute(
                        "DELETE FROM knowledge_embeddings WHERE source_type = %s AND source_id = %s",
                        key,
                    )
        # Artikel makin pendek -> hapus ekor chunk_index yang tak lagi ada.
        for key, pieces in by_source.items():
            wanted = max(p["chunk_index"] for p in pieces) + 1
            if key in stored and len(stored[key]) > wanted:
                conn.execute(
                    "DELETE FROM knowledge_embeddings "
                    "WHERE source_type = %s AND source_id = %s AND chunk_index >= %s",
                    (key[0], key[1], wanted),
                )

        for p, vector in zip(to_embed, vectors):
            conn.execute(
                """
                INSERT INTO knowledge_embeddings
                    (source_type, source_id, chunk_index, penyakit_id, bagian_tubuh, content,
                     source_hash, content_hash, embed_model, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
                ON CONFLICT (source_type, source_id, chunk_index) DO UPDATE SET
                    penyakit_id     = EXCLUDED.penyakit_id,
                    bagian_tubuh    = EXCLUDED.bagian_tubuh,
                    content         = EXCLUDED.content,
                    source_hash     = EXCLUDED.source_hash,
                    content_hash    = EXCLUDED.content_hash,
                    embed_model     = EXCLUDED.embed_model,
                    embedding       = EXCLUDED.embedding,
                    diperbarui_pada = CURRENT_TIMESTAMP
                """,
                (
                    p["source_type"], p["source_id"], p["chunk_index"],
                    p["penyakit_id"], p["bagian_tubuh"], p["content"],
                    p["source_hash"], p["content_hash"], EMBEDDING_MODEL,
                    to_vector_literal(vector),
                ),
            )

        # Chunk yang isinya tidak berubah hanya dimutakhirkan metadatanya
        # (penyakit_id / bagian_tubuh bisa saja berubah tanpa isi berubah).
        for p in unchanged_meta:
            conn.execute(
                """
                UPDATE knowledge_embeddings
                SET penyakit_id = %s, bagian_tubuh = %s, source_hash = %s
                WHERE source_type = %s AND source_id = %s AND chunk_index = %s
                """,
                (
                    p["penyakit_id"], p["bagian_tubuh"], p["source_hash"],
                    p["source_type"], p["source_id"], p["chunk_index"],
                ),
            )

    n_sources = {SOURCE_DISEASE: 0, SOURCE_FAQ: 0}
    for st, _sid in by_source:
        n_sources[st] = n_sources.get(st, 0) + 1

    per_source = {
        r["source_type"]: r["n"]
        for r in conn.execute(
            "SELECT source_type, count(*)::int AS n FROM knowledge_embeddings "
            "GROUP BY source_type ORDER BY source_type"
        ).fetchall()
    }

    total = sum(per_source.values())
    return {
        "total": total,
        "per_source": per_source,
        "sumber": n_sources,
        "chunk_terembed": len(to_embed),
        "sumber_berubah": changed_sources,
        "sumber_tidak_berubah": len(by_source) - changed_sources,
        "sumber_dihapus": (
            len([k for k in stored if k not in by_source]) if prune_missing else 0
        ),
        "model": EMBEDDING_MODEL,
    }
