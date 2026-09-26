"""Koneksi PostgreSQL (psycopg 3) untuk service ini.

Meniru `server/src/db/pg.js`: satu pool yang dipakai bersama, query selalu
berparameter (`%s`) — tidak ada interpolasi string dari input user.
"""

from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import PG_DSN, PG_POOL_MAX

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    """Pool singleton, dibuat saat pertama dipakai (tidak saat import)."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=PG_DSN,
            max_size=PG_POOL_MAX,
            open=True,
            kwargs={"row_factory": dict_row},
        )
    return _pool


@contextmanager
def connection():
    """Pin satu connection selama blok berjalan."""
    with get_pool().connection() as conn:
        yield conn


def close_pool() -> None:
    """Tutup pool bila sudah dibuat (dipakai saat shutdown aplikasi)."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def to_vector_literal(vector: list[float]) -> str:
    """Serialisasi vektor float menjadi literal pgvector `'[0.1,0.2,...]'`.

    Dipakai dengan cast `::vector` pada query berparameter. `repr()` dipakai
    karena memberi representasi terpendek yang tetap round-trip persis ke float
    aslinya, sehingga tidak ada presisi yang hilang.
    """
    return "[" + ",".join(repr(float(v)) for v in vector) + "]"


def ping() -> bool:
    """True bila database terjangkau. Dipakai endpoint /health."""
    try:
        with connection() as conn:
            conn.execute("SELECT 1")
        return True
    except psycopg.Error:
        return False
