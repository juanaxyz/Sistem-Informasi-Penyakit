"""Sinkronisasi `knowledge_embeddings` dari sumber di database.

Dipakai dua kali:
- `ingest.py` (CLI, untuk seeding manual)
- `POST /api/load-knowledge` (endpoint, dipicu tombol admin panel)

Alur: baca sumber -> hash -> chunk -> embed (lokal) -> upsert.

Keputusan desain: TIDAK ada logika "skip kalau hash sama". Embedding berjalan
lokal di CPU (~20 ms/chunk), jadi tidak ada biaya API, kuota, atau rate limit
yang perlu dihindari. Menghemat hitungan itu hanya menambah bureaucracy
(hash parsing, chunk_index bookkeeping, penghapusan ekor) dengan risiko data
basi. Hash tetap DIHITUNG dan disimpan, tapi hanya untuk dilaporkan ke admin
("berapa sumber yang berubah") --ã™ Ø§Ø®ØªØ¨Ø§Ø± idempotensi.

Catatan: satu sumber (artikel_bagian / faq) dipecah menjadi beberapa chunk
supaya tiap vektor berisi satu gagasan utuh dan muat dalam batas input model.
"""

import hashlib
import time

import psycopg
from psycopg.rows import dict_row

from app.config import CHUNK_TOKENS, EMBEDDING_MODEL, PG_DSN
from app.db import to_vector_literal
from app.services.chunking import chunk_text
from app.services.embedding import generate_embeddings, get_tokenizer

SOURCE_DISEASE = "disease"
SOURCE_FAQ = "faq"

# Konten penyakit diambil dari `artikel_bagian` (kolom `artikel.konten` adalah
# legacy yang kosong). Rantai relasi: artikel_bagian -> artikel -> penyakit.
DISEASE_SQL = """
    SELECT ab.id AS source_id, a.id_penyakit AS penyakit_id,
           ab.judul, ab.konten, p.nama AS nama_penyakit
    FROM artikel_bagian ab
    JOIN artikel a ON a.id = ab.id_artikel
    JOIN penyakit p ON p.id = a.id_penyakit
    WHERE COALESCE(btrim(ab.konten), '') <> ''
    ORDER BY a.id_penyakit, ab.urutan, ab.id
"""

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


def _disease_header(row: dict) -> str:
    header = f"Nama: {row['nama_penyakit']}"
    judul = (row.get("judul") or "").strip()
    if judul:
        header += f"\nBagian: {judul}"
    return header


def _faq_header(row: dict) -> str:
    return f"Pertanyaan: {(row['pertanyaan'] or '').strip()}"


def _plan_rows(conn: psycopg.Connection, tokenizer) -> list[dict]:
    """Baca sumber, pecah jadi chunk, dan hashi semuanya.

    Mengembalikan daftar chunk yangåˆ°æ—¶å€™ akan ditulis, lengkap dengan
    `source_hash` (per sumber) dan `content_hash` (per chunk).
    """
    planned: list[dict] = []

    for row in conn.execute(DISEASE_SQL).fetchall():
        raw = (row["konten"] or "").strip()
        source_hash = content_sha256(f"{row['nama_penyakit']}\n{row['judul'] or ''}\n{raw}")
        pieces = chunk_text(raw, tokenizer, header=_disease_header(row))
        for i, piece in enumerate(pieces):
            planned.append(
                {
                    "source_type": SOURCE_DISEASE,
                    "source_id": row["source_id"],
                    "chunk_index": i,
                    "penyakit_id": row["penyakit_id"],
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
        pieces = chunk_text(answer, tokenizer, header=_faq_header(row))
        for i, piece in enumerate(pieces):
            planned.append(
                {
                    "source_type": SOURCE_FAQ,
                    "source_id": row["source_id"],
                    "chunk_index": i,
                    "penyakit_id": None,
                    "content": piece,
                    "source_hash": source_hash,
                    "content_hash": content_sha256(piece),
                }
            )

    return planned


def _stored_state(conn: psycopg.Connection) -> dict[tuple[str, int], dict]:
    """Status tersimpan per sumber: source_hash, embed_model, jumlah chunk."""
    rows = conn.execute(
        """
        SELECT source_type, source_id, source_hash, embed_model,
               count(*)::int AS n_chunk
        FROM knowledge_embeddings
        GROUP BY source_type, source_id, source_hash, embed_model
        """
    ).fetchall()
    return {(r["source_type"], r["source_id"]): r for r in rows}


def run_ingest(log=print) -> dict:
    """Sinkronkan seluruh basis pengetahuan. Mengembalikan ringkasan.

    `log` menerima callable untuk pelaporan progres (CLI prints, API diam).
    """
    started = time.perf_counter()
    tokenizer = get_tokenizer()

    with psycopg.connect(PG_DSN, row_factory=dict_row) as conn:
        planned = _plan_rows(conn, tokenizer)
        if not planned:
            raise IngestError(
                "Tidak ada konten sumber. Isi tabel artikel_bagian atau faq terlebih dahulu."
            )

        stored = _stored_state(conn)

        # Laporan: sumber mana yang berubah (informasi saja, bukan gerbang skip).
        by_source: dict[tuple[str, int], set[str]] = {}
        for p in planned:
            by_source.setdefault((p["source_type"], p["source_id"]), set()).add(p["source_hash"])
        changed = [
            key
            for key, hashes in by_source.items()
            if key not in stored
            or stored[key]["source_hash"] not in hashes
            or stored[key]["embed_model"] != EMBEDDING_MODEL
        ]
        unchanged = len(by_source) - len(changed)

        # Chunk yang tidak ada di DB anymore -> hapus.
        wanted_counts: dict[tuple[str, int], int] = {}
        for p in planned:
            key = (p["source_type"], p["source_id"])
            wanted_counts[key] = max(wanted_counts.get(key, 0), p["chunk_index"] + 1)

        stale_sources = [k for k in stored if k not in wanted_counts]
        shrunk = [
            k for k, n in wanted_counts.items()
            if k in stored and stored[k]["n_chunk"] > n
        ]

        n_sources = {SOURCE_DISEASE: 0, SOURCE_FAQ: 0}
        for st, _sid in wanted_counts:
            n_sources[st] = n_sources.get(st, 0) + 1

        log(f"Sumber: disease={n_sources[SOURCE_DISEASE]}, faq={n_sources[SOURCE_FAQ]}")
        log(
            f"Chunk: total={len(planned)} | sumber berubah={len(changed)}, "
            f"tidak berubah={unchanged}, dihapus={len(stale_sources)}"
        )

        vectors = generate_embeddings([p["content"] for p in planned])

        with conn.transaction():
            for key in stale_sources:
                conn.execute(
                    "DELETE FROM knowledge_embeddings WHERE source_type = %s AND source_id = %s",
                    key,
                )
            for key in shrunk:
                conn.execute(
                    "DELETE FROM knowledge_embeddings "
                    "WHERE source_type = %s AND source_id = %s AND chunk_index >= %s",
                    (key[0], key[1], wanted_counts[key]),
                )

            for row, vector in zip(planned, vectors):
                conn.execute(
                    """
                    INSERT INTO knowledge_embeddings
                        (source_type, source_id, chunk_index, penyakit_id, content,
                         source_hash, content_hash, embed_model, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
                    ON CONFLICT (source_type, source_id, chunk_index) DO UPDATE SET
                        penyakit_id     = EXCLUDED.penyakit_id,
                        content         = EXCLUDED.content,
                        source_hash     = EXCLUDED.source_hash,
                        content_hash    = EXCLUDED.content_hash,
                        embed_model     = EXCLUDED.embed_model,
                        embedding       = EXCLUDED.embedding,
                        diperbarui_pada = CURRENT_TIMESTAMP
                    """,
                    (
                        row["source_type"],
                        row["source_id"],
                        row["chunk_index"],
                        row["penyakit_id"],
                        row["content"],
                        row["source_hash"],
                        row["content_hash"],
                        EMBEDDING_MODEL,
                        to_vector_literal(vector),
                    ),
                )

        per_source = {
            r["source_type"]: r["n"]
            for r in conn.execute(
                "SELECT source_type, count(*)::int AS n FROM knowledge_embeddings "
                "GROUP BY source_type ORDER BY source_type"
            ).fetchall()
        }

    total = sum(per_source.values())
    summary = {
        "total": total,
        "per_source": per_source,
        "sumber": n_sources,
        "chunk_terembed": len(planned),
        "sumber_berubah": len(changed),
        "sumber_tidak_berubah": unchanged,
        "sumber_dihapus": len(stale_sources),
        "model": EMBEDDING_MODEL,
        "chunk_tokens": CHUNK_TOKENS,
        "durasi_detik": round(time.perf_counter() - started, 2),
    }
    log(
        f"Selesai: {total} chunk dari {sum(n_sources.values())} sumber "
        f"dalam {summary['durasi_detik']}s"
    )
    return summary
