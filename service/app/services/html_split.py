"""Pemecah HTML artikel (hasil editor Quill) menjadi bagian per <h2>.

Dipakai pipeline embedding: satu artikel sekarang menyimpan satu HTML utuh,
sedangkan chunking RAG mengambil satu bagian per heading <h2> (isi <h3>
tetap ikut bagian <h2> di atasnya).

Memakai stdlib html.parser – tidak butuh dependency tambahan. Harus setara
dengan utils/html.js di BFF: tag blok menjadi baris baru, <li> diawali "- ",
entitas didekode, spasi berlebih dirapikan.
"""

import re
from html.parser import HTMLParser

# Tag yang menutup baris saat dikonversi ke teks polos.
BLOCK_TAGS = {
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "blockquote",
    "div", "ul", "ol", "table", "tr", "br",
}

# Isi tag ini dibuang sepenuhnya dari teks polos.
SKIP_TAGS = {"script", "style", "iframe", "noscript", "template"}

_WS_RE = re.compile(r"\s+")
_PARAGRAPH_RE = re.compile(r"\n\s*\n")


class _TextExtractor(HTMLParser):
    """Kumpulkan teks polos dari HTML: satu baris per elemen blok."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lines: list[str] = []
        self._current: list[str] = []
        self._pending_li = False
        self._skip_depth = 0

    def _flush(self, li_prefix=False):
        line = _WS_RE.sub(" ", "".join(self._current)).strip()
        self._current = []
        if line:
            self.lines.append(line)
        self._pending_li = li_prefix

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self._skip_depth += 1
            return
        if tag == "li":
            self._flush(li_prefix=True)
        elif tag in BLOCK_TAGS:
            self._flush()

    def handle_startendtag(self, tag, attrs):
        # <br/> dan tag void lainnya.
        if tag in BLOCK_TAGS:
            self._flush()

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1
            return
        if tag in BLOCK_TAGS:
            self._flush()

    def handle_data(self, data):
        if not data or self._skip_depth > 0:
            return
        if self._pending_li and not self._current:
            self._current.append("- ")
            self._pending_li = False
        self._current.append(data)


class _SectionSplitter(_TextExtractor):
    """Bagi HTML menjadi (judul, teks polos) per <h2>."""

    def __init__(self):
        super().__init__()
        self.sections: list[tuple[str | None, list[str]]] = [(None, [])]
        self._in_h2 = False
        self._h2: list[str] = []

    @property
    def _current_lines(self) -> list[str]:
        return self.sections[-1][1]

    def _flush(self, li_prefix=False):
        # Baris yang sedang dibangun selalu masuk ke bagian yang aktif.
        line = _WS_RE.sub(" ", "".join(self._current)).strip()
        self._current = []
        if line:
            self._current_lines.append(line)
        self._pending_li = li_prefix

    def handle_starttag(self, tag, attrs):
        if tag == "h2":
            self._flush()
            self._in_h2 = True
            self._h2 = []
            return
        super().handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "h2":
            title = _WS_RE.sub(" ", "".join(self._h2)).strip()
            self._in_h2 = False
            self.sections.append((title, []))
            return
        super().handle_endtag(tag)

    def handle_data(self, data):
        if self._in_h2:
            self._h2.append(data)
            return
        super().handle_data(data)


def html_to_plain_text(html: str | None) -> str:
    """HTML konten artikel menjadi teks polos (satu baris per elemen blok)."""
    extractor = _TextExtractor()
    extractor.feed(html or "")
    extractor.close()
    extractor._flush()
    return "\n".join(extractor.lines)


def split_sections(html: str | None) -> list[tuple[str, str]]:
    """Pecah HTML artikel menjadi [(judul, teks polos), ...] per <h2>.

    Konten sebelum <h2> pertama disimpan sebagai bagian dengan judul kosong
    agar tidak hilang. Bagian yang teksnya kosong dibuang.
    """
    splitter = _SectionSplitter()
    splitter.feed(html or "")
    splitter.close()
    splitter._flush()
    result = []
    for title, lines in splitter.sections:
        text = "\n".join(lines).strip()
        if text:
            result.append((title or "", text))
    return result


def split_paragraphs(text: str) -> list[str]:
    """Pecah teks polos per paragraf (baris kosong), buang yang kosong."""
    return [p.strip() for p in _PARAGRAPH_RE.split(text or "") if p.strip()]
