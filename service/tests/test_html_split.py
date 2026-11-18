"""Tes pemecah HTML artikel per <h2> dan konversi teks polos.

Tidak butuh tokenizer/model — modul ini murni stdlib.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.html_split import (
    html_to_plain_text,
    split_paragraphs,
    split_sections,
)


def test_sections_dipecah_per_h2():
    html = (
        "<h2>Gejala</h2><p>batuk</p><p>demam</p>"
        "<h2>Penyebab</h2><h3>Bakteri</h3><p>infeksi</p>"
    )
    assert split_sections(html) == [
        ("Gejala", "batuk\ndemam"),
        ("Penyebab", "Bakteri\ninfeksi"),
    ]


def test_isi_h3_tetap_ikut_bagian_h2():
    sections = split_sections("<h2>A</h2><h3>Sub</h3><p>x</p>")
    assert len(sections) == 1
    assert sections[0][1] == "Sub\nx"


def test_konten_sebelum_h2_pertama_tidak_hilang():
    sections = split_sections("<p>pengantar</p><h2>Gejala</h2><p>batuk</p>")
    assert sections[0] == ("", "pengantar")
    assert sections[1] == ("Gejala", "batuk")


def test_tanpa_h2_satu_bagian():
    assert split_sections("<p>satu paragraf</p>") == [("", "satu paragraf")]


def test_bagian_kosong_dibuang():
    sections = split_sections("<h2>Kosong</h2><p></p><h2>Isi</h2><p>ada</p>")
    assert [t for t, _ in sections] == ["Isi"]


def test_li_diawali_tanda_hubung():
    text = html_to_plain_text("<ul><li>batuk</li><li>demam</li></ul>")
    assert text == "- batuk\n- demam"


def test_blok_menjadi_baris_baru_dan_entitas_didekode():
    text = html_to_plain_text(
        "<h2>Gejala</h2><p>a &amp; b</p><p>baris<br>baru</p>"
    )
    assert text == "Gejala\na & b\nbaris\nbaru"


def test_script_dibuang_teks_biasa_tetap():
    text = html_to_plain_text("<p>aman<script>alert(1)</script></p>")
    assert text == "aman"


def test_spasi_berlebih_dirapikan():
    text = html_to_plain_text("<p>  teks   \n acak  </p>")
    assert text == "teks acak"


def test_html_kosong():
    assert html_to_plain_text("") == ""
    assert html_to_plain_text(None) == ""
    assert split_sections("") == []
    assert split_sections(None) == []


def test_heading_dengan_tag_inline():
    sections = split_sections("<h2>Gejala <em>utama</em></h2><p>x</p>")
    assert sections[0][0] == "Gejala utama"


def test_split_paragraphs():
    assert split_paragraphs("satu\n\n\ndua\n\n") == ["satu", "dua"]
    assert split_paragraphs("") == []


def test_setara_dengan_bbf_html_to_plain_text():
    # Harus cocok dengan server/src/utils/html.js htmlToPlainText.
    html = "<h2>Gejala</h2><p>batuk <strong>berat</strong></p><ul><li>demam</li></ul>"
    assert html_to_plain_text(html) == "Gejala\nbatuk berat\n- demam"
