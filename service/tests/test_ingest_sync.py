"""Regresi _sync_sources: ingest satu artikel tidak boleh menghapus chunk sumber lain.

Latar: `ingest_article` memproses satu artikel, sedangkan logika pemangkasan
`_sync_sources` menghapus setiap sumber yang tidak ada di `planned` — tanpa
penjaga `prune_missing=False`, setiap penyimpanan artikel via BFF menghapus
seluruh basis pengetahuan.
"""

from contextlib import nullcontext

from app.services.ingestion import (
    EMBEDDING_MODEL,
    SOURCE_DISEASE,
    SOURCE_FAQ,
    _sync_sources,
    content_sha256,
)


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class FakeConn:
    """Merekam statement; SELECT mengembalikan baris statis."""

    def __init__(self, rows):
        self.rows = rows
        self.statements = []

    def execute(self, sql, params=()):
        self.statements.append((sql, params))
        # SELECT agregat di akhir _sync_sources minta kolom "n"; kosongkan.
        rows = [] if "GROUP BY" in sql else self.rows
        return FakeResult(rows)

    def transaction(self):
        return nullcontext()


def piece(source_id, chunk_index, content):
    return {
        "source_type": SOURCE_DISEASE,
        "source_id": source_id,
        "chunk_index": chunk_index,
        "penyakit_id": 1,
        "bagian_tubuh": [],
        "content": content,
        "source_hash": "source-hash",
        "content_hash": content_sha256(content),
    }


def stored_row(source_type, source_id, content):
    return {
        "source_type": source_type,
        "source_id": source_id,
        "chunk_index": 0,
        "content_hash": content_sha256(content),
        "embed_model": EMBEDDING_MODEL,
    }


def deletes(conn):
    return [sql for sql, _ in conn.statements if "DELETE FROM knowledge_embeddings" in sql]


def test_ingest_satu_artikel_tidak_menghapus_sumber_lain():
    conn = FakeConn(
        [
            stored_row(SOURCE_DISEASE, 2, "satu"),
            stored_row(SOURCE_DISEASE, 3, "lain"),
            stored_row(SOURCE_FAQ, 1, "faq"),
        ]
    )
    summary = _sync_sources(
        conn,
        tokenizer=None,
        planned=[piece(2, 0, "satu")],
        log=lambda *_args: None,
        prune_missing=False,
    )

    assert deletes(conn) == [], f"tidak boleh ada DELETE: {deletes(conn)}"
    assert summary["sumber_dihapus"] == 0


def test_sinkronisasi_penuh_menghapus_sumber_yang_hilang():
    conn = FakeConn([stored_row(SOURCE_DISEASE, 3, "lama")])
    summary = _sync_sources(
        conn,
        tokenizer=None,
        planned=[piece(2, 0, "satu")],
        log=lambda *_args: None,
        prune_missing=True,
    )

    # Sumber 3 tidak ada di rencana -> dihapus hanya saat sinkronisasi penuh.
    assert len(deletes(conn)) == 1
    assert summary["sumber_dihapus"] == 1
