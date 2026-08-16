from google import genai

from app.config import GEMINI_API_KEY, GENERATION_MODEL


gemini = genai.Client(api_key=GEMINI_API_KEY)


def _build_context(chunks: list[dict]) -> str:
    parts = []
    for chunk in chunks:
        part = chunk["content"]
        if chunk.get("source_type") == "disease" and chunk.get("penyakit_id"):
            part += f"\nLink: /penyakit/{chunk['penyakit_id']}"
        parts.append(part)
    return "\n\n".join(parts)


def _get(item, key):
    return item.get(key) if isinstance(item, dict) else getattr(item, key, None)


def _build_history(history: list | None) -> str:
    if not history:
        return ""
    lines = []
    for item in history:
        speaker = "Pengguna" if _get(item, "role") == "user" else "Asisten"
        content = str(_get(item, "content") or "").strip()
        if content:
            lines.append(f"{speaker}: {content}")
    return "\n".join(lines)


def generate_answer(
    question: str,
    chunks: list[dict],
    history: list | None = None,
) -> str:
    context = _build_context(chunks)
    riwayat = _build_history(history)

    prompt = f"""
Kamu adalah asisten informasi kesehatan pada website Sistem Informasi Penyakit Tubuh.

Jawab pertanyaan pengguna hanya berdasarkan informasi yang diberikan pada CONTEXT.
Jika informasi tidak tersedia dalam CONTEXT, katakan bahwa informasi tersebut
tidak ditemukan dalam sumber.

Untuk CONTEXT yang berasal dari halaman penyakit (memiliki bagian "Link: ..."),
sertakan tautan tersebut di akhir jawaban agar pengguna dapat membaca halaman
detail lengkap di website. Format tautan: /penyakit/{{id}}.

Jangan membuat diagnosis atau memberikan kepastian medis kepada pengguna.

CONTEXT:
{context}

{('RIWAYAT PERCAKAPAN:\n' + riwayat + '\n\n') if riwayat else ''}PERTANYAAN:
{question}

JAWABAN:
"""

    response = gemini.models.generate_content(model=GENERATION_MODEL, contents=prompt)

    return response.text