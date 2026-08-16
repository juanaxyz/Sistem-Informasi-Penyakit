import re
import sys
from pathlib import Path

from supabase import create_client

from app.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    TASK_TYPE_DOCUMENT,
)
from app.services.embedding import generate_embedding

KNOWLEDGE_BASE_PATH = Path(__file__).parent / "RAG_KNOWLEDGE_BASE.md"


def fetch_disease_sections(supabase):
    penyakit = supabase.table("penyakit").select("id, nama").execute().data
    konten = (
        supabase.table("konten_penyakit")
        .select("id, id_penyakit, judul, isi")
        .eq("tampilkan", True)
        .execute()
        .data
    )

    nama_by_id = {p["id"]: p["nama"] for p in penyakit}
    sections = []
    for k in konten:
        nama = nama_by_id.get(k["id_penyakit"])
        if not nama:
            continue
        isi = (k.get("isi") or "").strip()
        if not isi:
            continue
        sections.append(
            {
                "source_type": "disease",
                "source_id": k["id"],
                "penyakit_id": k["id_penyakit"],
                "content": f"Nama: {nama}\n{k['judul']}: {isi}",
            }
        )
    return sections


def parse_faqs() -> list[dict]:
    text = KNOWLEDGE_BASE_PATH.read_text(encoding="utf-8")
    entries = re.split(r"(?m)^## ENTRI", text)[1:]

    faqs = []
    for entry in entries:
        topik = re.search(r"\*\*Topik:\*\*\s*(.+)", entry)
        pertanyaan = re.search(r"\*\*Pertanyaan terkait:\*\*\s*(.+)", entry)
        jawaban_match = re.search(r"\*\*Jawaban:\*\*\s*(.+)", entry, re.DOTALL)
        if not (topik and pertanyaan and jawaban_match):
            continue
        jawaban = jawaban_match.group(1).strip().rstrip("-")
        faqs.append(
            {
                "source_type": "faq",
                "source_id": None,
                "penyakit_id": None,
                "content": (
                    f"Topik: {topik.group(1).strip()}\n"
                    f"Pertanyaan terkait: {pertanyaan.group(1).strip()}\n"
                    f"Jawaban: {jawaban}"
                ),
            }
        )
    return faqs


def embed_batch(texts: list[str]) -> list[list[float]]:
    return [generate_embedding(t, task_type=TASK_TYPE_DOCUMENT) for t in texts]


def main() -> None:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("TRUNCATE knowledge_embeddings ...")
    supabase.table("knowledge_embeddings").delete().gte("id", 0).execute()

    disease_rows = fetch_disease_sections(supabase)
    faq_rows = parse_faqs()
    all_rows = disease_rows + faq_rows

    print(f"Rows to embed: disease={len(disease_rows)}, faq={len(faq_rows)}")

    for i, row in enumerate(all_rows, start=1):
        vector = generate_embedding(row["content"], task_type=TASK_TYPE_DOCUMENT)
        supabase.table("knowledge_embeddings").insert(
            {
                "source_type": row["source_type"],
                "source_id": row["source_id"],
                "penyakit_id": row["penyakit_id"],
                "content": row["content"],
                "embedding": vector,
            }
        ).execute()
        if i % 10 == 0 or i == len(all_rows):
            print(f"  inserted {i}/{len(all_rows)}")

    rows = supabase.table("knowledge_embeddings").select("source_type").execute().data
    counts = {}
    for row in rows or []:
        counts[row["source_type"]] = counts.get(row["source_type"], 0) + 1
    print("DONE. Total rows:", len(rows or []))
    for st, c in counts.items():
        print(f"  source_type={st}: {c}")


if __name__ == "__main__":
    sys.exit(main())