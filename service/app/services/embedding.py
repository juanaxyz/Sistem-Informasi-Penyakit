"""Embedding lokal via sentence-transformers.

Model `LazarusNLP/all-indo-e5-small-v4` (384 dim) dilatih pada korpus Indonesia
(IndonLI, MMARCO-ID, MIRACL, IndoQA, LFQA-ID) memakai loss kontras e5.

Catatan penting: model ini **tidak** memakai prefix `query:` / `passage:`,
sehingga parameter `task_type` tidak relevan dan dihapus total dari config.
Vektor selalu dinormalisasi L2 karena query SQL memakai cosine distance (`<=>`).

Gemini tetap dipakai untuk MENJAWAB (`services/generation.py`), bukan untuk
embedding — sehingga ingest tidak lagi menyentuh API berbayar.
"""

import threading

from sentence_transformers import SentenceTransformer

from app.config import EMBEDDING_DIMENSION, EMBEDDING_MODEL, MODEL_MAX_SEQ_LENGTH

_model = None
_lock = threading.Lock()


def _model_dimension(model: SentenceTransformer) -> int:
    """Dimensi keluaran model.

    sentence-transformers >= 6 menamai method ini `get_embedding_dimension`;
    nama lama masih ada tapi memicu FutureWarning.
    """
    getter = getattr(model, "get_embedding_dimension", None) or (
        model.get_sentence_embedding_dimension
    )
    return int(getter())


def _get_model() -> SentenceTransformer:
    """Model singleton. Dibuat saat pertama dipakai agar service tetap bisa
    dinyalakan tanpa model terunduh (endpoint prediksi citra tidak butuh ini)."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                model = SentenceTransformer(EMBEDDING_MODEL)
                # PENTING: config model menyatakan max_seq_length = 128. Kalau dibiarkan,
                # sentence-transformers akan MEMOTONG input lebih dari 128 token secara
                # diam-diam — tidak ada error, tidak ada warning di log produksi, tapi
                # seluruh ekor tiap chunk lenyap tanpa jejak. XLM-R dilatih pada 512
                # posisi, jadi menaikkan batas ini aman.
                model.max_seq_length = MODEL_MAX_SEQ_LENGTH
                dim = _model_dimension(model)
                if dim != EMBEDDING_DIMENSION:
                    raise ValueError(
                        f"Dimensi embedding model '{EMBEDDING_MODEL}' adalah {dim}, "
                        f"tidak cocok dengan EMBEDDING_DIMENSION={EMBEDDING_DIMENSION} "
                        f"pada app/config.py. Samakan keduanya lalu terapkan ulang skema."
                    )
                _model = model
    return _model


def generate_embedding(text: str) -> list[float]:
    """Vektor L2-normalized sepanjang `EMBEDDING_DIMENSION`.

    Normalisasi wajib: query SQL memakai cosine distance (`<=>`) pgvector, dan
    brute-force dot product harus setara dengan cosine hanya bila vektor bersatuan.
    """
    return generate_embeddings([text])[0]


def generate_embeddings(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """Versi batch dari `generate_embedding` — jauh lebih cepat untuk ingest.

    Penting: model dipanggil sekali per batch, bukan sekali per teks.
    """
    if not texts:
        return []
    vectors = _get_model().encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return [[float(v) for v in vec] for vec in vectors]


def get_tokenizer():
    """Tokenizer model — dipakai `chunking.py` agar hitungan token akurat.

    Chunking berbasis perkiraan karakter prone salah: Bahasa Indonesia
    rata-rata hanya ~1.8 karakter per token pada XLM-R, bukan ~4 seperti
    model Bahasa Inggris. Menghitung dengan tokenizer asli mencegah
    pemotongan diam-diam.
    """
    return _get_model().tokenizer
