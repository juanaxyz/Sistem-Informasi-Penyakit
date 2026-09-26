"""Chunking berbasis token untuk knowledge base RAG.

Menghitung token dengan tokenizer model yang sama dengan yang dipakai untuk
embedding. Perkiraan karakter tidak bisa diandalkan: Bahasa Indonesia hanya
~1.8 karakter per token pada XLM-R, sehingga tebakan "1 token = 4 karakter"
akan membuat chunk jauh lebih besar dari yang dijanjikan dan
akibatnya **dipotong** oleh model.

Aturan:
  * panjang chunk <= `CHUNK_TOKENS` (bukan "sekitar"), termasuk header konteks;
  * batas chunk diupayakan snap ke akhir kalimat, bukan memotong di tengah
    kalimat;
  * `CHUNK_OVERLAP_TOKENS` token terakhir diulang di awal chunk berikutnya;
  * kalimat yang sendirian lebih panjang dari budget dipotong paksa
    (memotong di tengah kalimat lebih baik daripada kehilangan isi).
"""

import re

from app.config import CHUNK_OVERLAP_TOKENS, CHUNK_TOKENS, MODEL_MAX_SEQ_LENGTH

# Akhir kalimat: titik/seru/tanya, atau baris baru. Lookahead agar "Rp. 5.000"
# tidak salah dianggap akhir kalimat.
_SENTENCE_END = re.compile(r"[.!?](?=\s)|\n+")

# Budget minimum sebelum kita menyerah memotong di tengah kalimat.
_MIN_BODY_BUDGET = 48


def split_sentences(text: str) -> list[str]:
    """Pecah teks menjadi unit kalimat, buang yang kosong."""
    return [part.strip() for part in _SENTENCE_END.split(text) if part and part.strip()]


def _token_boundaries(text: str, tokenizer) -> tuple[list[int], list[tuple[int, int]]]:
    """Token id + offset karakter, tanpa token khusus."""
    enc = tokenizer(text, add_special_tokens=False, return_offsets_mapping=True)
    return list(enc["input_ids"]), list(enc["offset_mapping"])


def _char_to_token_index(offsets: list[tuple[int, int]], char_pos: int) -> int:
    """Index token yang memuat posisi karakter `char_pos`.

    Offset list terurut, jadi binary search cukup (modul `bisect`). Kalau
    posisi jatuh di antara dua token, ambil token berikutnya.
    """
    lo, hi = 0, len(offsets) - 1
    if hi < 0:
        return 0
    while lo < hi:
        mid = (lo + hi) // 2
        if offsets[mid][1] < char_pos:
            lo = mid + 1
        else:
            hi = mid
    return lo


def chunk_text(
    text: str,
    tokenizer,
    *,
    max_tokens: int = CHUNK_TOKENS,
    overlap_tokens: int = CHUNK_OVERLAP_TOKENS,
    header: str = "",
) -> list[str]:
    """Potong `text` menjadi daftar chunk siap-embed.

    `header` (mis. "Nama: COVID-19 | Bagian: Pengertian") disisipkan di depan
    setiap chunk agar tiap potongan tetap punya konteks sendiri ketika nanti
    dipakai sebagai sumber jawaban â€” vital karena retrieval bisa mengembalikan
    chunk tengah yang tidak menyebut nama penyakitnya.
    """
    text = (text or "").strip()
    if not text:
        return []

    if max_tokens > MODEL_MAX_SEQ_LENGTH:
        raise ValueError(
            f"CHUNK_TOKENS={max_tokens} melebihi MODEL_MAX_SEQ_LENGTH="
            f"{MODEL_MAX_SEQ_LENGTH}; sisa chunk akan dipotong model."
        )

    header = (header or "").strip()
    # +2 untuk token khusus <s> dan </s> yang ditambahkan model.
    header_cost = len(tokenizer(header + "\n", add_special_tokens=False)["input_ids"]) + 2 if header else 2
    body_budget = max_tokens - header_cost
    if body_budget < _MIN_BODY_BUDGET:
        raise ValueError(
            f"Header konteks memakai {header_cost} token sehingga hanya menyisakan "
            f"{body_budget} token untuk isi. Header terlalu panjang atau "
            f"CHUNK_TOKENS terlalu kecil."
        )

    _, offsets = _token_boundaries(text, tokenizer)
    if not offsets:
        return []

    # Posisi akhir kalimat dalam ruang karakter -> index token.
    boundary_tokens = sorted(
        {
            _char_to_token_index(offsets, m.end())
            for m in _SENTENCE_END.finditer(text)
        }
    )

    total = len(offsets)
    chunks: list[str] = []
    start = 0

    while start < total:
        hard_end = min(start + body_budget, total)

        # Snap ke batas kalimat terdekat yang tidak melebihi budget.
        end = hard_end
        if hard_end < total:
            earlier = [b for b in boundary_tokens if start < b <= hard_end]
            if earlier:
                end = earlier[-1]
            # Kalau tak ada satu pun batas kalimat di rentang ini, `end` tetap
            # hard_end: satu kalimat lebih panjang dari budget, jadi potong paksa.

        char_from = offsets[start][0]
        char_to = offsets[end - 1][1]
        body = text[char_from:char_to].strip()
        if body:
            chunks.append(f"{header}\n{body}" if header else body)

        if end >= total:
            break

        # Geser mulai chunk berikutnya, sisakan overlap dari ekor chunk ini.
        next_start = max(start + 1, end - overlap_tokens)
        if next_start > start:
            earlier = [b for b in boundary_tokens if start < b <= next_start]
            if earlier:
                next_start = earlier[-1]
        start = next_start

    return chunks
