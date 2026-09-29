from google import genai

from app.config import GEMINI_API_KEY, GENERATION_MODEL

_gemini_client = None


def _get_client():
    global _gemini_client
    if _gemini_client is None:
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY belum diatur di env service/")
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    return _gemini_client


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

    history_part = f"RIWAYAT PERCAKAPAN:\n{riwayat}\n\n" if riwayat else ""

    # Detect if query is about symptoms/body parts (requesting differential diagnosis)
    is_symptom_query = any(kw in question.lower() for kw in [
        "sakit", "gejala", "rasa", "nyeri", "demam", "batuk", 
        "sesak", "mual", "muntah", "pusing", "lemas", "kenapa",
        "mengapa", "apa penyebab", "kemungkinan", "kira-kira", "kenapa ya"
    ])

    if is_symptom_query:
        prompt = f"""
Kamu adalah asisten informasi kesehatan pada website Sistem Informasi Penyakit Tubuh.

Pengguna menanyakan kemungkinan penyakit berdasarkan gejala dan/atau lokasi nyeri.
Berikan **daftar diferensial diagnosis** (kemungkinan penyakit) berdasarkan CONTEXT.

FORMAT JAWABAN:
1. **Nama Penyakit** — Kemungkinan: Tinggi/Sedang/Rendah
   Gejala khas: [sebutkan 2-3 gejala utama dari CONTEXT]
   Link: /penyakit/{{id}}

2. **Nama Penyakit** — Kemungkinan: Tinggi/Sedang/Rendah
   Gejala khas: ...
   Link: /penyakit/{{id}}

...

⚠️ **PENTING**: 
- Ini hanyalah informasi edukasi, BUKAN diagnosis medis.
- Hanya tenaga kesehatan yang dapat melakukan diagnosis.
- Segera konsultasikan ke dokter untuk penanganan yang tepat.

CONTEXT:
{context}

{history_part}PERTANYAAN:
{question}

JAWABAN (format diferensial diagnosis):
"""
    else:
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

{history_part}PERTANYAAN:
{question}

JAWABAN:
"""

    response = _get_client().models.generate_content(model=GENERATION_MODEL, contents=prompt)

    return response.text