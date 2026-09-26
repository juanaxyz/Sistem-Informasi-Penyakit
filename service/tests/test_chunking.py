"""Tes untuk chunking berbasis token.

Fokus: menjamin chunk tidak PERNAH melebihi `CHUNK_TOKENS` (kalau iya, model
memotongnya diam-diam), dan bahwa overlap + header bekerja.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import CHUNK_OVERLAP_TOKENS, CHUNK_TOKENS, MODEL_MAX_SEQ_LENGTH
from app.services.chunking import chunk_text
from app.services.embedding import get_tokenizer

HEADER = "Nama: COVID-19\nBagian: Pengertian & Ringkasan"


@pytest.fixture(scope="module")
def tokenizer():
    return get_tokenizer()


def n_tokens(tokenizer, text):
    return len(tokenizer(text)["input_ids"])


def make_text(n_sentences, words_per_sentence=20):
    """Kalimat Indonesia sintetis dengan panjang terkendali."""
    filler = "penyakit paru-paru menyebabkan ".split()
    out = []
    for i in range(n_sentences):
        words = [filler[j % len(filler)] for j in range(words_per_sentence)]
        out.append(" ".join(words) + f" bagian {i}.")
    return " ".join(out)


def test_teks_kosong_tidak_produksi_chunk(tokenizer):
    assert chunk_text("", tokenizer, header=HEADER) == []
    assert chunk_text("   \n\n  ", tokenizer, header=HEADER) == []


def test_teks_pendek_menjadi_satu_chunk(tokenizer):
    out = chunk_text("Tuberculosis adalah penyakit paru yang disebabkan bakteri.", tokenizer, header=HEADER)
    assert len(out) == 1
    assert out[0].startswith(HEADER)


def test_teks_panjang_dipecah(tokenizer):
    out = chunk_text(make_text(120), tokenizer, header=HEADER)
    assert len(out) > 1, "teks panjang harus dipecah"


def test_tidak_ada_chunk_melebihi_batas(tokenizer):
    """Regresi utama: model memotong input > MODEL_MAX_SEQ_LENGTH secara diam-diam."""
    out = chunk_text(make_text(300), tokenizer, header=HEADER)
    for i, c in enumerate(out):
        assert n_tokens(tokenizer, c) <= CHUNK_TOKENS, (
            f"chunk {i} punya {n_tokens(tokenizer, c)} token > {CHUNK_TOKENS}"
        )


def test_batas_kosong_tanpa_header_terjaga(tokenizer):
    out = chunk_text(make_text(200), tokenizer, header="")
    for i, c in enumerate(out):
        assert n_tokens(tokenizer, c) <= CHUNK_TOKENS, f"chunk {i} melebihi batas"


def test_overlap_membuat_teks_berulang(tokenizer):
    out = chunk_text(make_text(200), tokenizer, header=HEADER)
    assert len(out) >= 2
    # Potongan ekor chunk pertama harus muncul di awal chunk kedua.
    tail = out[0][-80:]
    assert tail[-40:] in out[1], "chunk berikutnya harus memuat ekor chunk sebelumnya"


def test_kalimat_tunggal_panjang_dipotong_paksa(tokenizer):
    """Satu kalimat tanpa tanda baca harus tetap terpecah, bukan loop tak habis."""
    satu_kalimat = " ".join(["paru"] * 2000)
    out = chunk_text(satu_kalimat, tokenizer, header=HEADER)
    assert len(out) > 1
    for i, c in enumerate(out):
        assert n_tokens(tokenizer, c) <= CHUNK_TOKENS, f"chunk {i} melebihi batas"


def test_hampir_seluruh_kalimat_tetap_ada(tokenizer):
    """Hampir semua kalimat asli harus muncul di salah satu chunk."""
    text = make_text(60)
    out = chunk_text(text, tokenizer, header="")
    for i in range(60):
        assert f"bagian {i}." in " ".join(out), f"kalimat {i} hilang"


def test_config_konsisten():
    assert CHUNK_TOKENS <= MODEL_MAX_SEQ_LENGTH, (
        "CHUNK_TOKENS tidak boleh melebihi MODEL_MAX_SEQ_LENGTH"
    )
    assert 0 <= CHUNK_OVERLAP_TOKENS < CHUNK_TOKENS
