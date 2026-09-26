import hashlib
import sys

from supabase import create_client

from app.config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    TASK_TYPE_DOCUMENT,
)
from app.services.embedding import generate_embedding


def content_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def fetch_disease_sections(supabase):
    penyakit = supabase.table("penyakit").select("id, nama").execute().data
    artikel = (
        supabase.table("artikel")
        .select("id, id_penyakit, konten")
        .execute()
        .data
    )

    nama_by_id = {p["id"]: p["nama"] for p in penyakit}
    sections = []
    for a in artikel:
        nama = nama_by_id.get(a["id_penyakit"])
        if not nama:
            continue
        konten = (a.get("konten") or "").strip()
        if not konten:
            continue
        content = f"Nama: {nama}\n{konten}"
        sections.append(
            {
                "source_type": "disease",
                "id_artikel": a["id"],
                "content": content,
                "content_hash": content_sha256(content),
            }
        )
    return sections


def fetch_faqs(supabase) -> list[dict]:
    rows = supabase.table("faq").select("id, pertanyaan, jawaban").execute().data
    faqs = []
    for row in rows:
        content = f"Pertanyaan: {row['pertanyaan']}\nJawaban: {row['jawaban']}"
        faqs.append(
            {
                "source_type": "faq",
                "id_artikel": None,
                "id_faq": row["id"],
                "content": content,
                "content_hash": content_sha256(content),
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
    faq_rows = fetch_faqs(supabase)
    all_rows = disease_rows + faq_rows

    print(f"Rows to embed: disease={len(disease_rows)}, faq={len(faq_rows)}")

    for i, row in enumerate(all_rows, start=1):
        vector = generate_embedding(row["content"], task_type=TASK_TYPE_DOCUMENT)
        supabase.table("knowledge_embeddings").insert(
            {
                "source_type": row["source_type"],
                "id_artikel": row["id_artikel"],
                "id_faq": row.get("id_faq"),
                "content": row["content"],
                "content_hash": row["content_hash"],
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