"""Sinkronisasi embedding lewat CLI.

Jalankan dari folder `service/`:

    python ingest.py

Setara dengan `POST /api/rag/ingest` yang dipicu tombol admin panel — keduanya
memakai `app/services/ingestion.py`, jadi perilakunya identik.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import psycopg  # noqa: E402

from app.services.ingestion import IngestError, run_ingest  # noqa: E402


def main() -> int:
    try:
        run_ingest()
    except IngestError as exc:
        print(f"GAGAL: {exc}")
        return 1
    except psycopg.Error as exc:
        print(f"GAGAL: database error: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
